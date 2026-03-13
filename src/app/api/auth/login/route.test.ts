import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getPrismaMock, resetPrismaMocks } from "@/__tests__/setup";

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
  compare: vi.fn(),
}));

import bcrypt from "bcryptjs";
import { POST } from "./route";

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function loginRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3001/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST(loginRequest({ password: "1234" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(loginRequest({ email: "test@test.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when member does not exist", async () => {
    getPrismaMock("member", "findFirst").mockResolvedValue(null);

    const res = await POST(
      loginRequest({ email: "no@exist.com", password: "1234" })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("존재하지 않는");
  });

  it("returns 401 when password is incorrect", async () => {
    getPrismaMock("member", "findFirst").mockResolvedValue({
      id: "m-1",
      email: "test@test.com",
      password: "$2a$10$hashedpassword",
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const res = await POST(
      loginRequest({ email: "test@test.com", password: "wrong" })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("비밀번호");
  });

  it("returns 403 when member has no ADMIN churches and no dept LEADER roles", async () => {
    getPrismaMock("member", "findFirst").mockResolvedValue({
      id: "m-1",
      email: "test@test.com",
      password: "$2a$10$hashedpassword",
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    getPrismaMock("church_member", "findMany").mockResolvedValue([
      { church_id: "c-1", church: { id: "c-1", name: "교회" }, role: "MEMBER" },
    ]);
    // No department LEADER+ roles
    getPrismaMock("department_member", "findMany").mockResolvedValue([]);

    const res = await POST(
      loginRequest({ email: "test@test.com", password: "correct" })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("관리자 권한");
  });

  it("returns churches list on successful login", async () => {
    getPrismaMock("member", "findFirst").mockResolvedValue({
      id: "m-1",
      name: "홍길동",
      email: "test@test.com",
      password: "$2a$10$hashedpassword",
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    getPrismaMock("church_member", "findMany").mockResolvedValue([
      {
        church_id: "c-1",
        church: { id: "c-1", name: "제일교회" },
        role: "ADMIN",
      },
      {
        church_id: "c-2",
        church: { id: "c-2", name: "은혜교회" },
        role: "SUPER_ADMIN",
      },
    ]);
    // No department LEADER+ roles (not needed since church roles suffice)
    getPrismaMock("department_member", "findMany").mockResolvedValue([]);

    const res = await POST(
      loginRequest({ email: "test@test.com", password: "correct" })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.memberId).toBe("m-1");
    expect(body.memberName).toBe("홍길동");
    expect(body.churches).toHaveLength(2);
    expect(body.churches[0]).toEqual({
      churchId: "c-1",
      churchName: "제일교회",
      role: "ADMIN",
    });
  });
});
