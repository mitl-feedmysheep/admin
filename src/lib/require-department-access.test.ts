import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPrismaMock, resetPrismaMocks } from "@/__tests__/setup";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { requireDepartmentAccess } from "./require-department-access";

const mockedGetSession = vi.mocked(getSession);

const superAdminSession = {
  memberId: "m-1",
  memberName: "관리자",
  churchId: "church-001",
  churchName: "교회",
  role: "SUPER_ADMIN",
  iat: 0,
  exp: 0,
};

const memberSession = {
  memberId: "m-2",
  memberName: "일반멤버",
  churchId: "church-001",
  churchName: "교회",
  role: "MEMBER",
  iat: 0,
  exp: 0,
};

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

describe("requireDepartmentAccess", () => {
  it("returns ok:false with 401 when no session exists", async () => {
    mockedGetSession.mockResolvedValue(null);

    const result = await requireDepartmentAccess("dept-001");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns ok:false with 404 when department not found in current church", async () => {
    mockedGetSession.mockResolvedValue(superAdminSession);
    getPrismaMock("department", "findFirst").mockResolvedValue(null);

    const result = await requireDepartmentAccess("dept-001");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(404);
    }
  });

  it("returns ok:true for church SUPER_ADMIN without checking department_member", async () => {
    mockedGetSession.mockResolvedValue(superAdminSession);
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });

    const result = await requireDepartmentAccess("dept-001");

    expect(result.ok).toBe(true);
    expect(getPrismaMock("department_member", "findFirst")).not.toHaveBeenCalled();
  });

  it("returns ok:false with 403 when not SUPER_ADMIN and not a member of the department", async () => {
    mockedGetSession.mockResolvedValue(memberSession);
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("department_member", "findFirst").mockResolvedValue(null);

    const result = await requireDepartmentAccess("dept-001");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns ok:false with 403 when department_member role is not ADMIN", async () => {
    mockedGetSession.mockResolvedValue(memberSession);
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("department_member", "findFirst").mockResolvedValue({
      id: "dm-1",
      role: "LEADER",
    });

    const result = await requireDepartmentAccess("dept-001");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns ok:true when department_member role is ADMIN", async () => {
    mockedGetSession.mockResolvedValue(memberSession);
    getPrismaMock("department", "findFirst").mockResolvedValue({
      id: "dept-001",
    });
    getPrismaMock("department_member", "findFirst").mockResolvedValue({
      id: "dm-1",
      role: "ADMIN",
    });

    const result = await requireDepartmentAccess("dept-001");

    expect(result.ok).toBe(true);
  });
});
