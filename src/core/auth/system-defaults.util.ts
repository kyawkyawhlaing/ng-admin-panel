/** Built-in IAM defaults that cannot be removed from the console. */

export const SYSADMIN_ROLE_NAME = 'sysadmin';
export const SYSADMIN_NORMALIZED_NAME = 'SYSADMIN';
export const DEFAULT_ADMIN_EMAIL = 'systemadmin@default.com';

export const CORE_RESOURCES = ['users', 'roles', 'permissions', 'navigation'] as const;

export function isSysAdminRole(nameOrNormalized?: string | null): boolean {
  if (!nameOrNormalized) return false;
  const value = nameOrNormalized.trim().toUpperCase();
  return value === 'SYSADMIN' || value === 'ADMIN';
}

export function isCoreResource(resource?: string | null): boolean {
  if (!resource) return false;
  return (CORE_RESOURCES as readonly string[]).includes(resource.trim().toLowerCase());
}

export function isProtectedPermission(name?: string | null, resource?: string | null): boolean {
  if (isCoreResource(resource)) return true;
  if (!name) return false;
  const lower = name.trim().toLowerCase();
  return CORE_RESOURCES.some((core) => lower.startsWith(`${core}_`));
}

export function isProtectedNavigation(resource?: string | null, route?: string | null): boolean {
  if (isCoreResource(resource)) return true;
  if (!route) return false;
  const normalized = route.trim().toLowerCase().replace(/\/$/, '');
  return (
    normalized === '/admin/users' ||
    normalized === '/admin/roles' ||
    normalized === '/admin/permissions' ||
    normalized === '/admin/navigation'
  );
}

export function isProtectedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === DEFAULT_ADMIN_EMAIL;
}
