import { vi } from "vitest";
import type { JWTPayload } from "@/lib/auth";

export function mockSession(session: JWTPayload | null) {
  vi.doMock("@/lib/auth", () => ({
    getSession: vi.fn().mockResolvedValue(session),
    createToken: vi.fn().mockResolvedValue("mock-jwt-token"),
    verifyToken: vi.fn().mockResolvedValue(session),
    setSessionCookie: vi.fn().mockResolvedValue(undefined),
    clearSessionCookie: vi.fn().mockResolvedValue(undefined),
  }));
}

export const adminSession: JWTPayload = {
  memberId: "member-001",
  memberName: "관리자",
  churchId: "church-001",
  churchName: "테스트교회",
  role: "ADMIN",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400,
};

export const superAdminSession: JWTPayload = {
  ...adminSession,
  role: "SUPER_ADMIN",
  memberName: "최고관리자",
};

export function makeRequest(
  url: string,
  options?: RequestInit
): Request {
  return new Request(`http://localhost:3001${url}`, options);
}
