import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";

/**
 * PATCH /api/announcements/:id
 * 공지사항 수정 (제목, 내용)
 */
export const PATCH = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;
  try {
    const session = guard.session;
    if (!session.departmentId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, body: announcementBody } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
    }
    if (!announcementBody?.trim()) {
      return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }

    const existing = await prisma.announcement.findFirst({
      where: { id, entity_id: session.departmentId, deleted_at: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.announcement.update({
        where: { id },
        data: { title: title.trim(), body: announcementBody.trim() },
      });

      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "UPDATE",
          entity_type: "ANNOUNCEMENT",
          entity_id: id,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Announcement update error:", error);
    return NextResponse.json({ error: "공지사항 수정 중 오류가 발생했습니다." }, { status: 500 });
  }
});

/**
 * DELETE /api/announcements/:id
 * 공지사항 삭제 (soft delete)
 */
export const DELETE = withLogging(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;
  try {
    const session = guard.session;
    if (!session.departmentId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const announcement = await prisma.announcement.findFirst({
      where: { id, entity_id: session.departmentId, deleted_at: null },
    });

    if (!announcement) {
      return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.announcement.update({
        where: { id },
        data: { deleted_at: new Date() },
      });

      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "DELETE",
          entity_type: "ANNOUNCEMENT",
          entity_id: id,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Announcement delete error:", error);
    return NextResponse.json({ error: "공지사항 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
});
