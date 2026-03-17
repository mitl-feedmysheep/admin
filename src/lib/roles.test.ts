import { describe, it, expect } from "vitest";
import {
  CHURCH_ROLE_LEVELS,
  DEPARTMENT_ROLE_LEVELS,
  ROLE_LEVELS,
  hasPermissionOver,
  hasDepartmentPermissionOver,
  rolesAtOrAbove,
  canAccessAdminPortal,
  canAccessVisitPrayer,
} from "./roles";

describe("CHURCH_ROLE_LEVELS", () => {
  it("defines three church roles with ascending levels", () => {
    expect(CHURCH_ROLE_LEVELS.MEMBER).toBe(1);
    expect(CHURCH_ROLE_LEVELS.ADMIN).toBe(2);
    expect(CHURCH_ROLE_LEVELS.SUPER_ADMIN).toBe(3);
  });

  it("ROLE_LEVELS is an alias for CHURCH_ROLE_LEVELS", () => {
    expect(ROLE_LEVELS).toBe(CHURCH_ROLE_LEVELS);
  });
});

describe("DEPARTMENT_ROLE_LEVELS", () => {
  it("defines three department roles with ascending levels", () => {
    expect(DEPARTMENT_ROLE_LEVELS.MEMBER).toBe(1);
    expect(DEPARTMENT_ROLE_LEVELS.LEADER).toBe(2);
    expect(DEPARTMENT_ROLE_LEVELS.ADMIN).toBe(3);
  });
});

describe("hasPermissionOver (church)", () => {
  it("same role has permission over itself", () => {
    expect(hasPermissionOver("ADMIN", "ADMIN")).toBe(true);
    expect(hasPermissionOver("MEMBER", "MEMBER")).toBe(true);
  });

  it("higher role has permission over lower role", () => {
    expect(hasPermissionOver("SUPER_ADMIN", "ADMIN")).toBe(true);
    expect(hasPermissionOver("SUPER_ADMIN", "MEMBER")).toBe(true);
    expect(hasPermissionOver("ADMIN", "MEMBER")).toBe(true);
  });

  it("lower role does NOT have permission over higher role", () => {
    expect(hasPermissionOver("MEMBER", "ADMIN")).toBe(false);
    expect(hasPermissionOver("MEMBER", "SUPER_ADMIN")).toBe(false);
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

describe("hasDepartmentPermissionOver", () => {
  it("ADMIN has permission over LEADER and MEMBER", () => {
    expect(hasDepartmentPermissionOver("ADMIN", "LEADER")).toBe(true);
    expect(hasDepartmentPermissionOver("ADMIN", "MEMBER")).toBe(true);
  });

  it("LEADER has permission over MEMBER but not ADMIN", () => {
    expect(hasDepartmentPermissionOver("LEADER", "MEMBER")).toBe(true);
    expect(hasDepartmentPermissionOver("LEADER", "ADMIN")).toBe(false);
  });

  it("MEMBER has no permission over LEADER or ADMIN", () => {
    expect(hasDepartmentPermissionOver("MEMBER", "LEADER")).toBe(false);
    expect(hasDepartmentPermissionOver("MEMBER", "ADMIN")).toBe(false);
  });
});

describe("rolesAtOrAbove", () => {
  it("returns all church roles at or above MEMBER", () => {
    const result = rolesAtOrAbove("MEMBER");
    expect(result).toContain("MEMBER");
    expect(result).toContain("ADMIN");
    expect(result).toContain("SUPER_ADMIN");
    expect(result).toHaveLength(3);
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
    expect(result).toHaveLength(3);
  });
});

describe("canAccessAdminPortal", () => {
  it("church ADMIN+ can access", () => {
    expect(canAccessAdminPortal("ADMIN")).toBe(true);
    expect(canAccessAdminPortal("SUPER_ADMIN")).toBe(true);
  });

  it("church MEMBER alone cannot access", () => {
    expect(canAccessAdminPortal("MEMBER")).toBe(false);
  });

  it("church MEMBER with department LEADER+ can access", () => {
    expect(canAccessAdminPortal("MEMBER", "LEADER")).toBe(true);
    expect(canAccessAdminPortal("MEMBER", "ADMIN")).toBe(true);
  });

  it("church MEMBER with department MEMBER cannot access", () => {
    expect(canAccessAdminPortal("MEMBER", "MEMBER")).toBe(false);
  });
});

describe("canAccessVisitPrayer", () => {
  it("church SUPER_ADMIN can access", () => {
    expect(canAccessVisitPrayer("SUPER_ADMIN")).toBe(true);
  });

  it("church ADMIN alone cannot access", () => {
    expect(canAccessVisitPrayer("ADMIN")).toBe(false);
  });

  it("department ADMIN can access", () => {
    expect(canAccessVisitPrayer("MEMBER", "ADMIN")).toBe(true);
    expect(canAccessVisitPrayer("ADMIN", "ADMIN")).toBe(true);
  });

  it("department LEADER cannot access", () => {
    expect(canAccessVisitPrayer("MEMBER", "LEADER")).toBe(false);
  });
});
