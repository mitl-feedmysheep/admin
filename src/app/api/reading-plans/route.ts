import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";
import { randomUUID } from "crypto";

export const GET = withLogging(async () => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;
  try {
    const session = guard.session;

    const plans = await prisma.reading_plan.findMany({
      where: { church_id: session.churchId, deleted_at: null },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: plans.map((p: { id: string; title: string; reading_days: number; created_at: Date }) => ({
        id: p.id,
        title: p.title,
        readingDays: p.reading_days,
        createdAt: p.created_at,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
});

export const POST = withLogging(async (request: NextRequest) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { title, readingDays } = body;
    if (!title) {
      return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
    }
    const mask = typeof readingDays === "number" && readingDays >= 1 && readingDays <= 127
      ? readingDays
      : 63;

    const plan = await prisma.reading_plan.create({
      data: {
        id: randomUUID(),
        church_id: guard.session.churchId,
        title,
        reading_days: mask,
      },
    });

    return NextResponse.json({ success: true, data: { id: plan.id } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "생성 실패" }, { status: 500 });
  }
});
