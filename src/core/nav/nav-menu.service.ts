import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  DASHBOARD_NAV_ITEM,
  mapNavigationMenu,
  type NavMenuItem,
  type NavigationMenuDto
} from '../nav/nav-menu.util';

@Injectable({ providedIn: 'root' })
export class NavMenuService {
  private readonly http = inject(HttpClient);

  private readonly remoteItems = signal<NavMenuItem[]>([]);
  private readonly loading = signal(false);
  private readonly loadError = signal<string | null>(null);

  readonly isLoading = this.loading.asReadonly();
  readonly error = this.loadError.asReadonly();

  readonly menuItems = computed(() => [DASHBOARD_NAV_ITEM, ...this.remoteItems()]);

  async loadNavigation(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const rows = await firstValueFrom(
        this.http.get<NavigationMenuDto[]>('/navigation/sidebar')
      );
      this.remoteItems.set((rows ?? []).map(mapNavigationMenu));
    } catch {
      this.loadError.set('Failed to load navigation.');
      this.remoteItems.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
