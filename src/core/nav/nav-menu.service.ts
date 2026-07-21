import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthStore, AuthStoreType } from '../stores/auth-store';
import { AdminStore, AdminStoreType } from '../../features/admin/admin-store';
import {
  DASHBOARD_NAV_ITEM,
  mapNavigationMenu,
  type NavMenuItem,
  type NavigationMenuDto
} from '../nav/nav-menu.util';

@Injectable({ providedIn: 'root' })
export class NavMenuService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;
  private readonly adminStore = inject(AdminStore) as unknown as AdminStoreType;

  /** Full visible catalog (not permission-filtered). */
  private readonly catalog = signal<NavMenuItem[]>([]);
  private readonly loading = signal(false);
  private readonly loadError = signal<string | null>(null);

  readonly isLoading = this.loading.asReadonly();
  readonly error = this.loadError.asReadonly();

  /**
   * Prefer live RBAC mappings from admin-store when hydrated (assign + remove both update
   * userRoles/rolePermissions). Fall back to JWT claims before IAM screens load.
   */
  private readonly effectivePermissions = computed(() => {
    const userId = this.authStore.user()?.id;
    if (userId && this.adminStore.rbacHydrated()) {
      return this.adminStore.getPermissionCodesForUser(userId);
    }
    return this.authStore.permissions();
  });

  /** Sidebar items — updates when auth claims or live RBAC mappings change. */
  readonly menuItems = computed(() => {
    const permissions = this.effectivePermissions();
    const permitted = this.catalog().filter((item) => this.canAccess(item, permissions));
    return [DASHBOARD_NAV_ITEM, ...permitted];
  });

  async loadNavigation(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const rows = await firstValueFrom(
        this.http.get<NavigationMenuDto[]>('/navigation/sidebar')
      );
      this.catalog.set((rows ?? []).map(mapNavigationMenu));
    } catch {
      this.loadError.set('Failed to load navigation.');
      this.catalog.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private canAccess(item: NavMenuItem, permissions: string[]): boolean {
    const resource = item.resource?.trim();
    if (!resource) {
      return true;
    }

    const required = `${resource.toLowerCase()}_access`;
    return permissions.some((p) => p.toLowerCase() === required);
  }
}
