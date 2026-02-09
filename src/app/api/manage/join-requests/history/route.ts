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

    // completed_by 멤버 이름 일괄 조회
    const completedByIds = requests
      .map((r) => r.completed_by)
      .filter((id): id is string => id !== null);

    const completedByMembers = completedByIds.length > 0
      ? await prisma.member.findMany({
          where: { id: { in: completedByIds } },
          select: { id: true, name: true },
        })
      : [];

    const completedByMap: Record<string, string> = {};
    completedByMembers.forEach((m) => {
      completedByMap[m.id] = m.name;
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
      completedBy: req.completed_by ? completedByMap[req.completed_by] || "알 수 없음" : "",
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
