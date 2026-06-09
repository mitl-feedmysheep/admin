import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";

/**
 * DELETE /api/announcements/:id
 * 공지사항 삭제 (soft delete)
 */
export const DELETE = withLogging(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await getSession();
    if (!session || !session.departmentId) {
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
