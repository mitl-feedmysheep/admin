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

describe("PATCH /api/departments/[id]", () => {
  const params = Promise.resolve({ id: "dept-001" });

  it("returns 401/403 when not SUPER_ADMIN", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: "SUPER_ADMIN 권한이 필요합니다." },
        { status: 403 }
      ),
    });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001",
      { method: "PATCH", body: JSON.stringify({ name: "수정" }) }
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
      "http://localhost:3001/api/departments/dept-001",
      { method: "PATCH", body: JSON.stringify({ name: "수정" }) }
    );
    const res = await PATCH(req, { params });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("찾을 수 없습니다");
  });

  it("returns 400 when name is empty", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
      name: "청년부",
    });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001",
      { method: "PATCH", body: JSON.stringify({ name: "" }) }
    );
    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("이름");
  });

  it("returns 409 when duplicate name exists", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    // First call: find the department being updated
    getPrismaMock("department", "findFirst")
      .mockResolvedValueOnce({ id: "dept-001", name: "청년부" })
      // Second call: duplicate check
      .mockResolvedValueOnce({ id: "dept-002", name: "장년부" });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001",
      { method: "PATCH", body: JSON.stringify({ name: "장년부" }) }
    );
    const res = await PATCH(req, { params });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("같은 이름");
  });

  it("updates department successfully", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst")
      .mockResolvedValueOnce({ id: "dept-001", name: "청년부" })
      .mockResolvedValueOnce(null); // no duplicate
    getPrismaMock("department", "update").mockResolvedValue({});

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001",
      {
        method: "PATCH",
        body: JSON.stringify({ name: "새이름", description: "새설명" }),
      }
    );
    const res = await PATCH(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("DELETE /api/departments/[id]", () => {
  const params = Promise.resolve({ id: "dept-001" });

  it("returns 401/403 when not SUPER_ADMIN", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      ),
    });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001",
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
      "http://localhost:3001/api/departments/dept-001",
      { method: "DELETE" }
    );
    const res = await DELETE(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns 400 when department is default", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
      is_default: true,
    });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001",
      { method: "DELETE" }
    );
    const res = await DELETE(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("기본 부서");
  });

  it("returns 400 when active members exist", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
      is_default: false,
    });
    getPrismaMock("department_member", "count").mockResolvedValue(3);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001",
      { method: "DELETE" }
    );
    const res = await DELETE(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("멤버");
  });

  it("returns 400 when active groups exist", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
      is_default: false,
    });
    getPrismaMock("department_member", "count").mockResolvedValue(0);
    getPrismaMock("group", "count").mockResolvedValue(2);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001",
      { method: "DELETE" }
    );
    const res = await DELETE(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("소그룹");
  });

  it("soft deletes department successfully", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
      is_default: false,
    });
    getPrismaMock("department_member", "count").mockResolvedValue(0);
    getPrismaMock("group", "count").mockResolvedValue(0);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001",
      { method: "DELETE" }
    );
    const res = await DELETE(req, { params });
    expect(res.status).toBe(204);
  });
});
