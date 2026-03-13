import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getPrismaMock, resetPrismaMocks } from "@/__tests__/setup";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("generated-uuid"),
}));

import { getSession } from "@/lib/auth";
import { POST } from "./route";

const mockedGetSession = vi.mocked(getSession);

const session = {
  memberId: "m-1",
  memberName: "관리자",
  churchId: "church-001",
  churchName: "교회",
  role: "ADMIN",
  departmentId: "dept-001",
  departmentName: "청년부",
  departmentRole: "ADMIN",
  iat: 0,
  exp: 0,
};

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function approveRequest(body: Record<string, unknown>) {
  return new NextRequest(
    "http://localhost:3001/api/manage/join-requests/approve",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

describe("POST /api/manage/join-requests/approve", () => {
  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await POST(approveRequest({ requestId: "req-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when requestId is missing", async () => {
    mockedGetSession.mockResolvedValue(session);

    const res = await POST(approveRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("요청 ID");
  });

  it("returns 404 when join request not found", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("church_member_request", "findFirst").mockResolvedValue(null);

    const res = await POST(approveRequest({ requestId: "req-nonexistent" }));
    expect(res.status).toBe(404);
  });

  it("approves join request and creates church member", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("church_member_request", "findFirst").mockResolvedValue({
      id: "req-1",
      member_id: "m-10",
      church_id: "church-001",
      status: "PENDING",
    });
    getPrismaMock("church_member", "findFirst").mockResolvedValue(null);

    const res = await POST(approveRequest({ requestId: "req-1" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("approves without creating duplicate church member", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("church_member_request", "findFirst").mockResolvedValue({
      id: "req-1",
      member_id: "m-10",
      church_id: "church-001",
      status: "PENDING",
    });
    getPrismaMock("church_member", "findFirst").mockResolvedValue({
      id: "cm-existing",
    });

    const res = await POST(approveRequest({ requestId: "req-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("creates department member when approving", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("church_member_request", "findFirst").mockResolvedValue({
      id: "req-2",
      member_id: "m-30",
      church_id: "church-001",
      department_id: null,
      status: "PENDING",
    });
    getPrismaMock("church_member", "findFirst").mockResolvedValue(null);

    const res = await POST(approveRequest({ requestId: "req-2" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
