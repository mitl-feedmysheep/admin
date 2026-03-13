import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createToken, setSessionCookie, getSession } from "@/lib/auth";
import { withLogging } from "@/lib/api-logger";

export const POST = withLogging(async (request: NextRequest) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { departmentId } = body as { departmentId?: string };

    if (!departmentId) {
      return NextResponse.json(
        { error: "부서 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 1. 부서 확인
    const department = await prisma.department.findFirst({
      where: {
        id: departmentId,
        church_id: session.churchId,
        deleted_at: null,
      },
    });

    if (!department) {
      return NextResponse.json(
        { error: "해당 부서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 2. 권한 확인
    let departmentRole: string | undefined;
    if (session.role === "SUPER_ADMIN") {
      departmentRole = "ADMIN"; // SUPER_ADMIN은 모든 부서에서 ADMIN 수준
    } else {
      const dm = await prisma.department_member.findFirst({
        where: {
          member_id: session.memberId,
          department_id: departmentId,
          deleted_at: null,
        },
      });

      if (!dm || !["LEADER", "ADMIN"].includes(dm.role)) {
        return NextResponse.json(
          { error: "해당 부서의 관리 권한이 없습니다." },
          { status: 403 }
        );
      }
      departmentRole = dm.role;
    }

    // 3. JWT 토큰 갱신
    const token = await createToken({
      memberId: session.memberId,
      memberName: session.memberName,
      churchId: session.churchId,
      churchName: session.churchName,
      role: session.role,
      departmentId: department.id,
      departmentName: department.name,
      departmentRole,
    });

    await setSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Select department error:", error);
    return NextResponse.json(
      { error: "부서 선택 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
});
