import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";
import { randomUUID } from "crypto";

export const POST = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const { id: departmentId } = await params;
    const { readingPlanId, startDate, endDate } = await request.json();

    if (!readingPlanId || !startDate || !endDate) {
      return NextResponse.json({ error: "readingPlanId, startDate, endDate는 필수입니다." }, { status: 400 });
    }

    const dept = await prisma.department.findFirst({
      where: { id: departmentId, church_id: guard.session.churchId, deleted_at: null },
    });
    if (!dept) return NextResponse.json({ error: "부서를 찾을 수 없습니다." }, { status: 404 });

    const plan = await prisma.reading_plan.findFirst({
      where: { id: readingPlanId, deleted_at: null },
    });
    if (!plan) return NextResponse.json({ error: "플랜을 찾을 수 없습니다." }, { status: 404 });

    // 기존 활성 매핑 soft delete
    const now = new Date();
    await prisma.department_reading_plan.updateMany({
      where: { department_id: departmentId, deleted_at: null },
      data: { deleted_at: now },
    });

    await prisma.department_reading_plan.create({
      data: {
        id: randomUUID(),
        department_id: departmentId,
        reading_plan_id: readingPlanId,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "활성화 실패" }, { status: 500 });
  }
});

export const DELETE = withLogging(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const { id: departmentId } = await params;

    await prisma.department_reading_plan.updateMany({
      where: { department_id: departmentId, deleted_at: null },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "비활성화 실패" }, { status: 500 });
  }
});
