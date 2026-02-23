import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

/**
 * GET /api/events?year=2026&month=3
 * 교회 이벤트 목록 조회 (연월 필터)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || "");
    const month = parseInt(searchParams.get("month") || "");

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: "year, month 파라미터가 필요합니다." }, { status: 400 });
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    const events = await prisma.event.findMany({
      where: {
        entity_id: session.churchId,
        entity_type: "CHURCH",
        deleted_at: null,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: [{ date: "asc" }, { start_time: "asc" }],
    });

    const data = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date.toISOString().split("T")[0],
      startTime: e.start_time ? formatTime(e.start_time) : null,
      endTime: e.end_time ? formatTime(e.end_time) : null,
      location: e.location,
    }));

    return NextResponse.json({ success: true, data: { events: data } });
  } catch (error) {
    console.error("Events list error:", error);
    return NextResponse.json({ error: "이벤트 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}

/**
 * POST /api/events
 * 새 이벤트 생성
 * Body: { title, date, description?, startTime?, endTime?, location? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { title, date, description, startTime, endTime, location } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "날짜를 선택해주세요." }, { status: 400 });
    }

    const eventId = randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.event.create({
        data: {
          id: eventId,
          entity_id: session.churchId,
          entity_type: "CHURCH",
          title: title.trim(),
          description: description?.trim() || null,
          date: new Date(date),
          start_time: startTime ? parseTime(startTime) : null,
          end_time: endTime ? parseTime(endTime) : null,
          location: location?.trim() || null,
        },
      });

      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "CREATE",
          entity_type: "EVENT",
          entity_id: eventId,
        },
      });
    });

    return NextResponse.json({ success: true, data: { eventId } });
  } catch (error) {
    console.error("Event create error:", error);
    return NextResponse.json({ error: "이벤트 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}

function formatTime(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function parseTime(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}
