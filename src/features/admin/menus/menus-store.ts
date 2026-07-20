import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { ToastService } from '../../../shared/ui/toast.service';
import { createDebouncedTask, SEARCH_DEBOUNCE_MS } from '../../../shared/util/debounce';
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
  withMethods((store, http = inject(HttpClient), toast = inject(ToastService)) => {
    const debouncedSearch = createDebouncedTask(SEARCH_DEBOUNCE_MS);

    const loadMenus = async (background: boolean = false) => {
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
          http.post<{ items: MenusTable[]; metadata: { totalCount: number } }>('/menus/list', payload)
        );
        patchState(store, {
          menus: response.items,
          totalMenusCount: response.metadata.totalCount,
          isLoading: false
        });
      } catch (err: any) {
        patchState(store, { error: err.message, isLoading: false });
      }
    };

    return {
      pagedMenus: computed(() => store.menus()),

      setFilterText(text: string): void {
        patchState(store, { filterText: text, pageIndex: 0 });
        debouncedSearch.schedule(() => loadMenus(true));
      },

      setPage(index: number, size: number): void {
        patchState(store, { pageIndex: index, pageSize: size });
        void loadMenus(true);
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
        void loadMenus(true);
      },

      clearSorts(): void {
        patchState(store, { sorts: [] });
        void loadMenus(true);
      },

      loadMenus,

      async addMenu(menu: any) {
        try {
          await lastValueFrom(http.post('/menus', menu));
          toast.success('Menu successfully created!');
          await loadMenus(true);
        } catch (err: any) {
          toast.error(`Failed to create menu: ${err.message || 'Unknown error'}`);
          console.error('Error adding menu:', err);
        }
      },

      async editMenu(id: number, menu: any) {
        try {
          await lastValueFrom(http.put(`/menus/${id}`, menu));
          toast.success('Menu successfully updated!');
          await loadMenus(true);
        } catch (err: any) {
          toast.error(`Failed to update menu: ${err.message || 'Unknown error'}`);
          console.error('Error editing menu:', err);
        }
      }
    };
  })
);
