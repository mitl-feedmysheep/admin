import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

/**
 * POST /api/manage/join-requests/reject
 * 교회 편입 요청 거절
 * Body: { requestId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: "요청 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // PENDING 상태인 편입 요청 조회
    const joinRequest = await prisma.church_member_request.findFirst({
      where: {
        id: requestId,
        church_id: session.churchId,
        status: "PENDING",
        deleted_at: null,
      },
    });

    if (!joinRequest) {
      return NextResponse.json(
        { error: "해당 편입 요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 트랜잭션: status → DECLINED + activity_log
    await prisma.$transaction(async (tx) => {
      await tx.church_member_request.update({
        where: { id: requestId },
        data: { status: "DECLINED" },
      });

      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "DECLINE",
          entity_type: "CHURCH_MEMBER_REQUEST",
          entity_id: requestId,
        },
      });
    });

    console.log(`Join request rejected: ${requestId} by ${session.memberName}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Join request reject error:", error);
    return NextResponse.json(
      { error: "편입 요청 거절 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
