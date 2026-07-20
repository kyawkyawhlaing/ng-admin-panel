export interface NavigationMenuDto {
  id: number;
  title: string;
  route: string;
  resource?: string | null;
  icon: string | null;
  parent_id: number;
  sort_order: number;
}

export interface NavMenuItem {
  id: string | number;
  title: string;
  route: string;
  icon: string;
  resource?: string | null;
}

/** Normalize DB route values to Angular admin routes. */
export function toAdminRoute(route: string): string {
  const trimmed = (route ?? '').trim();
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
    title: dto.title || 'Untitled',
    route: toAdminRoute(dto.route),
    icon: (dto.icon || 'layout').toLowerCase(),
    resource: dto.resource
  };
}

export const DASHBOARD_NAV_ITEM: NavMenuItem = {
  id: 'dashboard',
  title: 'Dashboard',
  route: '/admin/dashboard',
  icon: 'layout-dashboard',
  resource: 'dashboard'
};
