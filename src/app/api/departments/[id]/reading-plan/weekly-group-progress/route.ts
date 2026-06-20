import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentAdmin } from "@/lib/require-department-admin";

// 플랜 시작일 기준으로 특정 날짜가 몇 일차인지 계산 (backend의 computeDayNumber와 동일 로직)
function computeDayNumber(startDate: Date, targetDate: Date, mask: number): number {
  const s = new Date(startDate);
  s.setHours(0, 0, 0, 0);
  const t = new Date(targetDate);
  t.setHours(0, 0, 0, 0);
  if (t < s) return 0;
  const dow = t.getDay();
  const bit = dow === 0 ? 1 << 6 : 1 << (dow - 1);
  if ((mask & bit) === 0) return 0;
  let count = 0;
  const d = new Date(s);
  while (d <= t) {
    const b = d.getDay() === 0 ? 1 << 6 : 1 << (d.getDay() - 1);
    if ((mask & b) !== 0) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export const GET = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const guard = await requireDepartmentAdmin();
  if (!guard.ok) return guard.response;

  try {
    const { id: departmentId } = await params;
    const url = new URL(request.url);
    const weekStartParam = url.searchParams.get("weekStart"); // YYYY-MM-DD (월요일)

    const weekStart = weekStartParam
      ? new Date(weekStartParam + "T00:00:00")
      : (() => {
          const d = new Date();
          const day = d.getDay();
          d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
          d.setHours(0, 0, 0, 0);
          return d;
        })();

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const today = new Date();
    const mapping = await prisma.department_reading_plan.findFirst({
      where: {
        department_id: departmentId,
        deleted_at: null,
        start_date: { lte: today },
        end_date: { gte: today },
      },
      include: { reading_plan: true },
    });

    if (!mapping) {
      return NextResponse.json({
        success: true,
        weekStart: weekStart.toISOString().slice(0, 10),
        weekEnd: weekEnd.toISOString().slice(0, 10),
        scheduledDayCount: 0,
        data: [],
      });
    }

    const planStart = new Date(mapping.start_date);
    planStart.setHours(0, 0, 0, 0);
    const mask: number = mapping.reading_plan.reading_days;

    // 이 주에 해당하는 읽기 day_number 목록 계산 (오늘까지만)
    const scheduledDayNumbers: number[] = [];
    const cur = new Date(Math.max(planStart.getTime(), weekStart.getTime()));
    const limit = new Date(Math.min(weekEnd.getTime(), today.getTime()));
    limit.setHours(23, 59, 59, 999);

    while (cur <= limit) {
      const dayNum = computeDayNumber(planStart, cur, mask);
      if (dayNum > 0) scheduledDayNumbers.push(dayNum);
      cur.setDate(cur.getDate() + 1);
    }

    const scheduledDays = scheduledDayNumbers.length > 0
      ? await prisma.reading_plan_day.findMany({
          where: {
            reading_plan_id: mapping.reading_plan_id,
            day_number: { in: scheduledDayNumbers },
            deleted_at: null,
          },
          select: { id: true },
        })
      : [];

    const scheduledDayIds = scheduledDays.map((d) => d.id);

    const groups = await prisma.group.findMany({
      where: { department_id: departmentId, deleted_at: null },
      include: {
        group_members: {
          where: { status: "ACTIVE", deleted_at: null },
          select: { member_id: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const data = await Promise.all(
      groups.map(async (group) => {
        const memberIds = group.group_members.map((m) => m.member_id);
        const totalMembers = memberIds.length;

        if (totalMembers === 0 || scheduledDayIds.length === 0) {
          return {
            groupId: group.id,
            groupName: group.name,
            totalMembers,
            scheduledDays: scheduledDayIds.length,
            completedCount: 0,
            completionRate: 0,
          };
        }

        const completions = await prisma.reading_completion_history.findMany({
          where: {
            department_reading_plan_id: mapping.id,
            reading_plan_day_id: { in: scheduledDayIds },
            member_id: { in: memberIds },
          },
          select: { member_id: true },
        });

        // 이 주 읽기를 모두 완료한 멤버 수
        const countByMember = new Map<string, number>();
        for (const c of completions) {
          countByMember.set(c.member_id, (countByMember.get(c.member_id) ?? 0) + 1);
        }
        const allCompleted = memberIds.filter(
          (id) => (countByMember.get(id) ?? 0) >= scheduledDayIds.length
        ).length;

        // 완료율 = 실제 완료 / 가능한 최대 완료 수
        const possible = totalMembers * scheduledDayIds.length;
        const rate = possible > 0 ? Math.round((completions.length / possible) * 100) : 0;

        return {
          groupId: group.id,
          groupName: group.name,
          totalMembers,
          scheduledDays: scheduledDayIds.length,
          completedCount: allCompleted,
          completionRate: rate,
        };
      })
    );

    return NextResponse.json({
      success: true,
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      scheduledDayCount: scheduledDayIds.length,
      data,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
});
