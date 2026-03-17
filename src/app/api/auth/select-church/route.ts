import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createToken, setSessionCookie, verifyToken } from "@/lib/auth";
import { rolesAtOrAbove, canAccessAdminPortal } from "@/lib/roles";
import { withLogging } from "@/lib/api-logger";

export const POST = withLogging(async (request: NextRequest) => {
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

    // 2. 해당 교회의 church_member 확인
    const churchMember = await prisma.church_member.findFirst({
      where: {
        member_id: memberId,
        church_id: churchId,
        deleted_at: null,
      },
      include: {
        church: true,
      },
    });

    if (!churchMember) {
      return NextResponse.json(
        { error: "해당 교회의 멤버가 아닙니다." },
        { status: 403 }
      );
    }

    const churchRole = churchMember.role;

    // 3. 접근 가능한 부서 목록 조회
    let departments;
    if (churchRole === "SUPER_ADMIN") {
      // SUPER_ADMIN은 모든 부서
      departments = await prisma.department.findMany({
        where: { church_id: churchId, deleted_at: null },
        orderBy: { name: "asc" },
      });
    } else {
      // 그 외는 department_member.role >= LEADER 인 부서만
      const deptMembers = await prisma.department_member.findMany({
        where: {
          member_id: memberId,
          deleted_at: null,
          role: { in: ["LEADER", "ADMIN"] },
          department: { church_id: churchId, deleted_at: null },
        },
        include: { department: true },
      });
      departments = deptMembers.map((dm) => dm.department);
    }

    // church ADMIN+도 아니고 부서 LEADER+도 아니면 접근 불가
    const hasChurchAdmin = rolesAtOrAbove("ADMIN").includes(churchRole);
    if (!hasChurchAdmin && departments.length === 0) {
      return NextResponse.json(
        { error: "해당 교회의 관리자 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 4. 첫 번째 부서를 기본 선택 (부서가 있으면)
    const firstDept = departments[0] ?? null;

    // 부서에서의 역할 확인
    let departmentRole: string | undefined;
    if (firstDept) {
      if (churchRole === "SUPER_ADMIN") {
        departmentRole = "ADMIN"; // SUPER_ADMIN은 모든 부서에서 ADMIN 수준
      } else {
        const dm = await prisma.department_member.findFirst({
          where: {
            member_id: memberId,
            department_id: firstDept.id,
            deleted_at: null,
          },
        });
        departmentRole = dm?.role;
      }
    }

    // 5. JWT 토큰 발급 (교회 + 부서 정보 포함)
    const token = await createToken({
      memberId: member.id,
      memberName: member.name,
      churchId: churchMember.church.id,
      churchName: churchMember.church.name,
      role: churchRole,
      departmentId: firstDept?.id,
      departmentName: firstDept?.name,
      departmentRole,
    });

    await setSessionCookie(token);

    // 부서 목록도 함께 반환 (부서 선택 UI용)
    return NextResponse.json({
      success: true,
      departments: departments.map((d) => ({
        id: d.id,
        name: d.name,
      })),
      selectedDepartmentId: firstDept?.id,
    });
  } catch (error) {
    console.error("Select church error:", error);
    return NextResponse.json(
      { error: "교회 선택 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
});
