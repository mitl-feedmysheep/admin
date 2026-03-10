import { describe, it, expect } from "vitest";
import { ROLE_LEVELS, hasPermissionOver, rolesAtOrAbove } from "./roles";

describe("ROLE_LEVELS", () => {
  it("defines four roles with ascending levels", () => {
    expect(ROLE_LEVELS.MEMBER).toBe(1);
    expect(ROLE_LEVELS.LEADER).toBe(2);
    expect(ROLE_LEVELS.ADMIN).toBe(3);
    expect(ROLE_LEVELS.SUPER_ADMIN).toBe(4);
  });
});

describe("hasPermissionOver", () => {
  it("same role has permission over itself", () => {
    expect(hasPermissionOver("ADMIN", "ADMIN")).toBe(true);
    expect(hasPermissionOver("MEMBER", "MEMBER")).toBe(true);
  });

  it("higher role has permission over lower role", () => {
    expect(hasPermissionOver("SUPER_ADMIN", "ADMIN")).toBe(true);
    expect(hasPermissionOver("SUPER_ADMIN", "LEADER")).toBe(true);
    expect(hasPermissionOver("SUPER_ADMIN", "MEMBER")).toBe(true);
    expect(hasPermissionOver("ADMIN", "LEADER")).toBe(true);
    expect(hasPermissionOver("ADMIN", "MEMBER")).toBe(true);
    expect(hasPermissionOver("LEADER", "MEMBER")).toBe(true);
  });

  it("lower role does NOT have permission over higher role", () => {
    expect(hasPermissionOver("MEMBER", "LEADER")).toBe(false);
    expect(hasPermissionOver("MEMBER", "ADMIN")).toBe(false);
    expect(hasPermissionOver("MEMBER", "SUPER_ADMIN")).toBe(false);
    expect(hasPermissionOver("LEADER", "ADMIN")).toBe(false);
    expect(hasPermissionOver("LEADER", "SUPER_ADMIN")).toBe(false);
    expect(hasPermissionOver("ADMIN", "SUPER_ADMIN")).toBe(false);
  });

  it("unknown role defaults to level 0 (no permission)", () => {
    expect(hasPermissionOver("UNKNOWN", "MEMBER")).toBe(false);
    expect(hasPermissionOver("", "MEMBER")).toBe(false);
  });

  it("any valid role has permission over unknown required role", () => {
    expect(hasPermissionOver("MEMBER", "UNKNOWN")).toBe(true);
    expect(hasPermissionOver("MEMBER", "")).toBe(true);
  });
});

describe("rolesAtOrAbove", () => {
  it("returns all roles at or above MEMBER", () => {
    const result = rolesAtOrAbove("MEMBER");
    expect(result).toContain("MEMBER");
    expect(result).toContain("LEADER");
    expect(result).toContain("ADMIN");
    expect(result).toContain("SUPER_ADMIN");
    expect(result).toHaveLength(4);
  });

  it("returns ADMIN and SUPER_ADMIN for ADMIN", () => {
    const result = rolesAtOrAbove("ADMIN");
    expect(result).toContain("ADMIN");
    expect(result).toContain("SUPER_ADMIN");
    expect(result).toHaveLength(2);
  });

  it("returns only SUPER_ADMIN for SUPER_ADMIN", () => {
    const result = rolesAtOrAbove("SUPER_ADMIN");
    expect(result).toEqual(["SUPER_ADMIN"]);
  });

  it("returns all roles for unknown minRole (level 0)", () => {
    const result = rolesAtOrAbove("UNKNOWN");
    expect(result).toHaveLength(4);
  });
});
