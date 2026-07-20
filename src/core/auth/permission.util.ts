/** Permission action semantics for IAM. */
export type PermissionAction = 'access' | 'view' | 'create' | 'edit' | 'delete';

export function permissionName(resource: string, action: PermissionAction): string {
  return `${resource}_${action}`;
}

export function parsePermissionCode(code: string): { resource: string; action: string } | null {
  const idx = code.lastIndexOf('_');
  if (idx <= 0 || idx >= code.length - 1) {
    return null;
  }
  return {
    resource: code.slice(0, idx),
    action: code.slice(idx + 1)
  };
}

export function isAccessAction(action: string | undefined | null): boolean {
  return (action ?? '').toLowerCase() === 'access';
}

/**
 * Enforce: non-access permissions require `{resource}_access` in the same selection.
 * Also drops orphaned non-access when access is absent.
 */
export function normalizeRolePermissionIds(
  selectedIds: string[],
  items: Array<{ id: string; resource?: string; action?: string; code?: string }>
): string[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const selected = new Set(selectedIds);

  const resourceHasAccess = new Map<string, boolean>();
  for (const id of selected) {
    const item = byId.get(id);
    if (!item) continue;
    const parsed = item.resource && item.action
      ? { resource: item.resource, action: item.action }
      : item.code
        ? parsePermissionCode(item.code)
        : null;
    if (!parsed) continue;
    if (isAccessAction(parsed.action)) {
      resourceHasAccess.set(parsed.resource, true);
    }
  }

  return selectedIds.filter((id) => {
    const item = byId.get(id);
    if (!item) return false;
    const parsed = item.resource && item.action
      ? { resource: item.resource, action: item.action }
      : item.code
        ? parsePermissionCode(item.code)
        : null;
    if (!parsed) return true;
    if (isAccessAction(parsed.action)) return true;
    return resourceHasAccess.get(parsed.resource) === true;
  });
}
