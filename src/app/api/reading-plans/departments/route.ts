import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";

export const GET = withLogging(async () => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;
  try {
    const session = guard.session;

    const isSuperAdmin = session.role === "SUPER_ADMIN";
    const departmentId = session.departmentId;

    const departments = await prisma.department.findMany({
      where: {
        church_id: session.churchId,
        deleted_at: null,
        ...(isSuperAdmin && !departmentId ? {} : { id: departmentId }),
      },
      include: {
        department_reading_plans: {
          where: {
            deleted_at: null,
            start_date: { lte: new Date() },
            end_date: { gte: new Date() },
          },
          include: { reading_plan: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: departments.map((d: { id: string; name: string; department_reading_plans: Array<{ reading_plan: { id: string; title: string } }> }) => ({
        id: d.id,
        name: d.name,
        activePlanTitle: d.department_reading_plans[0]?.reading_plan.title ?? null,
        activePlanId: d.department_reading_plans[0]?.reading_plan.id ?? null,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
});
