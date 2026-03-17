import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasDepartmentPermissionOver } from "@/lib/roles";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";

export const POST = withLogging(async (request: NextRequest) => {
  try {
    const session = await getSession();
    const isSystemAdmin = session?.memberId === process.env.SYSTEM_ADMIN_MEMBER_ID;
    const isDeptLeaderOrAbove = session?.departmentRole
      ? hasDepartmentPermissionOver(session.departmentRole, "LEADER")
      : false;
    if (!session || (!isSystemAdmin && !isDeptLeaderOrAbove)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { targetMemberId, newPassword } = body;

    if (!targetMemberId || !newPassword) {
      return NextResponse.json(
        { error: "멤버와 새 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const member = await prisma.member.findFirst({
      where: { id: targetMemberId, deleted_at: null },
    });

    if (!member) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // bcrypt hash (Spring Security BCryptPasswordEncoder 호환, salt rounds 10)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: targetMemberId },
        data: { password: hashedPassword },
      });

      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "UPDATE",
          entity_type: "MEMBER",
          entity_id: targetMemberId,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "비밀번호 초기화 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
});
