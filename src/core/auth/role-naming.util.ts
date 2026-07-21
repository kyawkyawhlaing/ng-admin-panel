/** Custom roles must be uppercase and use the ROLE_ prefix (e.g. ROLE_EDITOR). */

export const ROLE_NAME_PREFIX = 'ROLE_';

export const ROLE_NAME_PATTERN = /^ROLE_[A-Z0-9]+(?:_[A-Z0-9]+)*$/;

export const ROLE_NAME_FORMAT_HINT =
  'Suffix after the locked ROLE_ prefix, e.g. EDITOR → ROLE_EDITOR';

export function normalizeRoleName(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase().replace(/\s+/g, '_');
}

/**
 * Always returns a value that starts with ROLE_.
 * Strips/rebuilds the prefix if the user tries to remove or alter it.
 */
export function ensureRoleNamePrefix(value: string | null | undefined): string {
  let normalized = normalizeRoleName(value);

  if (!normalized) {
    return ROLE_NAME_PREFIX;
  }

  // Collapse duplicated prefixes: ROLE_ROLE_X → ROLE_X
  while (normalized.startsWith(ROLE_NAME_PREFIX + 'ROLE_')) {
    normalized = ROLE_NAME_PREFIX + normalized.slice((ROLE_NAME_PREFIX + 'ROLE_').length);
  }

  if (normalized.startsWith(ROLE_NAME_PREFIX)) {
    return normalized;
  }

  // "ROLEEDITOR" / "ROLEEDITOR" without underscore → keep body after ROLE
  if (normalized.startsWith('ROLE')) {
    const rest = normalized.slice(4).replace(/^_+/, '');
    return ROLE_NAME_PREFIX + rest;
  }

  return ROLE_NAME_PREFIX + normalized.replace(/^_+/, '');
}

export function roleNameSuffix(value: string | null | undefined): string {
  const full = ensureRoleNamePrefix(value);
  return full.startsWith(ROLE_NAME_PREFIX) ? full.slice(ROLE_NAME_PREFIX.length) : full;
}

export function roleNameFromSuffix(suffix: string | null | undefined): string {
  return ensureRoleNamePrefix(ROLE_NAME_PREFIX + normalizeRoleName(suffix).replace(/^ROLE_/, ''));
}

export function isValidCustomRoleName(value: string | null | undefined): boolean {
  const normalized = ensureRoleNamePrefix(value);
  return ROLE_NAME_PATTERN.test(normalized);
}
