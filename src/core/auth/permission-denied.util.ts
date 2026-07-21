import { parsePermissionCode } from './permission.util';

/** Human-readable description of what a permission policy allows. */
export function describePermissionAction(permission: string): string {
  const parsed = parsePermissionCode(permission);
  if (!parsed) {
    return `use policy ${permission}`;
  }

  const resource = parsed.resource.replace(/_/g, ' ');
  switch (parsed.action) {
    case 'access':
      return `open the ${resource} page`;
    case 'view':
      return `view ${resource} data`;
    case 'create':
      return `create ${resource}`;
    case 'edit':
      return `edit ${resource}`;
    case 'delete':
      return `delete ${resource}`;
    default:
      return `${parsed.action} ${resource}`;
  }
}

export function permissionDeniedMessage(permission: string): string {
  return `You need the ${permission} permission to ${describePermissionAction(permission)}.`;
}

export function permissionDeniedMessageForAny(permissions: string[]): string {
  const unique = [...new Set(permissions.filter(Boolean))];
  if (unique.length === 0) {
    return 'You do not have permission to perform this action.';
  }
  if (unique.length === 1) {
    return permissionDeniedMessage(unique[0]);
  }
  const actions = unique.map(describePermissionAction).join('; ');
  return `You need one of these permissions: ${unique.join(', ')} (${actions}).`;
}

type RouteRule = { method: string; pattern: RegExp; permission: string };

const ROUTE_RULES: RouteRule[] = [
  { method: 'POST', pattern: /^\/roles\/list$/, permission: 'roles_view' },
  { method: 'GET', pattern: /^\/roles\/permissions-mapping$/, permission: 'roles_view' },
  { method: 'POST', pattern: /^\/roles$/, permission: 'roles_create' },
  { method: 'PUT', pattern: /^\/roles\/\d+$/, permission: 'roles_edit' },
  { method: 'DELETE', pattern: /^\/roles\/\d+$/, permission: 'roles_delete' },
  { method: 'POST', pattern: /^\/roles\/assign-permission$/, permission: 'roles_edit' },
  { method: 'POST', pattern: /^\/roles\/remove-permission$/, permission: 'roles_edit' },

  { method: 'POST', pattern: /^\/users\/list$/, permission: 'users_view' },
  { method: 'GET', pattern: /^\/users\/roles-mapping$/, permission: 'users_view' },
  { method: 'POST', pattern: /^\/users$/, permission: 'users_create' },
  { method: 'PUT', pattern: /^\/users\/[^/]+$/, permission: 'users_edit' },
  { method: 'DELETE', pattern: /^\/users\/[^/]+$/, permission: 'users_delete' },
  { method: 'POST', pattern: /^\/users\/assign-roles$/, permission: 'users_edit' },
  { method: 'POST', pattern: /^\/users\/remove-roles$/, permission: 'users_edit' },

  { method: 'POST', pattern: /^\/permissions\/list$/, permission: 'permissions_view' },
  { method: 'POST', pattern: /^\/permissions\/actions\/list$/, permission: 'permissions_view' },
  { method: 'POST', pattern: /^\/permissions$/, permission: 'permissions_create' },
  { method: 'PUT', pattern: /^\/permissions\/\d+$/, permission: 'permissions_edit' },
  { method: 'DELETE', pattern: /^\/permissions\/\d+$/, permission: 'permissions_delete' },

  { method: 'POST', pattern: /^\/navigation\/list$/, permission: 'navigation_view' },
  { method: 'POST', pattern: /^\/navigation$/, permission: 'navigation_create' },
  { method: 'PUT', pattern: /^\/navigation\/\d+$/, permission: 'navigation_edit' },
  { method: 'DELETE', pattern: /^\/navigation\/\d+$/, permission: 'navigation_delete' },
  { method: 'GET', pattern: /^\/navigation\/resources$/, permission: 'navigation_view' },
  { method: 'POST', pattern: /^\/navigation\/resources\/list$/, permission: 'navigation_view' },
  { method: 'POST', pattern: /^\/navigation\/resources\/assignable\/list$/, permission: 'navigation_view' },
  { method: 'POST', pattern: /^\/navigation\/resources$/, permission: 'resources_create' },
  { method: 'DELETE', pattern: /^\/navigation\/resources\/[^/]+$/, permission: 'resources_delete' }
];

function normalizeApiPath(url: string): string {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return new URL(url).pathname;
    }
  } catch {
    // fall through
  }
  return url.split('?')[0];
}

/** Infer the primary permission for a denied API call (fallback when BE detail is absent). */
export function inferRequiredPermission(method: string, url: string): string | null {
  const path = normalizeApiPath(url);
  const verb = method.toUpperCase();
  const rule = ROUTE_RULES.find((r) => r.method === verb && r.pattern.test(path));
  return rule?.permission ?? null;
}

export function resolveForbiddenMessage(
  method: string,
  url: string,
  errorBody?: { detail?: string; required_permissions?: string[] } | null
): string {
  if (errorBody?.detail?.trim()) {
    return errorBody.detail.trim();
  }

  if (errorBody?.required_permissions?.length) {
    return permissionDeniedMessageForAny(errorBody.required_permissions);
  }

  const inferred = inferRequiredPermission(method, url);
  if (inferred) {
    return permissionDeniedMessage(inferred);
  }

  return 'You do not have permission to perform this action.';
}
