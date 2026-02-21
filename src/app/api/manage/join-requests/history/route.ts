import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/manage/join-requests/history
 * 교회 편입 요청 히스토리 조회 (ACCEPTED / DECLINED)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const churchId = session.churchId;

    const requests = await prisma.church_member_request.findMany({
      where: {
        church_id: churchId,
        status: { in: ["ACCEPTED", "DECLINED"] },
        deleted_at: null,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            sex: true,
            birthday: true,
            phone: true,
          },
        },
      },
      orderBy: {
        updated_at: "desc",
      },
      take: 50,
    });

    const requestIds = requests.map((r) => r.id);

    const activityLogs = requestIds.length > 0
      ? await prisma.activity_log.findMany({
          where: {
            entity_type: "CHURCH_MEMBER_REQUEST",
            entity_id: { in: requestIds },
            action_type: { in: ["APPROVE", "DECLINE"] },
          },
          orderBy: { created_at: "desc" },
        })
      : [];

    const actorIds = [...new Set(activityLogs.map((log) => log.actor_id))];
    const actors = actorIds.length > 0
      ? await prisma.member.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true },
        })
      : [];

    const actorMap: Record<string, string> = {};
    actors.forEach((m) => { actorMap[m.id] = m.name; });

    const completedByMap: Record<string, string> = {};
    activityLogs.forEach((log) => {
      if (!completedByMap[log.entity_id]) {
        completedByMap[log.entity_id] = actorMap[log.actor_id] || "알 수 없음";
      }
    });

    const data = requests.map((req) => ({
      id: req.id,
      memberId: req.member_id,
      name: req.member.name,
      email: req.member.email,
      sex: req.member.sex === "M" ? "MALE" : "FEMALE",
      birthday: req.member.birthday?.toISOString().split("T")[0] || "",
      phone: req.member.phone || "",
      status: req.status,
      completedBy: completedByMap[req.id] || "",
      requestedAt: req.created_at.toISOString().split("T")[0],
      completedAt: req.updated_at.toISOString().split("T")[0],
    }));

    return NextResponse.json({
      success: true,
      data: {
        requests: data,
        total: data.length,
      },
    });
  } catch (error) {
    console.error("Join requests history error:", error);
    return NextResponse.json(
      { error: "편입 요청 히스토리를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
