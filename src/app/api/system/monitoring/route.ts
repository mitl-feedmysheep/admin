import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/system/monitoring
 * 모니터링 대시보드 전체 데이터 조회
 * Query: range (1h | 6h | 24h | 7d | 30d, default: 24h)
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.memberId !== process.env.SYSTEM_ADMIN_MEMBER_ID) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "24h";

    const now = new Date();
    const rangeMap: Record<string, number> = {
      "1h": 1 * 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const since = new Date(now.getTime() - (rangeMap[range] || rangeMap["24h"]));

    // 1. 최신 메트릭 (컨테이너별 현재 상태)
    const latestMetricsRaw = await prisma.$queryRaw`
      SELECT m.* FROM metrics m
      INNER JOIN (
        SELECT container_name, MAX(collected_at) as max_at
        FROM metrics
        GROUP BY container_name
      ) latest ON m.container_name = latest.container_name AND m.collected_at = latest.max_at
    ` as Array<Record<string, unknown>>;

    // BigInt → Number 변환 (JSON 직렬화 불가 방지)
    const toSerializable = (rows: Array<Record<string, unknown>>) =>
      rows.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(row)) {
          obj[key] = typeof val === "bigint" ? Number(val) : val;
        }
        return obj;
      });

    const latestMetrics = toSerializable(latestMetricsRaw);

    // 2. 시간별 메트릭 추이
    const metricsHistoryRaw = await prisma.metrics.findMany({
      where: { collected_at: { gte: since } },
      orderBy: { collected_at: "asc" },
    });
    const metricsHistory = toSerializable(
      metricsHistoryRaw.map((r) => ({ ...r }) as Record<string, unknown>),
    );

    // 3. 앱 활동 지표
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [weeklyGatherings, weeklyPrayers, totalPrayers, recentSignups] =
      await Promise.all([
        prisma.gathering.count({
          where: {
            deleted_at: null,
            created_at: { gte: weekStart },
          },
        }),
        prisma.prayer.count({
          where: {
            deleted_at: null,
            created_at: { gte: weekStart },
          },
        }),
        prisma.prayer.count({
          where: { deleted_at: null },
        }),
        prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM member
        WHERE deleted_at IS NULL
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `.then((rows) =>
          (rows as Array<Record<string, unknown>>).map((r) => ({
            date: r.date,
            count: Number(r.count),
          })),
        ) as Promise<Array<{ date: string; count: number }>>,
      ]);

    // 4. Umami 데이터 (별도 fetch)
    let umamiData = null;
    const umamiUrl = process.env.UMAMI_API_URL;
    const umamiToken = process.env.UMAMI_API_TOKEN;
    const umamiWebAppId = process.env.UMAMI_WEBAPP_WEBSITE_ID;
    const umamiAdminId = process.env.UMAMI_ADMIN_WEBSITE_ID;

    if (umamiUrl && umamiToken) {
      const headers = {
        Authorization: `Bearer ${umamiToken}`,
        "Content-Type": "application/json",
      };
      const startAt = since.getTime();
      const endAt = now.getTime();

      const fetchUmami = (path: string) =>
        fetch(`${umamiUrl}${path}`, { headers }).then((r) => r.json());

      const unit = range === "1h" || range === "6h" ? "hour" : "day";

      try {
        const fetchSiteData = async (siteId: string | undefined) => {
          if (!siteId) return null;
          const [stats, active, pageviews, topPages, devices] =
            await Promise.all([
              fetchUmami(
                `/api/websites/${siteId}/stats?startAt=${startAt}&endAt=${endAt}`,
              ),
              fetchUmami(`/api/websites/${siteId}/active`),
              fetchUmami(
                `/api/websites/${siteId}/pageviews?startAt=${startAt}&endAt=${endAt}&unit=${unit}`,
              ),
              fetchUmami(
                `/api/websites/${siteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=url&limit=5`,
              ),
              fetchUmami(
                `/api/websites/${siteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=device`,
              ),
            ]);
          return { stats, active, pageviews, topPages, devices };
        };

        const [webApp, admin] = await Promise.all([
          fetchSiteData(umamiWebAppId),
          fetchSiteData(umamiAdminId),
        ]);

        umamiData = { webApp, admin };
      } catch (e) {
        console.error("Umami API error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        containers: latestMetrics,
        history: metricsHistory,
        activity: {
          weeklyGatherings,
          weeklyPrayers,
          totalPrayers,
          recentSignups,
        },
        umami: umamiData,
      },
    });
  } catch (error) {
    console.error("Monitoring API error:", error);
    return NextResponse.json(
      { error: "모니터링 데이터 조회 실패" },
      { status: 500 },
    );
  }
}
