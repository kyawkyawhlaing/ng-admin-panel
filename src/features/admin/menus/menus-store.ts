import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { MenusTable } from '../../../types/database';

export interface MenusState {
  menus: MenusTable[];
  filterText: string;
  pageIndex: number;
  pageSize: number;
  sorts: Array<{ field: keyof MenusTable; direction: 'asc' | 'desc' }>;
  isLoading: boolean;
  error: string | null;
}

const initialState: MenusState = {
  menus: [],
  filterText: '',
  pageIndex: 0,
  pageSize: 5,
  sorts: [],
  isLoading: false,
  error: null
};

export const MenusStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient)) => {
    const filteredMenus = computed(() => {
      let list = store.menus();
      const text = store.filterText().toLowerCase().trim();

      if (text) {
        list = list.filter(m => 
          (m.name && m.name.toLowerCase().includes(text)) ||
          m.api_path.toLowerCase().includes(text) ||
          m.description.toLowerCase().includes(text)
        );
      }
      return list;
    });

    const sortedMenus = computed(() => {
      const list = [...filteredMenus()];
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

    const pagedMenus = computed(() => {
      const list = sortedMenus();
      const start = store.pageIndex() * store.pageSize();
      return list.slice(start, start + store.pageSize());
    });

    const totalMenusCount = computed(() => filteredMenus().length);

    return {
      filteredMenus,
      sortedMenus,
      pagedMenus,
      totalMenusCount,

      setFilterText(text: string): void {
        patchState(store, { filterText: text, pageIndex: 0 });
      },

      setPage(index: number, size: number): void {
        patchState(store, { pageIndex: index, pageSize: size });
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
      },

      clearSorts(): void {
        patchState(store, { sorts: [] });
      },

      async loadMenus() {
        patchState(store, { isLoading: true, error: null });
        try {
          const menus = await lastValueFrom(http.get<MenusTable[]>('/api/menus'));
          patchState(store, { menus, isLoading: false, pageIndex: 0 });
        } catch (err: any) {
          patchState(store, { error: err.message, isLoading: false });
        }
      },

      async addMenu(menu: Omit<MenusTable, 'id'>) {
        patchState(store, { isLoading: true, error: null });
        try {
          await lastValueFrom(http.post('/api/menus', menu));
          const menus = await lastValueFrom(http.get<MenusTable[]>('/api/menus'));
          patchState(store, { menus, isLoading: false, pageIndex: 0 });
        } catch (err: any) {
          patchState(store, { error: err.message, isLoading: false });
        }
      },

      async editMenu(id: number, menu: Partial<MenusTable>) {
        patchState(store, { isLoading: true, error: null });
        try {
          await lastValueFrom(http.put(`/api/menus/${id}`, menu));
          const menus = await lastValueFrom(http.get<MenusTable[]>('/api/menus'));
          patchState(store, { menus, isLoading: false });
        } catch (err: any) {
          patchState(store, { error: err.message, isLoading: false });
        }
      }
    };
  })
);
