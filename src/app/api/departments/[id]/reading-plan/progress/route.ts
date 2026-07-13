import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentAdmin } from "@/lib/require-department-admin";
import { kstDayRangeUtc, todayKstDateString } from "@/lib/datetime";

export const GET = withLogging(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const guard = await requireDepartmentAdmin();
  if (!guard.ok) return guard.response;

  try {
    const { id: departmentId } = await params;

    const dept = await prisma.department.findFirst({
      where: { id: departmentId, church_id: guard.session.churchId, deleted_at: null },
    });
    if (!dept) return NextResponse.json({ error: "부서를 찾을 수 없습니다." }, { status: 404 });

    const todayKst = todayKstDateString();
    const today = new Date(todayKst); // date-only 컬럼 비교용 (UTC 자정 = KST 날짜와 동일한 날짜 부분)
    const { start: startOfToday, end: endOfToday } = kstDayRangeUtc(todayKst);
    const mapping = await prisma.department_reading_plan.findFirst({
      where: {
        department_id: departmentId,
        deleted_at: null,
        start_date: { lte: today },
        end_date: { gte: today },
      },
      include: { reading_plan: true },
    });
    if (!mapping) return NextResponse.json({ success: true, meta: null, data: [] });

    const totalDays = await prisma.reading_plan_day.count({
      where: { reading_plan_id: mapping.reading_plan_id, deleted_at: null },
    });

    const activeMembers = await prisma.department_member.findMany({
      where: { department_id: departmentId, status: "ACTIVE", deleted_at: null },
      include: { member: true },
    });

    const todayCompletions = await prisma.reading_completion_history.findMany({
      where: {
        department_reading_plan_id: mapping.id,
        completed_at: { gte: startOfToday, lte: endOfToday },
      },
      select: { member_id: true },
      distinct: ["member_id"],
    });

    const progressData = await Promise.all(
      activeMembers.map(async (dm: { member_id: string; member: { name: string } }) => {
        const completedCount = await prisma.reading_completion_history.count({
          where: {
            department_reading_plan_id: mapping.id,
            member_id: dm.member_id,
          },
        });
        const percent = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;
        return {
          memberId: dm.member_id,
          memberName: dm.member.name,
          completedCount,
          totalDays,
          progressPercent: percent,
        };
      })
    );

    progressData.sort((a: { progressPercent: number }, b: { progressPercent: number }) => b.progressPercent - a.progressPercent);

    return NextResponse.json({
      success: true,
      meta: {
        todayCount: todayCompletions.length,
        totalMembers: activeMembers.length,
        totalDays,
        planTitle: mapping.reading_plan.title,
        startDate: mapping.start_date.toISOString().slice(0, 10),
        endDate: mapping.end_date.toISOString().slice(0, 10),
      },
      data: progressData,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
});
