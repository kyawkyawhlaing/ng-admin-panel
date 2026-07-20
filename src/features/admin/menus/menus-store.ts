import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { lastValueFrom } from 'rxjs';
import { MenusTable } from '../../../types/database';

export interface MenusState {
  menus: MenusTable[];
  totalMenusCount: number;
  filterText: string;
  pageIndex: number;
  pageSize: number;
  sorts: Array<{ field: keyof MenusTable; direction: 'asc' | 'desc' }>;
  isLoading: boolean;
  error: string | null;
}

const initialState: MenusState = {
  menus: [],
  totalMenusCount: 0,
  filterText: '',
  pageIndex: 0,
  pageSize: 5,
  sorts: [],
  isLoading: false,
  error: null
};

export const MenusStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient), snackBar = inject(MatSnackBar)) => {
    // We remove the local computed properties for sortedMenus and filteredMenus
    // since we're using server-side pagination now.
    const pagedMenus = computed(() => store.menus());
    const totalMenusCount = computed(() => store.totalMenusCount());

    return {
      pagedMenus,
      totalMenusCount,

      setFilterText(text: string): void {
        patchState(store, { filterText: text, pageIndex: 0 });
        this.loadMenus(true);
      },

      setPage(index: number, size: number): void {
        patchState(store, { pageIndex: index, pageSize: size });
        this.loadMenus(true);
      },

      toggleSort(field: keyof MenusTable, multi: boolean = false): void {
        const current = store.sorts();
        const existing = current.find(s => s.field === field);
        let nextSorts: Array<{ field: keyof MenusTable; direction: 'asc' | 'desc' }> = [];

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
        this.loadMenus(true);
      },

      clearSorts(): void {
        patchState(store, { sorts: [] });
        this.loadMenus(true);
      },

      async loadMenus(background: boolean = false) {
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
          const response = await lastValueFrom(http.post<{ items: MenusTable[], metadata: { totalCount: number } }>('https://localhost:5001/menus/list', payload));
          patchState(store, { menus: response.items, totalMenusCount: response.metadata.totalCount, isLoading: false });
        } catch (err: any) {
          patchState(store, { error: err.message, isLoading: false });
        }
      },

      async addMenu(menu: any) {
        try {
          await lastValueFrom(http.post('https://localhost:5001/menus', menu));
          snackBar.open('Menu successfully created!', 'Close', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'bottom' });
          await this.loadMenus(true);
        } catch (err: any) {
          snackBar.open(`Failed to create menu: ${err.message || 'Unknown error'}`, 'Close', { duration: 5000, horizontalPosition: 'right', verticalPosition: 'bottom', panelClass: ['text-red-500'] });
          console.error('Error adding menu:', err);
        }
      },

      async editMenu(id: number, menu: any) {
        try {
          await lastValueFrom(http.put(`https://localhost:5001/menus/${id}`, menu));
          snackBar.open('Menu successfully updated!', 'Close', { duration: 3000, horizontalPosition: 'right', verticalPosition: 'bottom' });
          await this.loadMenus(true);
        } catch (err: any) {
          snackBar.open(`Failed to update menu: ${err.message || 'Unknown error'}`, 'Close', { duration: 5000, horizontalPosition: 'right', verticalPosition: 'bottom', panelClass: ['text-red-500'] });
          console.error('Error editing menu:', err);
        }
      }
    };
  })
);
