import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/dashboard/birthdays?offset=0
 * 주 단위 생일 멤버 목록 (월~일 기준)
 * offset: 0=이번 주, -1=지난 주, 1=다음 주, ...
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

    // 이번 주 월요일 계산
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=일, 1=월, ..., 6=토
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + offset * 7);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const monMonth = monday.getMonth() + 1;
    const monDay = monday.getDate();
    const sunMonth = sunday.getMonth() + 1;
    const sunDay = sunday.getDate();

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

    // 생일이 해당 주(월~일) 범위에 해당하는 멤버 필터
    const birthdayMembers = churchMembers
      .filter((cm) => {
        if (!cm.member.birthday) return false;
        const bday = new Date(cm.member.birthday);
        const bMonth = bday.getMonth() + 1;
        const bDay = bday.getDate();

        if (monMonth === sunMonth) {
          return bMonth === monMonth && bDay >= monDay && bDay <= sunDay;
        } else {
          return (
            (bMonth === monMonth && bDay >= monDay) ||
            (bMonth === sunMonth && bDay <= sunDay)
          );
        }
      })
      .map((cm) => {
        const bday = new Date(cm.member.birthday!);
        const bMonth = bday.getMonth() + 1;
        const bDay = bday.getDate();

        // 해당 주 내 실제 생일 날짜 계산 (요일 표시용)
        const birthdayThisWeek = new Date(monday);
        for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
          if (d.getMonth() + 1 === bMonth && d.getDate() === bDay) {
            birthdayThisWeek.setTime(d.getTime());
            break;
          }
        }

        const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
        const dayName = dayNames[birthdayThisWeek.getDay()];

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
        weekRange: {
          start: `${monMonth}.${monDay}`,
          end: `${sunMonth}.${sunDay}`,
        },
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
