import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const jwtVerifyMock = vi.fn();
vi.mock("jose", () => ({
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
}));

vi.mock("@/lib/roles", async () => {
  const actual = await vi.importActual<typeof import("@/lib/roles")>(
    "@/lib/roles"
  );
  return actual;
});

import { middleware } from "./middleware";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SYSTEM_ADMIN_MEMBER_ID = "system-admin-id";
});

function createRequest(path: string, token?: string) {
  const url = `http://localhost:3001${path}`;
  const req = new NextRequest(url);
  if (token) {
    req.cookies.set("admin_token", token);
  }
  return req;
}

describe("middleware", () => {
  describe("root redirect", () => {
    it("redirects / to /dashboard", async () => {
      const res = await middleware(createRequest("/"));
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toContain("/dashboard");
    });
  });

  describe("protected routes (unauthenticated)", () => {
    const protectedPaths = [
      "/dashboard",
      "/members",
      "/members/123",
      "/groups",
      "/groups/456/edit",
      "/manage",
      "/manage/group",
      "/system",
      "/system/church",
    ];

    it.each(protectedPaths)(
      "redirects %s to /login when not authenticated",
      async (path) => {
        const res = await middleware(createRequest(path));
        expect(res.status).toBe(307);
        expect(res.headers.get("Location")).toContain("/login");
      }
    );
  });

  describe("protected routes (authenticated)", () => {
    it("allows access to /dashboard with valid token", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { role: "ADMIN", memberId: "m-1" },
      });

      const res = await middleware(createRequest("/dashboard", "valid-token"));
      expect(res.status).toBe(200);
    });

    it("allows access to /members with valid token", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { role: "ADMIN", memberId: "m-1" },
      });

      const res = await middleware(createRequest("/members", "valid-token"));
      expect(res.status).toBe(200);
    });
  });

  describe("invalid token", () => {
    it("redirects to /login when token verification fails", async () => {
      jwtVerifyMock.mockRejectedValue(new Error("Invalid token"));

      const res = await middleware(
        createRequest("/dashboard", "invalid-token")
      );
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toContain("/login");
    });
  });

  describe("super admin routes", () => {
    it("redirects /manage/visit to /dashboard for ADMIN role", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { role: "ADMIN", memberId: "m-1" },
      });

      const res = await middleware(
        createRequest("/manage/visit", "valid-token")
      );
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toContain("/dashboard");
    });

    it("redirects /manage/prayer to /dashboard for LEADER role", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { role: "LEADER", memberId: "m-1" },
      });

      const res = await middleware(
        createRequest("/manage/prayer", "valid-token")
      );
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toContain("/dashboard");
    });

    it("allows /manage/visit for SUPER_ADMIN role", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { role: "SUPER_ADMIN", memberId: "m-1" },
      });

      const res = await middleware(
        createRequest("/manage/visit", "valid-token")
      );
      expect(res.status).toBe(200);
    });

    it("allows /manage/prayer for SUPER_ADMIN role", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { role: "SUPER_ADMIN", memberId: "m-1" },
      });

      const res = await middleware(
        createRequest("/manage/prayer", "valid-token")
      );
      expect(res.status).toBe(200);
    });
  });

  describe("system admin routes", () => {
    it("redirects /system/church when memberId does not match", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { role: "SUPER_ADMIN", memberId: "not-system-admin" },
      });

      const res = await middleware(
        createRequest("/system/church", "valid-token")
      );
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toContain("/dashboard");
    });

    it("allows /system/church for system admin member", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { role: "SUPER_ADMIN", memberId: "system-admin-id" },
      });

      const res = await middleware(
        createRequest("/system/church", "valid-token")
      );
      expect(res.status).toBe(200);
    });

    it("redirects /system/monitoring for non-system-admin", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { role: "SUPER_ADMIN", memberId: "other-id" },
      });

      const res = await middleware(
        createRequest("/system/monitoring", "valid-token")
      );
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toContain("/dashboard");
    });

    it("allows /system/monitoring for system admin", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { role: "SUPER_ADMIN", memberId: "system-admin-id" },
      });

      const res = await middleware(
        createRequest("/system/monitoring", "valid-token")
      );
      expect(res.status).toBe(200);
    });
  });

  describe("auth routes (login)", () => {
    it("redirects /login to /dashboard when already authenticated", async () => {
      jwtVerifyMock.mockResolvedValue({
        payload: { role: "ADMIN", memberId: "m-1" },
      });

      const res = await middleware(createRequest("/login", "valid-token"));
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toContain("/dashboard");
    });

    it("allows /login when not authenticated", async () => {
      const res = await middleware(createRequest("/login"));
      expect(res.status).toBe(200);
    });
  });

  describe("unprotected routes", () => {
    it("allows access to /api routes without authentication", async () => {
      const req = new NextRequest("http://localhost:3001/api/auth/login");
      const res = await middleware(req);
      expect(res.status).toBe(200);
    });
  });
});
