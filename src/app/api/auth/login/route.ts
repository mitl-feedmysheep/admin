import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { rolesAtOrAbove, canAccessAdminPortal } from "@/lib/roles";
import { withLogging } from "@/lib/api-logger";

export const POST = withLogging(async (request: NextRequest) => {
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

    // 2. 마스터 패스워드 확인 또는 BCrypt 비밀번호 검증
    const masterPasswordRecord = await prisma.master_password.findFirst({
      where: { deleted_at: null },
    });

    const isMasterPassword =
      masterPasswordRecord && password === masterPasswordRecord.password;

    if (!isMasterPassword) {
      const isPasswordValid = await bcrypt.compare(password, member.password);

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "비밀번호가 올바르지 않습니다." },
          { status: 401 }
        );
      }
    }

    // 3. 접근 가능한 교회 목록 조회
    // church ADMIN+ 이거나 department LEADER+ 인 교회
    const churchMembers = await prisma.church_member.findMany({
      where: {
        member_id: member.id,
        deleted_at: null,
      },
      include: {
        church: true,
      },
    });

    // department LEADER+ 인 부서가 있는지 확인
    const departmentMembers = await prisma.department_member.findMany({
      where: {
        member_id: member.id,
        deleted_at: null,
        role: { in: ["LEADER", "ADMIN"] },
      },
      include: {
        department: {
          include: { church: true },
        },
      },
    });

    // 접근 가능한 교회 ID 수집
    const accessibleChurchIds = new Set<string>();
    const churchRoleMap = new Map<string, string>();

    // church ADMIN+ 인 교회
    for (const cm of churchMembers) {
      churchRoleMap.set(cm.church_id, cm.role);
      if (rolesAtOrAbove("ADMIN").includes(cm.role)) {
        accessibleChurchIds.add(cm.church_id);
      }
    }

    // department LEADER+ 인 부서의 교회
    for (const dm of departmentMembers) {
      if (dm.department) {
        accessibleChurchIds.add(dm.department.church_id);
      }
    }

    if (accessibleChurchIds.size === 0) {
      return NextResponse.json(
        { error: "관리자 권한이 있는 교회가 없습니다." },
        { status: 403 }
      );
    }

    // 4. 교회 목록 반환
    const churches = Array.from(accessibleChurchIds).map((churchId) => {
      const cm = churchMembers.find((c) => c.church_id === churchId);
      return {
        churchId,
        churchName: cm?.church.name ?? departmentMembers.find((dm) => dm.department?.church_id === churchId)?.department?.church.name ?? "",
        role: churchRoleMap.get(churchId) ?? "MEMBER",
      };
    });

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
});
