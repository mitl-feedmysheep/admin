import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/dashboard/birthdays?offset=0
 * 월 단위 생일 멤버 목록
 * offset: 0=이번 달, -1=지난 달, 1=다음 달, ...
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const churchId = session.churchId;

    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0");

    // 대상 월 계산
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const targetMonth = targetDate.getMonth() + 1; // 1~12
    const targetYear = targetDate.getFullYear();

    // 해당 교회의 활성 멤버 조회
    const churchMembers = await prisma.church_member.findMany({
      where: {
        church_id: churchId,
        deleted_at: null,
        member: {
          deleted_at: null,
        },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            birthday: true,
            sex: true,
          },
        },
      },
    });

    // 생일이 해당 월에 해당하는 멤버 필터
    const birthdayMembers = churchMembers
      .filter((cm) => {
        if (!cm.member.birthday) return false;
        const bday = new Date(cm.member.birthday);
        const bMonth = bday.getMonth() + 1;
        return bMonth === targetMonth;
      })
      .map((cm) => {
        const bday = new Date(cm.member.birthday!);
        const bMonth = bday.getMonth() + 1;
        const bDay = bday.getDate();

        // 해당 월 내 실제 생일 날짜의 요일 계산
        const birthdayThisMonth = new Date(targetYear, targetMonth - 1, bDay);
        const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
        const dayName = dayNames[birthdayThisMonth.getDay()];

        const birthYear = bday.getFullYear() % 100;

        return {
          id: cm.member.id,
          name: cm.member.name,
          sex: cm.member.sex || "",
          birthYear: String(birthYear).padStart(2, "0"),
          month: bMonth,
          day: bDay,
          dayName,
          isToday:
            today.getMonth() + 1 === bMonth && today.getDate() === bDay,
        };
      })
      .sort((a, b) => {
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
      });

    return NextResponse.json({
      success: true,
      data: {
        offset,
        targetYear,
        targetMonth,
        members: birthdayMembers,
      },
    });
  } catch (error) {
    console.error("Birthdays error:", error);
    return NextResponse.json(
      { error: "생일 데이터 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
