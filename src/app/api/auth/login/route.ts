import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { rolesAtOrAbove } from "@/lib/roles";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 1. 멤버 조회
    const member = await prisma.member.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "존재하지 않는 계정입니다." },
        { status: 401 }
      );
    }

    // 2. BCrypt 비밀번호 검증 (Spring Security BCryptPasswordEncoder 호환)
    const isPasswordValid = await bcrypt.compare(password, member.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // 3. ADMIN 권한이 있는 교회 목록 조회
    const adminChurches = await prisma.church_member.findMany({
      where: {
        member_id: member.id,
        role: { in: rolesAtOrAbove("ADMIN") },
        deleted_at: null,
      },
      include: {
        church: true,
      },
    });

    if (adminChurches.length === 0) {
      return NextResponse.json(
        { error: "관리자 권한이 있는 교회가 없습니다." },
        { status: 403 }
      );
    }

    // 4. 교회 목록 반환 (교회 선택 화면으로 이동)
    const churches = adminChurches.map((cm) => ({
      churchId: cm.church.id,
      churchName: cm.church.name,
      role: cm.role,
    }));

    return NextResponse.json({
      success: true,
      memberId: member.id,
      memberName: member.name,
      churches,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
