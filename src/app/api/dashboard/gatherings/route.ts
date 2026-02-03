import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/dashboard/gatherings
 * 주차별 모임 현황 테이블 데이터
 * Query: year, month, week
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
    const week = parseInt(searchParams.get("week") || "1");
    const churchId = session.churchId;

    console.log("=== Dashboard Gatherings API ===");
    console.log("Session churchId:", churchId);
    console.log("Query params:", { year, month, week });

    // 주차별 날짜 범위 계산
    const { startDate, endDate } = getWeekDateRange(year, month, week);
    console.log("Date range:", { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString() 
    });

    // 그룹 + 해당 주차 모임을 한번에 조회
    const groups = await prisma.group.findMany({
      where: {
        church_id: churchId,
        deleted_at: null,
        start_date: { lte: endDate },
        OR: [
          { end_date: null },
          { end_date: { gte: startDate } },
        ],
      },
      include: {
        group_members: {
          where: { deleted_at: null },
          select: { id: true },
        },
        gatherings: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
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
          take: 1, // 주차당 모임은 하나
        },
      },
      orderBy: { name: "asc" },
    });
    console.log("Groups found:", groups.length, groups.map(g => ({ 
      id: g.id, 
      name: g.name, 
      gatheringsCount: g.gatherings.length 
    })));

    // 결과 데이터 생성
    const result = groups.map((group) => {
      const gathering = group.gatherings[0]; // 바로 접근!
      const memberCount = group.group_members.length;

      if (!gathering) {
        // 모임이 생성되지 않은 경우
        return {
          groupId: group.id,
          groupName: group.name,
          created: false,
          place: "",
          worshipAttendance: "-",
          worshipRate: "-",
          gatheringAttendance: "-",
          gatheringRate: "-",
          specialNote: "",
        };
      }

      // 출석 계산
      const members = gathering.gathering_members;
      const worshipAttended = members.filter(m => m.worship_attendance === true).length;
      const gatheringAttended = members.filter(m => m.gathering_attendance === true).length;
      const total = memberCount;

      const worshipRate = total > 0 ? Math.round((worshipAttended / total) * 100) : 0;
      const gatheringRateCalc = total > 0 ? Math.round((gatheringAttended / total) * 100) : 0;

      return {
        gatheringId: gathering.id,
        groupId: group.id,
        groupName: group.name,
        created: true,
        place: gathering.place || "",
        worshipAttendance: `${worshipAttended}/${total}`,
        worshipRate: `${worshipRate}%`,
        gatheringAttendance: `${gatheringAttended}/${total}`,
        gatheringRate: `${gatheringRateCalc}%`,
        specialNote: gathering.description || "",
        leaderComment: gathering.leader_comment || "",
        adminComment: gathering.admin_comment || "",
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        week,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        gatherings: result,
      },
    });
  } catch (error) {
    console.error("Dashboard gatherings error:", error);
    return NextResponse.json(
      { error: "모임 데이터 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 연도, 월, 주차로 날짜 범위 계산
 */
function getWeekDateRange(year: number, month: number, week: number): { startDate: Date; endDate: Date } {
  // 해당 월의 첫 날
  const firstDayOfMonth = new Date(year, month - 1, 1);
  // 첫 주의 시작일 (일요일 기준)
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  
  // 첫 주 시작일
  const firstWeekStart = new Date(year, month - 1, 1);
  
  // 주차별 시작일 계산
  let startDate: Date;
  let endDate: Date;

  if (week === 1) {
    startDate = firstWeekStart;
    // 첫 주의 끝은 첫 번째 토요일
    const daysUntilSaturday = (6 - firstDayOfWeek + 7) % 7;
    endDate = new Date(year, month - 1, 1 + daysUntilSaturday);
  } else {
    // 첫 주 이후
    const daysUntilSaturday = (6 - firstDayOfWeek + 7) % 7;
    const firstWeekEnd = 1 + daysUntilSaturday;
    
    const weekStartDay = firstWeekEnd + 1 + (week - 2) * 7;
    startDate = new Date(year, month - 1, weekStartDay);
    endDate = new Date(year, month - 1, weekStartDay + 6);
    
    // 월 말 처리
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    if (endDate.getDate() > lastDayOfMonth || endDate.getMonth() !== month - 1) {
      endDate = new Date(year, month, 0);
    }
  }

  return { startDate, endDate };
}
