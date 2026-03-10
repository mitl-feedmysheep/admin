import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
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

function membersRequest(query: string = "") {
  return new NextRequest(
    `http://localhost:3001/api/members${query ? `?q=${encodeURIComponent(query)}` : ""}`
  );
}

describe("GET /api/members", () => {
  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await GET(membersRequest("홍"));
    expect(res.status).toBe(401);
  });

  it("returns empty array when query is empty", async () => {
    mockedGetSession.mockResolvedValue({
      memberId: "m-1",
      memberName: "관리자",
      churchId: "church-001",
      churchName: "교회",
      role: "ADMIN",
      iat: 0,
      exp: 0,
    });

    const res = await GET(membersRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.members).toHaveLength(0);
    expect(body.data.total).toBe(0);
  });

  it("returns matching members with groups", async () => {
    mockedGetSession.mockResolvedValue({
      memberId: "m-1",
      memberName: "관리자",
      churchId: "church-001",
      churchName: "교회",
      role: "ADMIN",
      iat: 0,
      exp: 0,
    });

    getPrismaMock("church_member", "findMany").mockResolvedValue([
      {
        id: "cm-1",
        member_id: "m-10",
        member: {
          id: "m-10",
          name: "홍길동",
          email: "hong@test.com",
          phone: "010-1234-5678",
          sex: "M",
          birthday: new Date("1990-01-15"),
          profile_url: null,
          address: "서울시",
          occupation: "개발자",
          baptism_status: "BAPTIZED",
          mbti: "INTJ",
          description: null,
        },
      },
    ]);

    getPrismaMock("group_member", "findMany").mockResolvedValue([
      {
        member_id: "m-10",
        role: "LEADER",
        group: { id: "g-1", name: "1셀" },
      },
    ]);

    const res = await GET(membersRequest("홍"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.members).toHaveLength(1);

    const member = body.data.members[0];
    expect(member.name).toBe("홍길동");
    expect(member.primaryGroup).toBe("1셀");
    expect(member.role).toBe("LEADER");
    expect(member.groups).toHaveLength(1);
  });

  it("assigns MEMBER role when no leader group exists", async () => {
    mockedGetSession.mockResolvedValue({
      memberId: "m-1",
      memberName: "관리자",
      churchId: "church-001",
      churchName: "교회",
      role: "ADMIN",
      iat: 0,
      exp: 0,
    });

    getPrismaMock("church_member", "findMany").mockResolvedValue([
      {
        id: "cm-2",
        member_id: "m-20",
        member: {
          id: "m-20",
          name: "김철수",
          email: null,
          phone: null,
          sex: null,
          birthday: null,
          profile_url: null,
          address: null,
          occupation: null,
          baptism_status: null,
          mbti: null,
          description: null,
        },
      },
    ]);

    getPrismaMock("group_member", "findMany").mockResolvedValue([
      {
        member_id: "m-20",
        role: "MEMBER",
        group: { id: "g-2", name: "2셀" },
      },
    ]);

    const res = await GET(membersRequest("김"));
    const body = await res.json();

    const member = body.data.members[0];
    expect(member.role).toBe("MEMBER");
    expect(member.primaryGroup).toBe("2셀");
  });
});
