import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getPrismaMock, resetPrismaMocks } from "@/__tests__/setup";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { PATCH } from "./route";

const mockedGetSession = vi.mocked(getSession);

const SYSTEM_ADMIN_MEMBER_ID = "system-admin-1";

const systemAdminSession = {
  memberId: SYSTEM_ADMIN_MEMBER_ID,
  memberName: "시스템관리자",
  churchId: "c-1",
  churchName: "교회",
  role: "SUPER_ADMIN",
  iat: 0,
  exp: 0,
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/system/churches/church-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
  process.env.SYSTEM_ADMIN_MEMBER_ID = SYSTEM_ADMIN_MEMBER_ID;
});

describe("PATCH /api/system/churches/[id]", () => {
  it("returns 403 when not the system admin account", async () => {
    mockedGetSession.mockResolvedValue({
      ...systemAdminSession,
      memberId: "other-member",
    });

    const res = await PATCH(makeRequest({ isHidden: true }), {
      params: Promise.resolve({ id: "church-1" }),
    });

    expect(res.status).toBe(403);
  });

  it("returns 400 when isHidden is not a boolean", async () => {
    mockedGetSession.mockResolvedValue(systemAdminSession);

    const res = await PATCH(makeRequest({ isHidden: "true" }), {
      params: Promise.resolve({ id: "church-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 when church does not exist", async () => {
    mockedGetSession.mockResolvedValue(systemAdminSession);
    getPrismaMock("church", "findFirst").mockResolvedValue(null);

    const res = await PATCH(makeRequest({ isHidden: true }), {
      params: Promise.resolve({ id: "church-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("updates is_hidden and returns success", async () => {
    mockedGetSession.mockResolvedValue(systemAdminSession);
    getPrismaMock("church", "findFirst").mockResolvedValue({
      id: "church-1",
      name: "테스트교회",
    });
    const updateMock = getPrismaMock("church", "update").mockResolvedValue({});

    const res = await PATCH(makeRequest({ isHidden: true }), {
      params: Promise.resolve({ id: "church-1" }),
    });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "church-1" },
        data: expect.objectContaining({ is_hidden: true }),
      })
    );
  });
});
