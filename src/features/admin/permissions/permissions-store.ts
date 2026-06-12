import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { PermissionsTable, MenuStatusTable } from '../../../types/database';

export interface PermissionsState {
  permissions: PermissionsTable[];
  menuStatuses: MenuStatusTable[];
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
    // Computed filtering
    const filteredPermissions = computed(() => {
      let list = store.permissions();
      const text = store.filterText().toLowerCase().trim();

      if (text) {
        list = list.filter(p => 
          p.name.toLowerCase().includes(text) ||
          (p.resource && p.resource.toLowerCase().includes(text)) ||
          p.action.toLowerCase().includes(text)
        );
      }
      return list;
    });

    // Computed sorting
    const sortedPermissions = computed(() => {
      const list = [...filteredPermissions()];
      const sorts = store.sorts();
      
      if (sorts.length === 0) return list;

      list.sort((a, b) => {
        for (const sort of sorts) {
          const valA = a[sort.field];
          const valB = b[sort.field];

          if (valA === valB) continue;
          if (valA === null || valA === undefined) return sort.direction === 'asc' ? 1 : -1;
          if (valB === null || valB === undefined) return sort.direction === 'asc' ? -1 : 1;

          if (typeof valA === 'string' && typeof valB === 'string') {
            const comp = valA.localeCompare(valB);
            return sort.direction === 'asc' ? comp : -comp;
          }

          const comp = valA < valB ? -1 : 1;
          return sort.direction === 'asc' ? comp : -comp;
        }
        return 0;
      });

      return list;
    });

    // Computed paging
    const pagedPermissions = computed(() => {
      const list = sortedPermissions();
      const start = store.pageIndex() * store.pageSize();
      return list.slice(start, start + store.pageSize());
    });

    const totalPermissionsCount = computed(() => filteredPermissions().length);

    return {
      filteredPermissions,
      sortedPermissions,
      pagedPermissions,
      totalPermissionsCount,

      setFilterText(text: string): void {
        patchState(store, { filterText: text, pageIndex: 0 });
      },

      setPage(index: number, size: number): void {
        patchState(store, { pageIndex: index, pageSize: size });
      },

      toggleSort(field: keyof PermissionsTable, multi: boolean = false): void {
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
      },

      clearSorts(): void {
        patchState(store, { sorts: [] });
      },

      async loadPermissions() {
        patchState(store, { isLoading: true, error: null });
        try {
          const permissions = await lastValueFrom(http.get<PermissionsTable[]>('/api/permissions'));
          patchState(store, { permissions, isLoading: false, pageIndex: 0 });
        } catch (err: any) {
          patchState(store, { error: err.message, isLoading: false });
        }
      },

      async loadMenuStatuses() {
        try {
          const menuStatuses = await lastValueFrom(http.get<MenuStatusTable[]>('/api/menu_statuses'));
          patchState(store, { menuStatuses });
        } catch (err: any) {
          console.error('Failed to load menu statuses', err);
        }
      },

      async addPermission(permission: Omit<PermissionsTable, 'id'>) {
        patchState(store, { isLoading: true, error: null });
        try {
          await lastValueFrom(http.post('/api/permissions', permission));
          const permissions = await lastValueFrom(http.get<PermissionsTable[]>('/api/permissions'));
          patchState(store, { permissions, isLoading: false, pageIndex: 0 });
        } catch (err: any) {
          patchState(store, { error: err.message, isLoading: false });
        }
      },

      async editPermission(id: number, permission: Partial<PermissionsTable>) {
        patchState(store, { isLoading: true, error: null });
        try {
          await lastValueFrom(http.put(`/api/permissions/${id}`, permission));
          const permissions = await lastValueFrom(http.get<PermissionsTable[]>('/api/permissions'));
          patchState(store, { permissions, isLoading: false });
        } catch (err: any) {
          patchState(store, { error: err.message, isLoading: false });
        }
      }
    };
  })
);
