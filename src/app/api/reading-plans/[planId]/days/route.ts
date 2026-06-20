import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";

export const GET = withLogging(async (
  _request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const { planId } = await params;
    const plan = await prisma.reading_plan.findFirst({
      where: { id: planId, church_id: guard.session.churchId, deleted_at: null },
    });
    if (!plan) return NextResponse.json({ error: "플랜을 찾을 수 없습니다." }, { status: 404 });

    const days = await prisma.reading_plan_day.findMany({
      where: { reading_plan_id: planId, deleted_at: null },
      orderBy: { day_number: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: days.map((d) => ({
        id: d.id,
        dayNumber: d.day_number,
        readingRange: d.reading_range,
        audioUrl: d.audio_url,
        videoUrl: d.video_url,
        description: d.description,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
});
