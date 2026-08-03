import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
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

const params = Promise.resolve({ id: "g-1" });

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

describe("GET /api/groups/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3001/api/groups/g-1");
    const res = await GET(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when group not found", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("group", "findFirst").mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3001/api/groups/g-1");
    const res = await GET(req, { params });
    expect(res.status).toBe(404);
  });

  it("maps member sex and group_member joined date without altering raw values", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("group", "findFirst").mockResolvedValue({
      id: "g-1",
      group_members: [
        {
          id: "gm-1",
          role: "LEADER",
          created_at: new Date("2025-04-10T00:00:00Z"),
          member: {
            id: "m-10",
            name: "홍길동",
            sex: "M",
            phone: "010-1111-2222",
            birthday: new Date("1990-01-01"),
          },
        },
        {
          id: "gm-2",
          role: "MEMBER",
          created_at: new Date("2025-05-20T00:00:00Z"),
          member: {
            id: "m-11",
            name: "김영희",
            sex: "F",
            phone: "010-3333-4444",
            birthday: new Date("1992-02-02"),
          },
        },
      ],
    });

    const req = new NextRequest("http://localhost:3001/api/groups/g-1");
    const res = await GET(req, { params });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.members).toHaveLength(2);

    const [leader, member] = body.data.members;
    expect(leader.sex).toBe("M");
    expect(leader.joinedAt).toBe("2025-04-10");
    expect(member.sex).toBe("F");
    expect(member.joinedAt).toBe("2025-05-20");
  });
});
