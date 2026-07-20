/** Client-side JWT payload helpers. Signature is NOT verified — API remains authority of truth. */

export interface JwtClaims {
  sub?: string;
  email?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
  roles?: string | string[];
  role?: string | string[];
  resource_access?: string | unknown[];
  [key: string]: unknown;
}

export interface ParsedAccessToken {
  claims: JwtClaims;
  userId: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  expiresAtMs: number | null;
}

const MS_ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

export function decodeJwtPayload(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token: string, skewSeconds = 30): boolean {
  const claims = decodeJwtPayload(token);
  if (!claims?.exp) {
    return true;
  }
  return claims.exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export function parseAccessToken(token: string): ParsedAccessToken | null {
  const claims = decodeJwtPayload(token);
  if (!claims) {
    return null;
  }

  const roles = extractRoles(claims);
  const permissions = extractPermissions(claims);
  const email = typeof claims.email === 'string' ? claims.email : '';
  const userId = typeof claims.sub === 'string' ? claims.sub : '';

  return {
    claims,
    userId,
    email,
    name: email.includes('@') ? email.split('@')[0] : email || 'User',
    roles,
    permissions,
    expiresAtMs: typeof claims.exp === 'number' ? claims.exp * 1000 : null
  };
}

function extractRoles(claims: JwtClaims): string[] {
  const roles = new Set<string>();

  const push = (value: unknown) => {
    if (typeof value === 'string' && value) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          parsed.forEach((r) => typeof r === 'string' && roles.add(r));
          return;
        }
      } catch {
        /* plain string role */
      }
      roles.add(value);
    } else if (Array.isArray(value)) {
      value.forEach((r) => typeof r === 'string' && roles.add(r));
    }
  };

  push(claims.roles);
  push(claims.role);
  push(claims[MS_ROLE_CLAIM]);

  return [...roles];
}

function extractPermissions(claims: JwtClaims): string[] {
  const permissions = new Set<string>();
  let resourceAccess: unknown[] = [];

  const raw = claims.resource_access;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      resourceAccess = Array.isArray(parsed) ? parsed : [];
    } catch {
      resourceAccess = [];
    }
  } else if (Array.isArray(raw)) {
    resourceAccess = raw;
  }

  for (const entry of resourceAccess) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as { permissions?: unknown; Permissions?: unknown };
    const list = record.Permissions ?? record.permissions;
    if (Array.isArray(list)) {
      list.forEach((p) => typeof p === 'string' && permissions.add(p));
    }
  }

  return [...permissions];
}
