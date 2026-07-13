import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";

/**
 * GET /api/announcements
 * 부서 공지사항 목록 조회 (최신순)
 */
export const GET = withLogging(async (request: NextRequest) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;
  try {
    const session = guard.session;
    if (!session.departmentId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const announcements = await prisma.announcement.findMany({
      where: {
        entity_type: "DEPARTMENT",
        entity_id: session.departmentId,
        type: "ANNOUNCEMENT",
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        sendAt: a.send_at.toISOString(),
        isSent: a.is_sent,
        pushEnabled: a.push_enabled,
        createdAt: a.created_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Announcements list error:", error);
    return NextResponse.json({ error: "공지사항 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
});

/**
 * POST /api/announcements
 * 공지사항 생성 (+ 선택적으로 캘린더 이벤트 동시 생성)
 * Body: { title, body, sendAt, createEvent?, startDate?, endDate?, startTime?, endTime?, location? }
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
    const {
      id: providedId, title, body: announcementBody, sendAt, createEvent,
      startDate, endDate, startTime, endTime, location, pushEnabled = true,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
    }
    if (!announcementBody?.trim()) {
      return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }
    if (!sendAt) {
      return NextResponse.json({ error: "발송 예약 시각을 설정해주세요." }, { status: 400 });
    }
    if (createEvent && (!startDate || !endDate)) {
      return NextResponse.json({ error: "캘린더 이벤트의 날짜를 입력해주세요." }, { status: 400 });
    }

    const announcementId = providedId ?? randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.announcement.create({
        data: {
          id: announcementId,
          entity_type: "DEPARTMENT",
          entity_id: session.departmentId!,
          type: "ANNOUNCEMENT",
          title: title.trim(),
          body: announcementBody.trim(),
          send_at: new Date(sendAt),
          push_enabled: pushEnabled,
          is_sent: !pushEnabled,
        },
      });

      if (createEvent) {
        const COLOR_ORDER = ["PEACOCK", "TOMATO", "SAGE", "TANGERINE", "LAVENDER", "FLAMINGO", "BANANA", "GRAPHITE"];
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);

        const overlapping = await tx.event.findMany({
          where: {
            entity_id: session.departmentId,
            entity_type: "DEPARTMENT",
            deleted_at: null,
            start_date: { lte: newEnd },
            end_date: { gte: newStart },
          },
          select: { color: true },
        });
        const usedColors = new Set(overlapping.map((e) => e.color).filter(Boolean));
        const assignedColor = COLOR_ORDER.find((c) => !usedColors.has(c)) || COLOR_ORDER[0];

        await tx.event.create({
          data: {
            id: randomUUID(),
            entity_type: "DEPARTMENT",
            entity_id: session.departmentId!,
            title: title.trim(),
            description: announcementBody.trim(),
            start_date: newStart,
            end_date: newEnd,
            start_time: startTime ? parseTime(startTime) : null,
            end_time: endTime ? parseTime(endTime) : null,
            location: location?.trim() || null,
            color: assignedColor,
          },
        });
      }

      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "CREATE",
          entity_type: "ANNOUNCEMENT",
          entity_id: announcementId,
        },
      });
    });

    return NextResponse.json({ success: true, data: { announcementId } }, { status: 201 });
  } catch (error) {
    console.error("Announcement create error:", error);
    return NextResponse.json({ error: "공지사항 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
});

function parseTime(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}
