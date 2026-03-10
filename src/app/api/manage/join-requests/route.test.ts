import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPrismaMock, resetPrismaMocks } from "@/__tests__/setup";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { GET } from "./route";

const mockedGetSession = vi.mocked(getSession);

const session = {
  memberId: "m-1",
  memberName: "관리자",
  churchId: "church-001",
  churchName: "교회",
  role: "ADMIN",
  iat: 0,
  exp: 0,
};

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

describe("GET /api/manage/join-requests", () => {
  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns pending join requests", async () => {
    mockedGetSession.mockResolvedValue(session);

    getPrismaMock("church_member_request", "findMany").mockResolvedValue([
      {
        id: "req-1",
        member_id: "m-10",
        created_at: new Date("2025-03-01"),
        member: {
          id: "m-10",
          name: "홍길동",
          email: "hong@test.com",
          sex: "M",
          birthday: new Date("1990-05-15"),
          phone: "010-1234-5678",
        },
      },
      {
        id: "req-2",
        member_id: "m-11",
        created_at: new Date("2025-03-02"),
        member: {
          id: "m-11",
          name: "김영희",
          email: "kim@test.com",
          sex: "F",
          birthday: null,
          phone: null,
        },
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.requests).toHaveLength(2);
    expect(body.data.total).toBe(2);

    expect(body.data.requests[0].name).toBe("홍길동");
    expect(body.data.requests[0].sex).toBe("MALE");
    expect(body.data.requests[0].birthday).toBe("1990-05-15");

    expect(body.data.requests[1].sex).toBe("FEMALE");
    expect(body.data.requests[1].birthday).toBe("");
    expect(body.data.requests[1].phone).toBe("");
  });

  it("returns empty when no pending requests", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("church_member_request", "findMany").mockResolvedValue([]);

    const res = await GET();
    const body = await res.json();

    expect(body.data.requests).toHaveLength(0);
    expect(body.data.total).toBe(0);
  });
});
