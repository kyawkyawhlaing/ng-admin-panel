import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
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
  withMethods((store, http = inject(HttpClient)) => {
    
    const loadPermissions = async () => {
      patchState(store, { isLoading: true, error: null });
      try {
        const payload = {
          searchTerm: store.filterText() || null,
          sorts: store.sorts().map(s => ({ field: s.field, direction: s.direction })),
          pageNumber: store.pageIndex() + 1, // Backend uses 1-based index
          pageSize: store.pageSize()
        };

        const response = await lastValueFrom(
          http.post<{ metadata: { totalCount: number }, items: PermissionsTable[] }>('https://localhost:5001/permissions/list', payload)
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
      totalPermissionsCount: computed(() => store.totalPermissionsCount()),

      async setFilterText(text: string) {
        patchState(store, { filterText: text, pageIndex: 0 });
        await loadPermissions();
      },

      async setPage(index: number, size: number) {
        patchState(store, { pageIndex: index, pageSize: size });
        await loadPermissions();
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
        await loadPermissions();
      },

      async clearSorts() {
        patchState(store, { sorts: [], pageIndex: 0 });
        await loadPermissions();
      },

      loadPermissions,

      async loadMenuStatuses() {
        try {
          const menuStatuses = await lastValueFrom(http.get<MenuStatusTable[]>('https://localhost:5001/menus/statuses'));
          patchState(store, { menuStatuses });
        } catch (err: any) {
          console.error('Failed to load menu statuses', err);
        }
      },

      async addPermission(permission: Omit<PermissionsTable, 'id'>) {
        patchState(store, { isLoading: true, error: null });
        try {
          await lastValueFrom(http.post('https://localhost:5001/permissions', permission));
          await loadPermissions();
        } catch (err: any) {
          patchState(store, { error: err.message, isLoading: false });
        }
      },

      async editPermission(id: number, permission: Partial<PermissionsTable>) {
        patchState(store, { isLoading: true, error: null });
        try {
          await lastValueFrom(http.put(`https://localhost:5001/permissions/${id}`, permission));
          await loadPermissions();
        } catch (err: any) {
          patchState(store, { error: err.message, isLoading: false });
        }
      }
    };
  })
);
