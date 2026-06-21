import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";

export const GET = withLogging(async (_request: NextRequest) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;
  try {
    const session = guard.session;
    if (!session.departmentId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const bulletins = await prisma.announcement.findMany({
      where: {
        entity_type: "DEPARTMENT",
        entity_id: session.departmentId,
        type: "BULLETIN",
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: bulletins.map((b) => ({
        id: b.id,
        title: b.title,
        body: b.body,
        sendAt: b.send_at.toISOString(),
        isSent: b.is_sent,
        pushEnabled: b.push_enabled,
        createdAt: b.created_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Bulletins list error:", error);
    return NextResponse.json({ error: "주보 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
});

export const POST = withLogging(async (request: NextRequest) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;
  try {
    const session = guard.session;
    if (!session.departmentId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const reqBody = await request.json();
    const { id: providedId, year, month, weekNum, body: bulletinBody = null, pushEnabled = false, sendAt } = reqBody;

    if (!year || !month || !weekNum) {
      return NextResponse.json({ error: "년도, 월, 주차를 선택해주세요." }, { status: 400 });
    }
    if (pushEnabled && !sendAt) {
      return NextResponse.json({ error: "발송 예약 시각을 설정해주세요." }, { status: 400 });
    }

    const title = `${year}년 ${month}월 ${weekNum}주차 주보`;
    const bulletinId = providedId ?? randomUUID();
    const scheduledAt = pushEnabled ? new Date(sendAt) : new Date();

    await prisma.$transaction(async (tx) => {
      await tx.announcement.create({
        data: {
          id: bulletinId,
          entity_type: "DEPARTMENT",
          entity_id: session.departmentId!,
          type: "BULLETIN",
          title,
          body: bulletinBody ?? title,
          send_at: scheduledAt,
          push_enabled: pushEnabled,
          is_sent: !pushEnabled,
        },
      });

      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "CREATE",
          entity_type: "ANNOUNCEMENT",
          entity_id: bulletinId,
        },
      });
    });

    return NextResponse.json({ success: true, data: { bulletinId } }, { status: 201 });
  } catch (error) {
    console.error("Bulletin create error:", error);
    return NextResponse.json({ error: "주보 등록 중 오류가 발생했습니다." }, { status: 500 });
  }
});
