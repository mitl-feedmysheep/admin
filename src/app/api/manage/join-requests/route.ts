import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/manage/join-requests
 * 교회 편입 요청 목록 조회 (PENDING 건만)
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
        status: "PENDING",
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
        created_at: "desc",
      },
    });

    const data = requests.map((req) => ({
      id: req.id,
      memberId: req.member_id,
      name: req.member.name,
      email: req.member.email,
      sex: req.member.sex === "M" ? "MALE" : "FEMALE",
      birthday: req.member.birthday?.toISOString().split("T")[0] || "",
      phone: req.member.phone || "",
      requestedAt: req.created_at.toISOString().split("T")[0],
    }));

    return NextResponse.json({
      success: true,
      data: {
        requests: data,
        total: data.length,
      },
    });
  } catch (error) {
    console.error("Join requests fetch error:", error);
    return NextResponse.json(
      { error: "편입 요청 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
