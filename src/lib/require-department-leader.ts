import { NextResponse } from "next/server";
import { getSession, JWTPayload } from "@/lib/auth";
import { canAccessAdminPortal } from "@/lib/roles";

type GuardResult =
  | { ok: true; session: JWTPayload }
  | { ok: false; response: NextResponse };

/**
 * dept LEADER+ OR church ADMIN+ 권한 체크
 */
export async function requireDepartmentLeader(): Promise<GuardResult> {
  const session = await getSession();

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 }),
    };
  }

  if (!canAccessAdminPortal(session.role, session.departmentRole)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "부서장 이상 권한이 필요합니다." }, { status: 403 }),
    };
  }

  return { ok: true, session };
}
