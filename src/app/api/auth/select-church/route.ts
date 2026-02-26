import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createToken, setSessionCookie, verifyToken } from "@/lib/auth";
import { rolesAtOrAbove } from "@/lib/roles";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId: rawMemberId, churchId } = body as {
      memberId?: string;
      churchId?: string;
    };

    if (!churchId) {
      return NextResponse.json(
        { error: "교회 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // memberId가 없으면(이미 로그인된 상태) 세션 토큰에서 추출
    let memberId = rawMemberId;
    if (!memberId) {
      const token = request.cookies.get("admin_token")?.value;
      const session = token ? await verifyToken(token) : null;
      memberId = session?.memberId;
    }

    if (!memberId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 1. 멤버 조회
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json(
        { error: "존재하지 않는 계정입니다." },
        { status: 401 }
      );
    }

    // 2. 해당 교회의 ADMIN 권한 확인
    const churchMember = await prisma.church_member.findFirst({
      where: {
        member_id: memberId,
        church_id: churchId,
        role: { in: rolesAtOrAbove("ADMIN") },
        deleted_at: null,
      },
      include: {
        church: true,
      },
    });

    if (!churchMember) {
      return NextResponse.json(
        { error: "해당 교회의 관리자 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 3. JWT 토큰 발급 (교회 ID 포함)
    const token = await createToken({
      memberId: member.id,
      memberName: member.name,
      churchId: churchMember.church.id,
      churchName: churchMember.church.name,
      role: churchMember.role,
    });

    await setSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Select church error:", error);
    return NextResponse.json(
      { error: "교회 선택 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
