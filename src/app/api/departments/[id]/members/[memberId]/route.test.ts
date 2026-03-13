import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { getPrismaMock, resetPrismaMocks } from "@/__tests__/setup";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/require-super-admin", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("generated-uuid"),
}));

import { requireSuperAdmin } from "@/lib/require-super-admin";
import { PATCH, DELETE } from "./route";

const mockedRequireSuperAdmin = vi.mocked(requireSuperAdmin);

const superAdminSession = {
  memberId: "m-1",
  memberName: "관리자",
  churchId: "church-001",
  churchName: "교회",
  role: "SUPER_ADMIN",
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

describe("PATCH /api/departments/[id]/members/[memberId]", () => {
  const params = Promise.resolve({ id: "dept-001", memberId: "m-10" });

  it("returns 401/403 when not SUPER_ADMIN", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: "SUPER_ADMIN 권한이 필요합니다." },
        { status: 403 }
      ),
    });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members/m-10",
      { method: "PATCH", body: JSON.stringify({ role: "LEADER" }) }
    );
    const res = await PATCH(req, { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when department not found", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members/m-10",
      { method: "PATCH", body: JSON.stringify({ role: "LEADER" }) }
    );
    const res = await PATCH(req, { params });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("부서를 찾을 수 없습니다");
  });

  it("returns 404 when dept member not found", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("department_member", "findFirst").mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members/m-10",
      { method: "PATCH", body: JSON.stringify({ role: "LEADER" }) }
    );
    const res = await PATCH(req, { params });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("부서 멤버를 찾을 수 없습니다");
  });

  it("returns 400 when invalid role", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("department_member", "findFirst").mockResolvedValue({
      id: "dm-1",
      role: "MEMBER",
    });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members/m-10",
      { method: "PATCH", body: JSON.stringify({ role: "INVALID" }) }
    );
    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("역할");
  });

  it("returns 400 when invalid status", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("department_member", "findFirst").mockResolvedValue({
      id: "dm-1",
      role: "MEMBER",
    });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members/m-10",
      { method: "PATCH", body: JSON.stringify({ status: "INVALID" }) }
    );
    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("상태");
  });

  it("updates role successfully", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("department_member", "findFirst").mockResolvedValue({
      id: "dm-1",
      role: "MEMBER",
    });
    getPrismaMock("department_member", "update").mockResolvedValue({});

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members/m-10",
      { method: "PATCH", body: JSON.stringify({ role: "LEADER" }) }
    );
    const res = await PATCH(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("updates status successfully", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("department_member", "findFirst").mockResolvedValue({
      id: "dm-1",
      role: "MEMBER",
    });
    getPrismaMock("department_member", "update").mockResolvedValue({});

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members/m-10",
      { method: "PATCH", body: JSON.stringify({ status: "GRADUATED" }) }
    );
    const res = await PATCH(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("DELETE /api/departments/[id]/members/[memberId]", () => {
  const params = Promise.resolve({ id: "dept-001", memberId: "m-10" });

  it("returns 401/403 when not SUPER_ADMIN", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      ),
    });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members/m-10",
      { method: "DELETE" }
    );
    const res = await DELETE(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when department not found", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members/m-10",
      { method: "DELETE" }
    );
    const res = await DELETE(req, { params });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("부서를 찾을 수 없습니다");
  });

  it("returns 404 when dept member not found", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("department_member", "findFirst").mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members/m-10",
      { method: "DELETE" }
    );
    const res = await DELETE(req, { params });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("부서 멤버를 찾을 수 없습니다");
  });

  it("soft deletes department member successfully", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("department_member", "findFirst").mockResolvedValue({
      id: "dm-1",
    });
    getPrismaMock("department_member", "update").mockResolvedValue({});

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members/m-10",
      { method: "DELETE" }
    );
    const res = await DELETE(req, { params });
    expect(res.status).toBe(204);
  });
});
