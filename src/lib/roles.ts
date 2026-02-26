/**
 * Church role hierarchy mirroring the backend ChurchRole enum.
 * When a new role is added, update ROLE_LEVELS here and the
 * backend enum in ChurchRole.java — everything else adapts automatically.
 */

export const ROLE_LEVELS: Record<string, number> = {
  MEMBER: 1,
  LEADER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function hasPermissionOver(
  currentRole: string,
  requiredRole: string,
): boolean {
  return (ROLE_LEVELS[currentRole] ?? 0) >= (ROLE_LEVELS[requiredRole] ?? 0);
}

export function rolesAtOrAbove(minRole: string): string[] {
  const minLevel = ROLE_LEVELS[minRole] ?? 0;
  return Object.entries(ROLE_LEVELS)
    .filter(([, level]) => level >= minLevel)
    .map(([role]) => role);
}
