import { NextResponse } from "next/server";
import { getSession, JWTPayload } from "@/lib/auth";
import { hasPermissionOver } from "@/lib/roles";

type SuperAdminResult =
  | { ok: true; session: JWTPayload }
  | { ok: false; response: NextResponse };

export async function requireSuperAdmin(): Promise<SuperAdminResult> {
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

  if (!hasPermissionOver(session.role, "SUPER_ADMIN")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "SUPER_ADMIN 권한이 필요합니다." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, session };
}
