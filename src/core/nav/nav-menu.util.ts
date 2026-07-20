export interface NavigationMenuDto {
  id: number;
  name: string | null;
  title: string;
  api_path: string;
  icon: string | null;
  parent_id: number;
  sort_order: number;
}

export interface NavMenuItem {
  id: string | number;
  title: string;
  route: string;
  icon: string;
  name?: string | null;
}

/** Normalize DB api_path values to Angular admin routes. */
export function toAdminRoute(apiPath: string): string {
  const trimmed = (apiPath ?? '').trim();
  if (!trimmed) {
    return '/admin';
  }

  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (withSlash.startsWith('/admin')) {
    return withSlash;
  }

  return `/admin${withSlash}`;
}

export function mapNavigationMenu(dto: NavigationMenuDto): NavMenuItem {
  return {
    id: dto.id,
    title: dto.title || titleFromName(dto.name),
    route: toAdminRoute(dto.api_path),
    icon: (dto.icon || 'menu').toLowerCase(),
    name: dto.name
  };
}

function titleFromName(name: string | null | undefined): string {
  if (!name) {
    return 'Untitled';
  }
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export const DASHBOARD_NAV_ITEM: NavMenuItem = {
  id: 'dashboard',
  title: 'Dashboard',
  route: '/admin/dashboard',
  icon: 'layout-dashboard',
  name: 'dashboard'
};
