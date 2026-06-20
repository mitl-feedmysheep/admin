import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";

export const PATCH = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; dayId: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const { planId, dayId } = await params;
    const plan = await prisma.reading_plan.findFirst({
      where: { id: planId, church_id: guard.session.churchId, deleted_at: null },
    });
    if (!plan) return NextResponse.json({ error: "플랜을 찾을 수 없습니다." }, { status: 404 });

    const body = await request.json();
    const { readingRange, description, audioUrl, videoUrl } = body;

    if (!readingRange?.trim()) {
      return NextResponse.json({ error: "분량은 필수입니다." }, { status: 400 });
    }

    const updated = await prisma.reading_plan_day.update({
      where: { id: dayId },
      data: {
        reading_range: readingRange.trim(),
        description: description?.trim() || null,
        audio_url: audioUrl?.trim() || null,
        video_url: videoUrl?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        dayNumber: updated.day_number,
        readingRange: updated.reading_range,
        audioUrl: updated.audio_url,
        videoUrl: updated.video_url,
        description: updated.description,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
});
