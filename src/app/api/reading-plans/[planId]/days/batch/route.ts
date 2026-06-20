import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";
import { randomUUID } from "crypto";

export const POST = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const { planId } = await params;
    const plan = await prisma.reading_plan.findFirst({
      where: { id: planId, deleted_at: null },
    });
    if (!plan) return NextResponse.json({ error: "플랜을 찾을 수 없습니다." }, { status: 404 });

    const body: Array<{
      dayNumber: number; readingRange: string;
      audioUrl?: string; videoUrl?: string; description?: string;
    }> = await request.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: "빈 데이터" }, { status: 400 });
    }

    await prisma.reading_plan_day.createMany({
      data: body.map((row) => ({
        id: randomUUID(),
        reading_plan_id: planId,
        day_number: Number(row.dayNumber),
        reading_range: row.readingRange,
        audio_url: row.audioUrl ?? null,
        video_url: row.videoUrl ?? null,
        description: row.description ?? null,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ success: true, data: { count: body.length } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "등록 실패" }, { status: 500 });
  }
});
