import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getPrismaMock, resetPrismaMocks } from "@/__tests__/setup";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/webpush", () => ({
  sendPushToMembers: vi.fn(),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("generated-uuid"),
}));

import { getSession } from "@/lib/auth";
import { sendPushToMembers } from "@/lib/webpush";
import { PATCH } from "./route";

const mockedGetSession = vi.mocked(getSession);
const mockedSendPushToMembers = vi.mocked(sendPushToMembers);

const session = {
  memberId: "pastor-1",
  memberName: "목사님",
  churchId: "church-001",
  churchName: "교회",
  role: "ADMIN",
  departmentId: "dept-001",
  departmentName: "청년부",
  departmentRole: "ADMIN",
  iat: 0,
  exp: 0,
};

function patchGathering(body: Record<string, unknown>) {
  const req = new NextRequest("http://localhost:3001/api/dashboard/gatherings/g-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return PATCH(req, { params: Promise.resolve({ id: "g-1" }) });
}

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

describe("PATCH /api/dashboard/gatherings/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await patchGathering({ adminComment: "코멘트" });
    expect(res.status).toBe(401);
  });

  it("returns 404 when gathering not found", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("gathering", "findUnique").mockResolvedValue(null);

    const res = await patchGathering({ adminComment: "코멘트" });
    expect(res.status).toBe(404);
  });

  it("does not notify or push when adminComment is unchanged", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("gathering", "findUnique").mockResolvedValue({
      admin_comment: "기존 코멘트",
      group_id: "group-1",
      group: { department_id: "dept-001" },
    });
    getPrismaMock("gathering", "update").mockResolvedValue({
      id: "g-1",
      admin_comment: "기존 코멘트",
    });

    const res = await patchGathering({ adminComment: "기존 코멘트" });
    expect(res.status).toBe(200);

    expect(getPrismaMock("notification", "create")).not.toHaveBeenCalled();
    expect(mockedSendPushToMembers).not.toHaveBeenCalled();
  });

  it("does not notify or push for blank adminComment", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("gathering", "findUnique").mockResolvedValue({
      admin_comment: "기존 코멘트",
      group_id: "group-1",
      group: { department_id: "dept-001" },
    });
    getPrismaMock("gathering", "update").mockResolvedValue({
      id: "g-1",
      admin_comment: "   ",
    });

    const res = await patchGathering({ adminComment: "   " });
    expect(res.status).toBe(200);

    expect(getPrismaMock("notification", "create")).not.toHaveBeenCalled();
    expect(mockedSendPushToMembers).not.toHaveBeenCalled();
  });

  it("notifies active leaders and sends push when adminComment changes", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("gathering", "findUnique").mockResolvedValue({
      admin_comment: "기존 코멘트",
      group_id: "group-1",
      group: { department_id: "dept-001" },
    });
    getPrismaMock("gathering", "update").mockResolvedValue({
      id: "g-1",
      admin_comment: "새로운 코멘트",
    });
    getPrismaMock("group_member", "findMany").mockResolvedValue([
      { member_id: "leader-1" },
    ]);
    getPrismaMock("notification", "findFirst").mockResolvedValue(null);

    const res = await patchGathering({ adminComment: "새로운 코멘트" });
    expect(res.status).toBe(200);

    expect(getPrismaMock("notification", "create")).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          receiver_id: "leader-1",
          type: "ADMIN_COMMENT",
          entity_type: "GATHERING",
          entity_id: "g-1",
        }),
      })
    );
    expect(mockedSendPushToMembers).toHaveBeenCalledWith(
      ["leader-1"],
      expect.objectContaining({ title: "목회자 코멘트가 등록되었어요 😊" })
    );
  });

  it("skips notification and push for a leader with an existing unread notification", async () => {
    mockedGetSession.mockResolvedValue(session);
    getPrismaMock("gathering", "findUnique").mockResolvedValue({
      admin_comment: "기존 코멘트",
      group_id: "group-1",
      group: { department_id: "dept-001" },
    });
    getPrismaMock("gathering", "update").mockResolvedValue({
      id: "g-1",
      admin_comment: "새로운 코멘트",
    });
    getPrismaMock("group_member", "findMany").mockResolvedValue([
      { member_id: "leader-1" },
    ]);
    getPrismaMock("notification", "findFirst").mockResolvedValue({ id: "existing-notif" });

    const res = await patchGathering({ adminComment: "새로운 코멘트" });
    expect(res.status).toBe(200);

    expect(getPrismaMock("notification", "create")).not.toHaveBeenCalled();
    expect(mockedSendPushToMembers).not.toHaveBeenCalled();
  });
});
