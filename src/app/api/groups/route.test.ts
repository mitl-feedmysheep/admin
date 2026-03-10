import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getPrismaMock, resetPrismaMocks } from "@/__tests__/setup";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("generated-uuid-001"),
}));

import { getSession } from "@/lib/auth";
import { GET, POST } from "./route";

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

describe("GET /api/groups", () => {
  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3001/api/groups");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns groups list with member counts", async () => {
    mockedGetSession.mockResolvedValue(session);

    getPrismaMock("group", "findMany").mockResolvedValue([
      {
        id: "g-1",
        name: "1셀",
        description: "첫번째 셀",
        start_date: new Date("2025-03-01"),
        end_date: null,
        created_at: new Date("2025-03-01"),
        group_members: [
          { role: "LEADER", member: { id: "m-10", name: "리더" } },
          { role: "MEMBER", member: { id: "m-11", name: "멤버1" } },
          { role: "MEMBER", member: { id: "m-12", name: "멤버2" } },
        ],
      },
      {
        id: "g-2",
        name: "2셀",
        description: null,
        start_date: new Date("2025-06-01"),
        end_date: new Date("2025-12-31"),
        created_at: new Date("2025-06-01"),
        group_members: [],
      },
    ]);

    const req = new NextRequest("http://localhost:3001/api/groups");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.groups).toHaveLength(2);
    expect(body.data.total).toBe(2);

    const group1 = body.data.groups[0];
    expect(group1.name).toBe("1셀");
    expect(group1.memberCount).toBe(3);
    expect(group1.leaderName).toBe("리더");
    expect(group1.startDate).toBe("2025-03-01");
    expect(group1.endDate).toBeNull();

    const group2 = body.data.groups[1];
    expect(group2.memberCount).toBe(0);
    expect(group2.leaderName).toBe("");
    expect(group2.endDate).toBe("2025-12-31");
  });

  it("passes year filter to query", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("group", "findMany").mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3001/api/groups?year=2025");
    await GET(req);

    const findManyCall = getPrismaMock("group", "findMany").mock.calls[0][0];
    expect(findManyCall.where.start_date).toBeDefined();
  });
});

describe("POST /api/groups", () => {
  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3001/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: "새셀" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is empty", async () => {
    mockedGetSession.mockResolvedValue(session);

    const req = new NextRequest("http://localhost:3001/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("이름");
  });

  it("returns 409 when duplicate group name exists", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("group", "findFirst").mockResolvedValue({ id: "existing" });

    const req = new NextRequest("http://localhost:3001/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: "기존셀" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("동일한 이름");
  });

  it("creates group successfully", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("group", "findFirst").mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3001/api/groups", {
      method: "POST",
      body: JSON.stringify({
        name: "새로운셀",
        description: "설명",
        startDate: "2025-03-01",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("새로운셀");
    expect(body.data.groupId).toBe("generated-uuid-001");
  });
});
