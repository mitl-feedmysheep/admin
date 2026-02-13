import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/dashboard/stats
 * 대시보드 상단 통계 카드 데이터
 * Query: year (연도)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const churchId = session.churchId;

    // 1. 전체 멤버 수 (해당 교회의 활성 멤버)
    const totalMembers = await prisma.church_member.count({
      where: {
        church_id: churchId,
        deleted_at: null,
      },
    });

    // 2. 해당 연도에 "활동 중인" 소그룹 집계
    // 조건: 연말 이전에 시작 AND (연초 이후에 끝나거나 아직 안 끝남)
    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year}-12-31`);

    // 그룹 + 해당 연도 gatherings를 한번에 조회
    const groups = await prisma.group.findMany({
      where: {
        church_id: churchId,
        deleted_at: null,
        start_date: { lte: yearEnd }, // 연말 이전에 시작
        OR: [
          { end_date: null }, // 아직 안 끝남
          { end_date: { gte: yearStart } }, // 연초 이후에 끝남
        ],
      },
      include: {
        gatherings: {
          where: {
            date: { gte: yearStart, lte: yearEnd }, // 해당 연도의 모임만
            deleted_at: null,
          },
          include: {
            gathering_members: {
              where: { deleted_at: null },
              select: {
                worship_attendance: true,
                gathering_attendance: true,
              },
            },
          },
        },
      },
    });

    const activeGroups = groups.length;

    // 모든 gathering_member 추출
    const gatheringMembers: { worship_attendance: boolean | null; gathering_attendance: boolean | null }[] = [];
    groups.forEach((group) => {
      group.gatherings.forEach((gathering) => {
        gatheringMembers.push(...gathering.gathering_members);
      });
    });

    // 출석률 계산
    const totalRecords = gatheringMembers.length;
    let worshipAttended = 0;
    let gatheringAttended = 0;

    gatheringMembers.forEach((gm) => {
      if (gm.worship_attendance === true) worshipAttended++;
      if (gm.gathering_attendance === true) gatheringAttended++;
    });

    const worshipRate = totalRecords > 0 
      ? Math.round((worshipAttended / totalRecords) * 100) 
      : 0;
    const gatheringRate = totalRecords > 0 
      ? Math.round((gatheringAttended / totalRecords) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalMembers,
        activeGroups,
        worshipRate: `${worshipRate}%`,
        gatheringRate: `${gatheringRate}%`,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "통계 데이터 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
