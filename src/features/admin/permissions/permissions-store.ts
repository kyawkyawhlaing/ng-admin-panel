import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { ToastService } from '../../../shared/ui/toast.service';
import { createDebouncedTask, SEARCH_DEBOUNCE_MS } from '../../../shared/util/debounce';
import { PermissionsTable, MenuStatusTable } from '../../../types/database';

export interface PermissionsState {
  permissions: PermissionsTable[];
  menuStatuses: MenuStatusTable[];
  totalPermissionsCount: number;
  filterText: string;
  pageIndex: number;
  pageSize: number;
  sorts: Array<{ field: keyof PermissionsTable; direction: 'asc' | 'desc' }>;
  isLoading: boolean;
  error: string | null;
}

const initialState: PermissionsState = {
  permissions: [],
  menuStatuses: [],
  totalPermissionsCount: 0,
  filterText: '',
  pageIndex: 0,
  pageSize: 5,
  sorts: [],
  isLoading: false,
  error: null
};

export const PermissionsStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient), toast = inject(ToastService)) => {
    const debouncedSearch = createDebouncedTask(SEARCH_DEBOUNCE_MS);

    const loadPermissions = async (background: boolean = false) => {
      if (!background) {
        patchState(store, { isLoading: true, error: null });
      } else {
        patchState(store, { error: null });
      }
      try {
        const payload = {
          searchTerm: store.filterText() || null,
          sorts: store.sorts().map(s => ({ field: s.field, direction: s.direction })),
          pageNumber: store.pageIndex() + 1, // Backend uses 1-based index
          pageSize: store.pageSize()
        };

        const response = await lastValueFrom(
          http.post<{ metadata: { totalCount: number }, items: PermissionsTable[] }>('/permissions/list', payload)
        );

        patchState(store, { 
          permissions: response.items, 
          totalPermissionsCount: response.metadata.totalCount,
          isLoading: false
        });
      } catch (err: any) {
        patchState(store, { error: err.message, isLoading: false });
        console.error('Error loading permissions:', err);
      }
    };

    return {
      pagedPermissions: computed(() => store.permissions()),

      async setFilterText(text: string) {
        patchState(store, { filterText: text, pageIndex: 0 });
        debouncedSearch.schedule(() => loadPermissions(true));
      },

      async setPage(index: number, size: number) {
        patchState(store, { pageIndex: index, pageSize: size });
        await loadPermissions(true);
      },

      async toggleSort(field: keyof PermissionsTable, multi: boolean = false) {
        const current = store.sorts();
        const existing = current.find(s => s.field === field);
        let nextSorts: Array<{ field: keyof PermissionsTable; direction: 'asc' | 'desc' }> = [];

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
        await loadPermissions(true);
      },

      async clearSorts() {
        patchState(store, { sorts: [], pageIndex: 0 });
        await loadPermissions(true);
      },

      loadPermissions,

      async loadMenuStatuses() {
        try {
          const menuStatuses = await lastValueFrom(http.get<MenuStatusTable[]>('/menus/statuses'));
          patchState(store, { menuStatuses });
        } catch (err: any) {
          console.error('Failed to load menu statuses', err);
        }
      },

      async addPermission(permission: any) {
        try {
          await lastValueFrom(http.post('/permissions', permission));
          toast.success('Permission successfully created!');
          await loadPermissions(true);
        } catch (err: any) {
          toast.error(`Failed to create permission: ${err.message || 'Unknown error'}`);
          console.error('Error adding permission:', err);
        }
      },

      async editPermission(id: number, permission: any) {
        try {
          await lastValueFrom(http.put(`/permissions/${id}`, permission));
          toast.success('Permission successfully updated!');
          await loadPermissions(true);
        } catch (err: any) {
          toast.error(`Failed to update permission: ${err.message || 'Unknown error'}`);
          console.error('Error editing permission:', err);
        }
      }
    };
  })
);
