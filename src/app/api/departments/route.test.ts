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

import { getSession } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { GET, POST } from "./route";

const mockedGetSession = vi.mocked(getSession);
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

describe("GET /api/departments", () => {
  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3001/api/departments");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns departments list with memberCount and groupCount", async () => {
    mockedGetSession.mockResolvedValue(superAdminSession);

    getPrismaMock("department", "findMany").mockResolvedValue([
      {
        id: "dept-001",
        church_id: "church-001",
        name: "청년부",
        description: "청년부입니다",
        created_at: new Date("2025-01-01"),
        department_members: [{ id: "dm-1" }, { id: "dm-2" }],
        groups: [{ id: "g-1" }],
      },
      {
        id: "dept-002",
        church_id: "church-001",
        name: "장년부",
        description: null,
        created_at: new Date("2025-02-01"),
        department_members: [],
        groups: [],
      },
    ]);

    const req = new NextRequest("http://localhost:3001/api/departments");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.departments).toHaveLength(2);

    const dept1 = body.data.departments[0];
    expect(dept1.name).toBe("청년부");
    expect(dept1.memberCount).toBe(2);
    expect(dept1.groupCount).toBe(1);

    const dept2 = body.data.departments[1];
    expect(dept2.name).toBe("장년부");
    expect(dept2.memberCount).toBe(0);
    expect(dept2.groupCount).toBe(0);
  });

  it("uses churchId from query param when provided", async () => {
    mockedGetSession.mockResolvedValue(superAdminSession);
    getPrismaMock("department", "findMany").mockResolvedValue([]);

    const req = new NextRequest(
      "http://localhost:3001/api/departments?churchId=church-999"
    );
    await GET(req);

    const findManyCall = getPrismaMock("department", "findMany").mock
      .calls[0][0];
    expect(findManyCall.where.church_id).toBe("church-999");
  });
});

describe("POST /api/departments", () => {
  it("returns 401/403 when not SUPER_ADMIN", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: "SUPER_ADMIN 권한이 필요합니다." },
        { status: 403 }
      ),
    });

    const req = new NextRequest("http://localhost:3001/api/departments", {
      method: "POST",
      body: JSON.stringify({ name: "새부서" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is empty", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });

    const req = new NextRequest("http://localhost:3001/api/departments", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("이름");
  });

  it("returns 409 when duplicate name exists", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "existing",
    });

    const req = new NextRequest("http://localhost:3001/api/departments", {
      method: "POST",
      body: JSON.stringify({ name: "청년부" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("같은 이름");
  });

  it("creates department successfully", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3001/api/departments", {
      method: "POST",
      body: JSON.stringify({ name: "새부서", description: "설명" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("generated-uuid");
  });
});
