import { describe, it, expect, vi, beforeEach } from "vitest";
import { createToken, verifyToken } from "./auth";

describe("createToken", () => {
  const payload = {
    memberId: "member-123",
    memberName: "홍길동",
    churchId: "church-456",
    churchName: "테스트교회",
    role: "ADMIN",
  };

  it("returns a non-empty JWT string", async () => {
    const token = await createToken(payload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("produces different tokens for different payloads", async () => {
    const token1 = await createToken(payload);
    const token2 = await createToken({ ...payload, memberId: "member-999" });
    expect(token1).not.toBe(token2);
  });
});

describe("verifyToken", () => {
  const payload = {
    memberId: "member-123",
    memberName: "홍길동",
    churchId: "church-456",
    churchName: "테스트교회",
    role: "ADMIN",
  };

  it("returns payload for a valid token", async () => {
    const token = await createToken(payload);
    const result = await verifyToken(token);

    expect(result).not.toBeNull();
    expect(result!.memberId).toBe("member-123");
    expect(result!.memberName).toBe("홍길동");
    expect(result!.churchId).toBe("church-456");
    expect(result!.churchName).toBe("테스트교회");
    expect(result!.role).toBe("ADMIN");
  });

  it("returns payload with iat and exp claims", async () => {
    const token = await createToken(payload);
    const result = await verifyToken(token);

    expect(result!.iat).toBeDefined();
    expect(result!.exp).toBeDefined();
    expect(result!.exp).toBeGreaterThan(result!.iat);
  });

  it("returns null for an invalid token", async () => {
    const result = await verifyToken("invalid.token.string");
    expect(result).toBeNull();
  });

  it("returns null for an empty string", async () => {
    const result = await verifyToken("");
    expect(result).toBeNull();
  });

  it("returns null for a tampered token", async () => {
    const token = await createToken(payload);
    const tampered = token.slice(0, -5) + "XXXXX";
    const result = await verifyToken(tampered);
    expect(result).toBeNull();
  });
});

describe("getSession", () => {
  it("returns null when no cookie is set", async () => {
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    const { getSession } = await import("./auth");
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns payload when valid cookie is set", async () => {
    const token = await createToken({
      memberId: "m-1",
      memberName: "테스트",
      churchId: "c-1",
      churchName: "교회",
      role: "ADMIN",
    });

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: token }),
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    const { getSession } = await import("./auth");
    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session!.memberId).toBe("m-1");
  });

  it("returns null when cookie has invalid token", async () => {
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "bad-token" }),
      set: vi.fn(),
      delete: vi.fn(),
    } as never);

    const { getSession } = await import("./auth");
    const session = await getSession();
    expect(session).toBeNull();
  });
});
