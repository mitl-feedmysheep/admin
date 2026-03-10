import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/roles", async () => {
  const actual = await vi.importActual<typeof import("@/lib/roles")>(
    "@/lib/roles"
  );
  return actual;
});

import { getSession } from "@/lib/auth";
import { requireSuperAdmin } from "./require-super-admin";

const mockedGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireSuperAdmin", () => {
  it("returns ok:false with 401 when no session exists", async () => {
    mockedGetSession.mockResolvedValue(null);

    const result = await requireSuperAdmin();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.error).toContain("인증");
    }
  });

  it("returns ok:false with 403 when role is MEMBER", async () => {
    mockedGetSession.mockResolvedValue({
      memberId: "m-1",
      memberName: "테스트",
      churchId: "c-1",
      churchName: "교회",
      role: "MEMBER",
      iat: 0,
      exp: 0,
    });

    const result = await requireSuperAdmin();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const body = await result.response.json();
      expect(body.error).toContain("SUPER_ADMIN");
    }
  });

  it("returns ok:false with 403 when role is ADMIN", async () => {
    mockedGetSession.mockResolvedValue({
      memberId: "m-1",
      memberName: "테스트",
      churchId: "c-1",
      churchName: "교회",
      role: "ADMIN",
      iat: 0,
      exp: 0,
    });

    const result = await requireSuperAdmin();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns ok:true with session when role is SUPER_ADMIN", async () => {
    const session = {
      memberId: "m-1",
      memberName: "관리자",
      churchId: "c-1",
      churchName: "교회",
      role: "SUPER_ADMIN",
      iat: 0,
      exp: 0,
    };
    mockedGetSession.mockResolvedValue(session);

    const result = await requireSuperAdmin();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session).toEqual(session);
    }
  });
});
