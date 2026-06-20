import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";

/**
 * GET /api/push-broadcasts
 * 부서 전체 푸시 발송 이력 조회 (최신순)
 */
export const GET = withLogging(async (_request: NextRequest) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;
  try {
    const session = guard.session;
    if (!session.departmentId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const broadcasts = await prisma.announcement.findMany({
      where: {
        entity_type: "DEPARTMENT",
        entity_id: session.departmentId,
        type: "BROADCAST",
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: broadcasts.map((b) => ({
        id: b.id,
        title: b.title,
        body: b.body,
        sendAt: b.send_at.toISOString(),
        isSent: b.is_sent,
        createdAt: b.created_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Push broadcasts list error:", error);
    return NextResponse.json({ error: "전체 푸시 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
});

/**
 * POST /api/push-broadcasts
 * 부서 전체 푸시 발송 예약
 * Body: { title, body, sendAt }
 */
export const POST = withLogging(async (request: NextRequest) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;
  try {
    const session = guard.session;
    if (!session.departmentId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { id: providedId, title, body: pushBody, sendAt } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
    }
    if (!pushBody?.trim()) {
      return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }
    if (!sendAt) {
      return NextResponse.json({ error: "발송 예약 시각을 설정해주세요." }, { status: 400 });
    }

    const broadcastId = providedId ?? randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.announcement.create({
        data: {
          id: broadcastId,
          entity_type: "DEPARTMENT",
          entity_id: session.departmentId!,
          type: "BROADCAST",
          title: title.trim(),
          body: pushBody.trim(),
          send_at: new Date(sendAt),
          push_enabled: true,
          is_sent: false,
        },
      });

      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "CREATE",
          entity_type: "PUSH_BROADCAST",
          entity_id: broadcastId,
        },
      });
    });

    return NextResponse.json({ success: true, data: { broadcastId } }, { status: 201 });
  } catch (error) {
    console.error("Push broadcast create error:", error);
    return NextResponse.json({ error: "전체 푸시 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
});
