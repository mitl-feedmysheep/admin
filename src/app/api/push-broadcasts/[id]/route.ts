import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";

/**
 * DELETE /api/push-broadcasts/:id
 * 전체 푸시 삭제 (발송 전만 가능, soft delete)
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

    const broadcast = await prisma.announcement.findFirst({
      where: {
        id,
        entity_type: "DEPARTMENT",
        type: "BROADCAST",
        entity_id: session.departmentId,
        deleted_at: null,
      },
    });

    if (!broadcast) {
      return NextResponse.json({ error: "전체 푸시를 찾을 수 없습니다." }, { status: 404 });
    }

    if (broadcast.is_sent) {
      return NextResponse.json({ error: "이미 발송된 푸시는 삭제할 수 없습니다." }, { status: 400 });
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
          entity_type: "PUSH_BROADCAST",
          entity_id: id,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push broadcast delete error:", error);
    return NextResponse.json({ error: "전체 푸시 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
});
