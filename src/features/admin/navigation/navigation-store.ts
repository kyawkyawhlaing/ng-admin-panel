import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { ToastService } from '../../../shared/ui/toast.service';
import { createDebouncedTask, SEARCH_DEBOUNCE_MS } from '../../../shared/util/debounce';
import { NavigationItemTable } from '../../../types/database';
import { NavMenuService } from '../../../core/nav/nav-menu.service';
import { isProtectedNavigation } from '../../../core/auth/system-defaults.util';

export interface NavigationState {
  items: NavigationItemTable[];
  totalCount: number;
  filterText: string;
  pageIndex: number;
  pageSize: number;
  sorts: Array<{ field: keyof NavigationItemTable; direction: 'asc' | 'desc' }>;
  isLoading: boolean;
  error: string | null;
}

const initialState: NavigationState = {
  items: [],
  totalCount: 0,
  filterText: '',
  pageIndex: 0,
  pageSize: 5,
  sorts: [],
  isLoading: false,
  error: null
};

export const NavigationStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient), toast = inject(ToastService), navMenu = inject(NavMenuService)) => {
    const debouncedSearch = createDebouncedTask(SEARCH_DEBOUNCE_MS);

    const loadItems = async (background: boolean = false) => {
      if (!background) {
        patchState(store, { isLoading: true, error: null });
      } else {
        patchState(store, { error: null });
      }
      try {
        const payload = {
          searchTerm: store.filterText() || null,
          sorts: store.sorts().map(s => ({ field: s.field, direction: s.direction })),
          pageNumber: store.pageIndex() + 1,
          pageSize: store.pageSize()
        };
        const response = await lastValueFrom(
          http.post<{ items: NavigationItemTable[]; metadata: { totalCount: number } }>('/navigation/list', payload)
        );
        patchState(store, {
          items: response.items,
          totalCount: response.metadata.totalCount,
          isLoading: false
        });
      } catch (err: any) {
        patchState(store, { error: err.message, isLoading: false });
      }
    };

    const refreshSidebar = async () => {
      await navMenu.loadNavigation();
    };

    return {
      pagedItems: computed(() => store.items()),

      setFilterText(text: string): void {
        patchState(store, { filterText: text, pageIndex: 0 });
        debouncedSearch.schedule(() => loadItems(true));
      },

      setPage(index: number, size: number): void {
        patchState(store, { pageIndex: index, pageSize: size });
        void loadItems(true);
      },

      toggleSort(field: keyof NavigationItemTable, multi: boolean = false): void {
        const current = store.sorts();
        const existing = current.find(s => s.field === field);
        let nextSorts: Array<{ field: keyof NavigationItemTable; direction: 'asc' | 'desc' }> = [];

        if (existing) {
          if (existing.direction === 'asc') {
            const updated = current.map(s => s.field === field ? { ...s, direction: 'desc' as const } : s);
            nextSorts = multi ? updated : [{ field, direction: 'desc' }];
          } else {
            const updated = current.filter(s => s.field !== field);
            nextSorts = multi ? updated : [];
          }
        } else {
          nextSorts = multi ? [...current, { field, direction: 'asc' as const }] : [{ field, direction: 'asc' }];
        }

        patchState(store, { sorts: nextSorts, pageIndex: 0 });
        void loadItems(true);
      },

      clearSorts(): void {
        patchState(store, { sorts: [] });
        void loadItems(true);
      },

      loadItems,

      async addItem(item: Partial<NavigationItemTable>) {
        try {
          await lastValueFrom(http.post('/navigation', item));
          toast.success('Navigation item successfully created!');
          await loadItems(true);
          await refreshSidebar();
        } catch (err: any) {
          toast.error(`Failed to create navigation item: ${err.message || 'Unknown error'}`);
          console.error('Error adding navigation item:', err);
        }
      },

      async editItem(id: number, item: Partial<NavigationItemTable>) {
        try {
          await lastValueFrom(http.put(`/navigation/${id}`, item));
          toast.success('Navigation item successfully updated!');
          await loadItems(true);
          await refreshSidebar();
        } catch (err: any) {
          toast.error(`Failed to update navigation item: ${err.message || 'Unknown error'}`);
          console.error('Error editing navigation item:', err);
        }
      },

      async toggleActive(id: number): Promise<void> {
        const item = store.items().find((i) => i.id === id);
        if (!item || isProtectedNavigation(item.resource, item.route)) return;

        try {
          await lastValueFrom(
            http.put(`/navigation/${id}`, {
              title: item.title,
              route: item.route,
              resource: item.resource,
              icon: item.icon,
              description: item.description,
              parent_id: item.parent_id,
              sort_order: item.sort_order,
              is_active: !item.is_active,
              is_visible: item.is_visible
            })
          );
          await loadItems(true);
          await refreshSidebar();
          toast.success(item.is_active ? 'Item deactivated' : 'Item activated');
        } catch (err: any) {
          toast.error(err?.error?.detail || err?.message || 'Failed to update active status');
          console.error('Error toggling active:', err);
        }
      },

      async toggleVisible(id: number): Promise<void> {
        const item = store.items().find((i) => i.id === id);
        if (!item || isProtectedNavigation(item.resource, item.route)) return;

        try {
          await lastValueFrom(
            http.put(`/navigation/${id}`, {
              title: item.title,
              route: item.route,
              resource: item.resource,
              icon: item.icon,
              description: item.description,
              parent_id: item.parent_id,
              sort_order: item.sort_order,
              is_active: item.is_active,
              is_visible: !item.is_visible
            })
          );
          await loadItems(true);
          await refreshSidebar();
          toast.success(item.is_visible ? 'Hidden from sidebar' : 'Visible in sidebar');
        } catch (err: any) {
          toast.error(err?.error?.detail || err?.message || 'Failed to update sidebar visibility');
          console.error('Error toggling visibility:', err);
        }
      },

      async deleteItem(id: number): Promise<boolean> {
        try {
          await lastValueFrom(http.delete(`/navigation/${id}`));
          toast.success('Navigation item deleted');
          await loadItems(true);
          await refreshSidebar();
          return true;
        } catch (err: any) {
          toast.error(err?.error?.detail || err?.message || 'Failed to delete navigation item');
          console.error('Error deleting navigation item:', err);
          return false;
        }
      }
    };
  })
);
