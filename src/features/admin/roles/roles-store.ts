import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { ToastService } from '../../../shared/ui/toast.service';
import { createDebouncedTask, SEARCH_DEBOUNCE_MS } from '../../../shared/util/debounce';
import { RolesTable } from '../../../types/database';

export interface RolesState {
  roles: RolesTable[];
  totalRolesCount: number;
  filterText: string;
  pageIndex: number;
  pageSize: number;
  sorts: Array<{ field: keyof RolesTable; direction: 'asc' | 'desc' }>;
  isLoading: boolean;
  error: string | null;
}

const initialState: RolesState = {
  roles: [],
  totalRolesCount: 0,
  filterText: '',
  pageIndex: 0,
  pageSize: 5,
  sorts: [],
  isLoading: false,
  error: null
};

export const RolesStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient), toast = inject(ToastService)) => {
    const debouncedSearch = createDebouncedTask(SEARCH_DEBOUNCE_MS);

    const loadRoles = async (background: boolean = false) => {
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
          http.post<{ metadata: { totalCount: number }, items: RolesTable[] }>('/roles/list', payload)
        );

        patchState(store, { 
          roles: response.items, 
          totalRolesCount: response.metadata.totalCount,
          isLoading: false 
        });
      } catch (err: any) {
        const message = err?.error?.detail || err?.message || 'Failed to load roles';
        patchState(store, { error: message, isLoading: false });
      }
    };

    return {
      pagedRoles: computed(() => store.roles()),

      async setFilterText(text: string) {
        patchState(store, { filterText: text, pageIndex: 0 });
        debouncedSearch.schedule(() => loadRoles(true));
      },

      async setPage(index: number, size: number) {
        patchState(store, { pageIndex: index, pageSize: size });
        await loadRoles(true);
      },

      async toggleSort(field: keyof RolesTable, multi: boolean = false) {
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
        await loadRoles(true);
      },

      async clearSorts() {
        patchState(store, { sorts: [] });
        await loadRoles(true);
      },

      loadRoles,

      async addRole(role: any) {
        try {
          await lastValueFrom(http.post('/roles', role));
          toast.success('Role successfully created!');
          await loadRoles(true);
        } catch (err: any) {
          toast.error(`Failed to create role: ${err.message || 'Unknown error'}`);
          console.error('Error adding role:', err);
        }
      },

      async editRole(id: number, role: any) {
        try {
          await lastValueFrom(http.put(`/roles/${id}`, role));
          toast.success('Role successfully updated!');
          await loadRoles(true);
        } catch (err: any) {
          toast.error(`Failed to update role: ${err.message || 'Unknown error'}`);
          console.error('Error editing role:', err);
        }
      },

      async deleteRole(id: number): Promise<boolean> {
        try {
          await lastValueFrom(http.delete(`/roles/${id}`));
          toast.success('Role deleted');
          await loadRoles(true);
          return true;
        } catch (err: any) {
          toast.error(err?.error?.detail || err?.message || 'Failed to delete role');
          console.error('Error deleting role:', err);
          return false;
        }
      }
    };
  })
);
