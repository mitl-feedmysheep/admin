/**
 * Church role hierarchy mirroring the backend ChurchRole enum.
 * LEADER removed — now handled at department level.
 */

export const CHURCH_ROLE_LEVELS: Record<string, number> = {
  MEMBER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

/**
 * Department role hierarchy mirroring the backend DepartmentRole enum.
 */
export const DEPARTMENT_ROLE_LEVELS: Record<string, number> = {
  MEMBER: 1,
  LEADER: 2,
  ADMIN: 3,
};

// Legacy alias — existing code uses ROLE_LEVELS for church roles
export const ROLE_LEVELS = CHURCH_ROLE_LEVELS;

export function hasPermissionOver(
  currentRole: string,
  requiredRole: string,
): boolean {
  return (CHURCH_ROLE_LEVELS[currentRole] ?? 0) >= (CHURCH_ROLE_LEVELS[requiredRole] ?? 0);
}

export function hasDepartmentPermissionOver(
  currentRole: string,
  requiredRole: string,
): boolean {
  return (DEPARTMENT_ROLE_LEVELS[currentRole] ?? 0) >= (DEPARTMENT_ROLE_LEVELS[requiredRole] ?? 0);
}

export function rolesAtOrAbove(minRole: string): string[] {
  const minLevel = CHURCH_ROLE_LEVELS[minRole] ?? 0;
  return Object.entries(CHURCH_ROLE_LEVELS)
    .filter(([, level]) => level >= minLevel)
    .map(([role]) => role);
}

/**
 * Admin 포털 접근 가능 여부 체크
 * dept LEADER+ OR church ADMIN+
 */
export function canAccessAdminPortal(
  churchRole: string,
  departmentRole?: string,
): boolean {
  if (hasPermissionOver(churchRole, "ADMIN")) return true;
  if (departmentRole && hasDepartmentPermissionOver(departmentRole, "LEADER")) return true;
  return false;
}

/**
 * 심방/기도제목 관리 접근 가능 여부 체크
 * dept ADMIN+ OR church SUPER_ADMIN
 */
export function canAccessVisitPrayer(
  churchRole: string,
  departmentRole?: string,
): boolean {
  if (churchRole === "SUPER_ADMIN") return true;
  if (departmentRole && hasDepartmentPermissionOver(departmentRole, "ADMIN")) return true;
  return false;
}
