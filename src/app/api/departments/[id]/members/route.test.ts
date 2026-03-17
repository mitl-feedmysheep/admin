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

const adminSession = {
  memberId: "m-2",
  memberName: "부서장",
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

describe("GET /api/departments/[id]/members", () => {
  const params = Promise.resolve({ id: "dept-001" });

  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members"
    );
    const res = await GET(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when department not found", async () => {
    mockedGetSession.mockResolvedValue(superAdminSession);
    getPrismaMock("department", "findFirst").mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members"
    );
    const res = await GET(req, { params });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("찾을 수 없습니다");
  });

  it("returns 403 when non-SUPER_ADMIN and not dept ADMIN", async () => {
    const memberSession = {
      ...adminSession,
      role: "MEMBER",
      departmentRole: "MEMBER",
    };
    mockedGetSession.mockResolvedValue(memberSession);
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    // Not a dept admin
    getPrismaMock("department_member", "findFirst").mockResolvedValue({
      id: "dm-1",
      role: "MEMBER",
    });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members"
    );
    const res = await GET(req, { params });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("권한");
  });

  it("returns member list sorted by role priority for SUPER_ADMIN", async () => {
    mockedGetSession.mockResolvedValue(superAdminSession);
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("department_member", "findMany").mockResolvedValue([
      {
        id: "dm-1",
        member_id: "m-10",
        role: "MEMBER",
        status: "ACTIVE",
        created_at: new Date("2025-01-01"),
        member: { id: "m-10", name: "김멤버", email: "kim@test.com", phone: "010-1111-1111" },
      },
      {
        id: "dm-2",
        member_id: "m-11",
        role: "ADMIN",
        status: "ACTIVE",
        created_at: new Date("2025-01-01"),
        member: { id: "m-11", name: "박관리", email: "park@test.com", phone: "010-2222-2222" },
      },
      {
        id: "dm-3",
        member_id: "m-12",
        role: "LEADER",
        status: "ACTIVE",
        created_at: new Date("2025-01-01"),
        member: { id: "m-12", name: "이리더", email: "lee@test.com", phone: "010-3333-3333" },
      },
    ]);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members"
    );
    const res = await GET(req, { params });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.members).toHaveLength(3);

    // Sorted: ADMIN > LEADER > MEMBER
    expect(body.data.members[0].role).toBe("ADMIN");
    expect(body.data.members[1].role).toBe("LEADER");
    expect(body.data.members[2].role).toBe("MEMBER");
  });

  it("returns member list for dept ADMIN", async () => {
    mockedGetSession.mockResolvedValue(adminSession);
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    // Dept admin check
    getPrismaMock("department_member", "findFirst").mockResolvedValue({
      id: "dm-admin",
      role: "ADMIN",
    });
    getPrismaMock("department_member", "findMany").mockResolvedValue([
      {
        id: "dm-1",
        member_id: "m-10",
        role: "MEMBER",
        status: "ACTIVE",
        created_at: new Date("2025-01-01"),
        member: { id: "m-10", name: "김멤버", email: "kim@test.com", phone: "010-1111-1111" },
      },
    ]);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members"
    );
    const res = await GET(req, { params });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.members).toHaveLength(1);
    expect(body.data.members[0].name).toBe("김멤버");
  });
});

describe("POST /api/departments/[id]/members", () => {
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
      "http://localhost:3001/api/departments/dept-001/members",
      {
        method: "POST",
        body: JSON.stringify({ memberId: "m-10", role: "MEMBER" }),
      }
    );
    const res = await POST(req, { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 when department not found", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members",
      {
        method: "POST",
        body: JSON.stringify({ memberId: "m-10" }),
      }
    );
    const res = await POST(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns 400 when memberId missing", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("멤버");
  });

  it("returns 400 when invalid role", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members",
      {
        method: "POST",
        body: JSON.stringify({ memberId: "m-10", role: "INVALID" }),
      }
    );
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("역할");
  });

  it("returns 400 when member not a church member", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("church_member", "findFirst").mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members",
      {
        method: "POST",
        body: JSON.stringify({ memberId: "m-10", role: "MEMBER" }),
      }
    );
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("교회의 멤버");
  });

  it("returns 409 when member already in department", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("church_member", "findFirst").mockResolvedValue({
      id: "cm-1",
    });
    getPrismaMock("department_member", "findFirst").mockResolvedValue({
      id: "dm-existing",
    });

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members",
      {
        method: "POST",
        body: JSON.stringify({ memberId: "m-10", role: "MEMBER" }),
      }
    );
    const res = await POST(req, { params });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("이미");
  });

  it("creates department member successfully", async () => {
    mockedRequireSuperAdmin.mockResolvedValue({
      ok: true,
      session: superAdminSession,
    });
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("church_member", "findFirst").mockResolvedValue({
      id: "cm-1",
    });
    getPrismaMock("department_member", "findFirst").mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3001/api/departments/dept-001/members",
      {
        method: "POST",
        body: JSON.stringify({ memberId: "m-10", role: "MEMBER" }),
      }
    );
    const res = await POST(req, { params });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("generated-uuid");
  });
});
