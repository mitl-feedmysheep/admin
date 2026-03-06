import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";

/**
 * GET /api/system/monitoring
 * 모니터링 대시보드 전체 데이터 조회
 * Query: range (1h | 6h | 24h | 7d | 30d, default: 24h)
 */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

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
    const latestMetrics = await prisma.$queryRaw`
      SELECT m.* FROM metrics m
      INNER JOIN (
        SELECT container_name, MAX(collected_at) as max_at
        FROM metrics
        GROUP BY container_name
      ) latest ON m.container_name = latest.container_name AND m.collected_at = latest.max_at
    ` as Array<Record<string, unknown>>;

    // 2. 시간별 메트릭 추이
    const metricsHistory = await prisma.metrics.findMany({
      where: { collected_at: { gte: since } },
      orderBy: { collected_at: "asc" },
    });

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
      ` as Promise<Array<{ date: string; count: number }>>,
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

      try {
        const [webAppStats, adminStats, webAppActive, adminActive] =
          await Promise.all([
            umamiWebAppId
              ? fetch(
                  `${umamiUrl}/api/websites/${umamiWebAppId}/stats?startAt=${startAt}&endAt=${endAt}`,
                  { headers },
                ).then((r) => r.json())
              : null,
            umamiAdminId
              ? fetch(
                  `${umamiUrl}/api/websites/${umamiAdminId}/stats?startAt=${startAt}&endAt=${endAt}`,
                  { headers },
                ).then((r) => r.json())
              : null,
            umamiWebAppId
              ? fetch(
                  `${umamiUrl}/api/websites/${umamiWebAppId}/active`,
                  { headers },
                ).then((r) => r.json())
              : null,
            umamiAdminId
              ? fetch(
                  `${umamiUrl}/api/websites/${umamiAdminId}/active`,
                  { headers },
                ).then((r) => r.json())
              : null,
          ]);

        umamiData = {
          webApp: { stats: webAppStats, active: webAppActive },
          admin: { stats: adminStats, active: adminActive },
        };
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
