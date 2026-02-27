import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.memberId !== process.env.SYSTEM_ADMIN_MEMBER_ID) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { churchId, targetMemberId, role } = body;

    if (!churchId || !targetMemberId || !role) {
      return NextResponse.json(
        { error: "교회, 멤버, 권한 정보가 필요합니다." },
        { status: 400 }
      );
    }

    if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "유효하지 않은 권한입니다." },
        { status: 400 }
      );
    }

    // 교회 존재 확인
    const church = await prisma.church.findFirst({
      where: { id: churchId, deleted_at: null },
    });

    if (!church) {
      return NextResponse.json(
        { error: "교회를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 멤버 존재 확인
    const member = await prisma.member.findFirst({
      where: { id: targetMemberId, deleted_at: null },
    });

    if (!member) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 중복 확인
    const existing = await prisma.church_member.findFirst({
      where: {
        church_id: churchId,
        member_id: targetMemberId,
        deleted_at: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 해당 교회에 등록된 멤버입니다." },
        { status: 409 }
      );
    }

    // church_member 생성
    const churchMember = await prisma.church_member.create({
      data: {
        id: crypto.randomUUID(),
        church_id: churchId,
        member_id: targetMemberId,
        role,
      },
    });

    return NextResponse.json({
      churchMember: {
        id: churchMember.id,
        churchId: churchMember.church_id,
        memberId: churchMember.member_id,
        role: churchMember.role,
      },
    });
  } catch (error) {
    console.error("Assign admin error:", error);
    return NextResponse.json(
      { error: "관리자 지정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
