import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/dashboard/birthdays
 * 이번 주(월~일) 생일인 교회 멤버 목록
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const churchId = session.churchId;

    // 이번 주 월요일~일요일 계산
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=일, 1=월, ..., 6=토
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // 월-일 범위 (생일은 년도 무관, 월/일 기준)
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

    // 생일이 이번 주(월~일) 범위에 해당하는 멤버 필터
    const birthdayMembers = churchMembers
      .filter((cm) => {
        if (!cm.member.birthday) return false;
        const bday = new Date(cm.member.birthday);
        const bMonth = bday.getMonth() + 1;
        const bDay = bday.getDate();

        if (monMonth === sunMonth) {
          // 같은 달 안에서
          return bMonth === monMonth && bDay >= monDay && bDay <= sunDay;
        } else {
          // 월이 넘어가는 경우 (예: 1/28(월) ~ 2/3(일))
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

        // 이번 주 내 실제 생일 날짜 계산 (요일 표시용)
        const birthdayThisWeek = new Date(monday);
        // 생일의 월/일이 해당하는 날짜 찾기
        for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
          if (d.getMonth() + 1 === bMonth && d.getDate() === bDay) {
            birthdayThisWeek.setTime(d.getTime());
            break;
          }
        }

        const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
        const dayName = dayNames[birthdayThisWeek.getDay()];

        const birthYear = bday.getFullYear() % 100; // 91, 09 등

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
        // 월/일 순 정렬
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
      });

    return NextResponse.json({
      success: true,
      data: {
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
