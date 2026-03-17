import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { withLogging } from "@/lib/api-logger";

/**
 * GET /api/system/admin-messages
 * 시스템 관리자에게 수신된 ADMIN_REQUEST 메시지 조회
 */
export const GET = withLogging(async () => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const systemAdminId = process.env.SYSTEM_ADMIN_MEMBER_ID;
  if (!systemAdminId || session.memberId !== systemAdminId) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const messages = await prisma.message.findMany({
      where: {
        receiver_id: systemAdminId,
        type: "ADMIN_REQUEST",
        deleted_at: null,
      },
      include: {
        member_message_sender_idTomember: {
          select: { name: true },
        },
      },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    const data = messages.map((m) => ({
      id: m.id,
      senderName: m.member_message_sender_idTomember.name,
      message: m.message,
      isRead: m.is_read === 1,
      createdAt: m.created_at.toISOString(),
    }));

    const unreadCount = data.filter((m) => !m.isRead).length;

    return NextResponse.json({ success: true, data: { messages: data, unreadCount } });
  } catch (error) {
    console.error("Failed to fetch admin messages:", error);
    return NextResponse.json(
      { error: "메시지를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
});

/**
 * PATCH /api/system/admin-messages
 * 메시지 읽음 처리
 * Body: { messageId }
 */
export const PATCH = withLogging(async (request) => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const systemAdminId = process.env.SYSTEM_ADMIN_MEMBER_ID;
  if (!systemAdminId || session.memberId !== systemAdminId) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ error: "messageId가 필요합니다." }, { status: 400 });
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { is_read: 1, updated_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark message as read:", error);
    return NextResponse.json(
      { error: "읽음 처리에 실패했습니다." },
      { status: 500 },
    );
  }
});
