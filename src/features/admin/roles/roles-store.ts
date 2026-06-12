import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { RolesTable } from '../../../types/database';

export interface RolesState {
  roles: RolesTable[];
  filterText: string;
  pageIndex: number;
  pageSize: number;
  sorts: Array<{ field: keyof RolesTable; direction: 'asc' | 'desc' }>;
  isLoading: boolean;
  error: string | null;
}

const initialState: RolesState = {
  roles: [],
  filterText: '',
  pageIndex: 0,
  pageSize: 5,
  sorts: [],
  isLoading: false,
  error: null
};

export const RolesStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient)) => {
    // Computed filtering
    const filteredRoles = computed(() => {
      let list = store.roles();
      const text = store.filterText().toLowerCase().trim();

      if (text) {
        list = list.filter(r => 
          r.name.toLowerCase().includes(text) ||
          r.normalized_name.toLowerCase().includes(text)
        );
      }
      return list;
    });

    // Computed sorting
    const sortedRoles = computed(() => {
      const list = [...filteredRoles()];
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
    const pagedRoles = computed(() => {
      const list = sortedRoles();
      const start = store.pageIndex() * store.pageSize();
      return list.slice(start, start + store.pageSize());
    });

    const totalRolesCount = computed(() => filteredRoles().length);

    return {
      filteredRoles,
      sortedRoles,
      pagedRoles,
      totalRolesCount,

      setFilterText(text: string): void {
        patchState(store, { filterText: text, pageIndex: 0 });
      },

      setPage(index: number, size: number): void {
        patchState(store, { pageIndex: index, pageSize: size });
      },

      toggleSort(field: keyof RolesTable, multi: boolean = false): void {
        const current = store.sorts();
        const existing = current.find(s => s.field === field);
        let nextSorts: Array<{ field: keyof RolesTable; direction: 'asc' | 'desc' }> = [];

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

      async loadRoles() {
        patchState(store, { isLoading: true, error: null });
        try {
          const roles = await lastValueFrom(http.get<RolesTable[]>('/api/roles'));
          patchState(store, { roles, isLoading: false, pageIndex: 0 });
        } catch (err: any) {
          patchState(store, { error: err.message, isLoading: false });
        }
      },

      async addRole(role: Omit<RolesTable, 'id'>) {
        patchState(store, { isLoading: true, error: null });
        try {
          await lastValueFrom(http.post('/api/roles', role));
          // Reload
          const roles = await lastValueFrom(http.get<RolesTable[]>('/api/roles'));
          patchState(store, { roles, isLoading: false, pageIndex: 0 });
        } catch (err: any) {
          patchState(store, { error: err.message, isLoading: false });
        }
      },

      async editRole(id: number, role: Partial<RolesTable>) {
        patchState(store, { isLoading: true, error: null });
        try {
          await lastValueFrom(http.put(`/api/roles/${id}`, role));
          // Reload
          const roles = await lastValueFrom(http.get<RolesTable[]>('/api/roles'));
          patchState(store, { roles, isLoading: false });
        } catch (err: any) {
          patchState(store, { error: err.message, isLoading: false });
        }
      }
    };
  })
);
