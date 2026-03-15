import { NextResponse } from "next/server";
import { getSession, JWTPayload } from "@/lib/auth";
import { canAccessVisitPrayer } from "@/lib/roles";

type GuardResult =
  | { ok: true; session: JWTPayload }
  | { ok: false; response: NextResponse };

/**
 * dept ADMIN+ OR church SUPER_ADMIN 권한 체크
 */
export async function requireDepartmentAdmin(): Promise<GuardResult> {
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

  if (!canAccessVisitPrayer(session.role, session.departmentRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "부서 관리자 권한이 필요합니다." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, session };
}
