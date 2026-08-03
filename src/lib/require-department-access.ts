import { NextResponse } from "next/server";
import { getSession, JWTPayload } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { department } from "@prisma/client";

type DepartmentAccessResult =
  | { ok: true; session: JWTPayload; department: department }
  | { ok: false; response: NextResponse };

/**
 * 부서 관리 권한 체크: church SUPER_ADMIN 또는 해당 부서의 department_member.role === ADMIN
 */
export async function requireDepartmentAccess(
  departmentId: string,
): Promise<DepartmentAccessResult> {
  const session = await getSession();

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      ),
    };
  }

  const department = await prisma.department.findFirst({
    where: { id: departmentId, church_id: session.churchId, deleted_at: null },
  });

  if (!department) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "부서를 찾을 수 없습니다." },
        { status: 404 },
      ),
    };
  }

  if (session.role !== "SUPER_ADMIN") {
    const myDeptMember = await prisma.department_member.findFirst({
      where: {
        department_id: departmentId,
        member_id: session.memberId,
        deleted_at: null,
      },
    });

    if (!myDeptMember || myDeptMember.role !== "ADMIN") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "부서 관리 권한이 필요합니다." },
          { status: 403 },
        ),
      };
    }
  }

  return { ok: true, session, department };
}
