import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";

/**
 * POST /api/system/contact-admin
 * 시스템 관리자에게 요청 메시지 전송
 * Body: { title, message, entityType?, entityId? }
 */
export const POST = withLogging(async (request: NextRequest) => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const systemAdminId = process.env.SYSTEM_ADMIN_MEMBER_ID;
  if (!systemAdminId) {
    return NextResponse.json(
      { error: "시스템 관리자가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { title, message } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "메시지를 입력해주세요." },
        { status: 400 },
      );
    }

    const { entityType, entityName } = body;

    const content = [
      `[관리자 요청] ${title || "요청"}`,
      `교회: ${session.churchName || session.churchId}`,
      entityType && entityName ? `${entityType}: ${entityName}` : null,
      `요청자: ${session.memberName || session.memberId}`,
      `요청: ${message.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");

    const now = new Date();

    await prisma.message.create({
      data: {
        id: randomUUID(),
        type: "ADMIN_REQUEST",
        sender_id: session.memberId,
        receiver_id: systemAdminId,
        message: content,
        is_read: 0,
        created_at: now,
        updated_at: now,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact admin error:", error);
    return NextResponse.json(
      { error: "요청 전송에 실패했습니다." },
      { status: 500 },
    );
  }
});
