import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getPrismaMock, resetPrismaMocks } from "@/__tests__/setup";

vi.mock("@/lib/auth", () => ({
  createToken: vi.fn().mockResolvedValue("mock-jwt-token"),
  setSessionCookie: vi.fn().mockResolvedValue(undefined),
  verifyToken: vi.fn(),
}));

import { verifyToken } from "@/lib/auth";
import { POST } from "./route";

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function selectChurchRequest(
  body: Record<string, unknown>,
  cookieToken?: string
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookieToken) {
    headers.set("Cookie", `admin_token=${cookieToken}`);
  }
  return new NextRequest("http://localhost:3001/api/auth/select-church", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

describe("POST /api/auth/select-church", () => {
  it("returns 400 when churchId is missing", async () => {
    const res = await POST(selectChurchRequest({ memberId: "m-1" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("교회 ID");
  });

  it("returns 401 when no memberId and no session cookie", async () => {
    const res = await POST(selectChurchRequest({ churchId: "c-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when member does not exist", async () => {
    getPrismaMock("member", "findUnique").mockResolvedValue(null);

    const res = await POST(
      selectChurchRequest({ memberId: "m-1", churchId: "c-1" })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("존재하지 않는");
  });

  it("returns 403 when member is not a church member", async () => {
    getPrismaMock("member", "findUnique").mockResolvedValue({
      id: "m-1",
      name: "테스트",
    });
    getPrismaMock("church_member", "findFirst").mockResolvedValue(null);

    const res = await POST(
      selectChurchRequest({ memberId: "m-1", churchId: "c-1" })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("멤버가 아닙니다");
  });

  it("returns 403 when member has no admin/department access", async () => {
    getPrismaMock("member", "findUnique").mockResolvedValue({
      id: "m-1",
      name: "일반멤버",
    });
    getPrismaMock("church_member", "findFirst").mockResolvedValue({
      role: "MEMBER",
      church: { id: "c-1", name: "교회" },
    });
    // No department LEADER+ roles
    getPrismaMock("department_member", "findMany").mockResolvedValue([]);

    const res = await POST(
      selectChurchRequest({ memberId: "m-1", churchId: "c-1" })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("관리자 권한");
  });

  it("returns success and sets cookie when valid", async () => {
    getPrismaMock("member", "findUnique").mockResolvedValue({
      id: "m-1",
      name: "관리자",
    });
    getPrismaMock("church_member", "findFirst").mockResolvedValue({
      role: "ADMIN",
      church: { id: "c-1", name: "교회" },
    });
    // Department queries for non-SUPER_ADMIN
    getPrismaMock("department_member", "findMany").mockResolvedValue([
      {
        role: "LEADER",
        department: { id: "dept-1", name: "청년부" },
      },
    ]);
    getPrismaMock("department_member", "findFirst").mockResolvedValue({
      role: "LEADER",
    });

    const res = await POST(
      selectChurchRequest({ memberId: "m-1", churchId: "c-1" })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.selectedDepartmentId).toBe("dept-1");
  });

  it("extracts memberId from session cookie when not in body", async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      memberId: "m-from-cookie",
      memberName: "쿠키유저",
      churchId: "c-old",
      churchName: "이전교회",
      role: "ADMIN",
      iat: 0,
      exp: 0,
    });

    getPrismaMock("member", "findUnique").mockResolvedValue({
      id: "m-from-cookie",
      name: "쿠키유저",
    });
    getPrismaMock("church_member", "findFirst").mockResolvedValue({
      role: "ADMIN",
      church: { id: "c-2", name: "새교회" },
    });
    // Department queries for non-SUPER_ADMIN
    getPrismaMock("department_member", "findMany").mockResolvedValue([
      {
        role: "ADMIN",
        department: { id: "dept-2", name: "장년부" },
      },
    ]);
    getPrismaMock("department_member", "findFirst").mockResolvedValue({
      role: "ADMIN",
    });

    const req = selectChurchRequest({ churchId: "c-2" }, "existing-token");
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
