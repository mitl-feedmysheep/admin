import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

/**
 * PATCH /api/events/[id]
 * 이벤트 수정
 * Body: { title?, date?, description?, startTime?, endTime?, location? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, date, description, startTime, endTime, location } = body;

    const existing = await prisma.event.findFirst({
      where: { id, entity_id: session.churchId, deleted_at: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "이벤트를 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(date !== undefined && { date: new Date(date) }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(startTime !== undefined && { start_time: startTime ? parseTime(startTime) : null }),
          ...(endTime !== undefined && { end_time: endTime ? parseTime(endTime) : null }),
          ...(location !== undefined && { location: location?.trim() || null }),
        },
      });

      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "UPDATE",
          entity_type: "EVENT",
          entity_id: id,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Event update error:", error);
    return NextResponse.json({ error: "이벤트 수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}

/**
 * DELETE /api/events/[id]
 * 이벤트 소프트 삭제
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.event.findFirst({
      where: { id, entity_id: session.churchId, deleted_at: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "이벤트를 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: { deleted_at: new Date() },
      });

      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "DELETE",
          entity_type: "EVENT",
          entity_id: id,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Event delete error:", error);
    return NextResponse.json({ error: "이벤트 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}

function parseTime(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}
