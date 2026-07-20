import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  withMethods((store, http = inject(HttpClient), snackBar = inject(MatSnackBar)) => {
    
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
        await loadPermissions(true);
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
          const menuStatuses = await lastValueFrom(http.get<MenuStatusTable[]>('https://localhost:5001/menus/statuses'));
          patchState(store, { menuStatuses });
        } catch (err: any) {
          console.error('Failed to load menu statuses', err);
        }
      },

      async addPermission(permission: any) {
        try {
          await lastValueFrom(http.post('https://localhost:5001/permissions', permission));
          snackBar.open('Permission successfully created!', 'Close', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'bottom' });
          await loadPermissions(true);
        } catch (err: any) {
          snackBar.open(`Failed to create permission: ${err.message || 'Unknown error'}`, 'Close', { duration: 5000, horizontalPosition: 'right', verticalPosition: 'bottom', panelClass: ['text-red-500'] });
          console.error('Error adding permission:', err);
        }
      },

      async editPermission(id: number, permission: any) {
        try {
          await lastValueFrom(http.put(`https://localhost:5001/permissions/${id}`, permission));
          snackBar.open('Permission successfully updated!', 'Close', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'bottom' });
          await loadPermissions(true);
        } catch (err: any) {
          snackBar.open(`Failed to update permission: ${err.message || 'Unknown error'}`, 'Close', { duration: 5000, horizontalPosition: 'right', verticalPosition: 'bottom', panelClass: ['text-red-500'] });
          console.error('Error editing permission:', err);
        }
      }
    };
  })
);
