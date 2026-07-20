import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { lastValueFrom } from 'rxjs';
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
  withMethods((store, http = inject(HttpClient), snackBar = inject(MatSnackBar)) => {
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
          http.post<{ metadata: { totalCount: number }, items: RolesTable[] }>('https://localhost:5001/roles/list', payload)
        );

        patchState(store, { 
          roles: response.items, 
          totalRolesCount: response.metadata.totalCount,
          isLoading: false 
        });
      } catch (err: any) {
        patchState(store, { error: err.message, isLoading: false });
      }
    };

    return {
      pagedRoles: computed(() => store.roles()),
      totalRolesCount: computed(() => store.totalRolesCount()),

      async setFilterText(text: string) {
        patchState(store, { filterText: text, pageIndex: 0 });
        await loadRoles(true);
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
          await lastValueFrom(http.post('https://localhost:5001/roles', role));
          snackBar.open('Role successfully created!', 'Close', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'bottom' });
          await loadRoles(true);
        } catch (err: any) {
          snackBar.open(`Failed to create role: ${err.message || 'Unknown error'}`, 'Close', { duration: 5000, horizontalPosition: 'right', verticalPosition: 'bottom', panelClass: ['text-red-500'] });
          console.error('Error adding role:', err);
        }
      },

      async editRole(id: number, role: any) {
        try {
          await lastValueFrom(http.put(`https://localhost:5001/roles/${id}`, role));
          snackBar.open('Role successfully updated!', 'Close', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'bottom' });
          await loadRoles(true);
        } catch (err: any) {
          snackBar.open(`Failed to update role: ${err.message || 'Unknown error'}`, 'Close', { duration: 5000, horizontalPosition: 'right', verticalPosition: 'bottom', panelClass: ['text-red-500'] });
          console.error('Error editing role:', err);
        }
      }
    };
  })
);
