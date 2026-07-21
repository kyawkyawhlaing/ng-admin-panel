/** IAM resource keys must be lowercase (e.g. dashboard, help_desk). */

export const RESOURCE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

export const RESOURCE_NAME_FORMAT_HINT =
  'Lowercase letters, numbers, and underscores (e.g. dashboard, help_desk)';

export function normalizeResourceName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, '_');
}

export function isValidResourceName(value: string | null | undefined): boolean {
  const normalized = normalizeResourceName(value);
  return normalized.length > 0 && RESOURCE_NAME_PATTERN.test(normalized);
}
