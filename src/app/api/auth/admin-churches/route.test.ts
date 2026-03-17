import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPrismaMock, resetPrismaMocks } from "@/__tests__/setup";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { GET } from "./route";

const mockedGetSession = vi.mocked(getSession);

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

describe("GET /api/auth/admin-churches", () => {
  it("returns 401 when no session", async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns list of churches the user administers", async () => {
    mockedGetSession.mockResolvedValue({
      memberId: "m-1",
      memberName: "테스트",
      churchId: "c-1",
      churchName: "교회",
      role: "ADMIN",
      iat: 0,
      exp: 0,
    });

    getPrismaMock("church_member", "findMany").mockResolvedValue([
      {
        church: { id: "c-1", name: "제일교회" },
        role: "ADMIN",
      },
      {
        church: { id: "c-2", name: "은혜교회" },
        role: "SUPER_ADMIN",
      },
    ]);

    getPrismaMock("department_member", "findMany").mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.churches).toHaveLength(2);
    expect(body.churches[0].churchId).toBe("c-1");
    expect(body.churches[1].role).toBe("SUPER_ADMIN");
  });

  it("returns empty list when user has no admin churches", async () => {
    mockedGetSession.mockResolvedValue({
      memberId: "m-1",
      memberName: "테스트",
      churchId: "c-1",
      churchName: "교회",
      role: "ADMIN",
      iat: 0,
      exp: 0,
    });

    getPrismaMock("church_member", "findMany").mockResolvedValue([]);
    getPrismaMock("department_member", "findMany").mockResolvedValue([]);

    const res = await GET();
    const body = await res.json();
    expect(body.churches).toHaveLength(0);
  });

  it("includes churches accessible via department LEADER role", async () => {
    mockedGetSession.mockResolvedValue({
      memberId: "m-1",
      memberName: "테스트",
      churchId: "c-1",
      churchName: "교회",
      role: "ADMIN",
      iat: 0,
      exp: 0,
    });

    // 교회 ADMIN으로 소속된 교회 없음
    getPrismaMock("church_member", "findMany").mockResolvedValue([]);

    // 부서 LEADER로 소속된 교회
    getPrismaMock("department_member", "findMany").mockResolvedValue([
      {
        department: {
          church_id: "c-3",
          church: { id: "c-3", name: "새교회" },
        },
      },
    ]);

    // 해당 교회에서의 church_member role 조회
    getPrismaMock("church_member", "findFirst").mockResolvedValue({
      role: "MEMBER",
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.churches).toHaveLength(1);
    expect(body.churches[0].churchId).toBe("c-3");
    expect(body.churches[0].churchName).toBe("새교회");
    expect(body.churches[0].role).toBe("MEMBER");
  });
});
