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

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

describe("GET /api/dashboard/stats", () => {
  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3001/api/dashboard/stats");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns stats with attendance rates", async () => {
    mockedGetSession.mockResolvedValue(session);

    getPrismaMock("church_member", "count").mockResolvedValue(25);
    getPrismaMock("group", "findMany").mockResolvedValue([
      {
        id: "g-1",
        gatherings: [
          {
            gathering_members: [
              { worship_attendance: true, gathering_attendance: true },
              { worship_attendance: true, gathering_attendance: false },
              { worship_attendance: false, gathering_attendance: true },
              { worship_attendance: false, gathering_attendance: false },
            ],
          },
        ],
      },
      {
        id: "g-2",
        gatherings: [],
      },
    ]);

    const req = new NextRequest(
      "http://localhost:3001/api/dashboard/stats?year=2025"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalMembers).toBe(25);
    expect(body.data.activeGroups).toBe(2);
    expect(body.data.worshipRate).toBe("50%");
    expect(body.data.gatheringRate).toBe("50%");
  });

  it("returns 0% rates when no gatherings exist", async () => {
    mockedGetSession.mockResolvedValue(session);

    getPrismaMock("church_member", "count").mockResolvedValue(10);
    getPrismaMock("group", "findMany").mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3001/api/dashboard/stats");
    const res = await GET(req);
    const body = await res.json();

    expect(body.data.activeGroups).toBe(0);
    expect(body.data.worshipRate).toBe("0%");
    expect(body.data.gatheringRate).toBe("0%");
  });
});
