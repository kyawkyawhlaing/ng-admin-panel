import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { ToastService } from '../../../shared/ui/toast.service';
import { createDebouncedTask, SEARCH_DEBOUNCE_MS } from '../../../shared/util/debounce';
import { ResourceTable } from '../../../types/database';

export interface ResourcesState {
  resources: ResourceTable[];
  totalResourcesCount: number;
  filterText: string;
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: ResourcesState = {
  resources: [],
  totalResourcesCount: 0,
  filterText: '',
  pageIndex: 0,
  pageSize: 5,
  isLoading: false,
  error: null
};

export const ResourcesStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient), toast = inject(ToastService)) => {
    const debouncedSearch = createDebouncedTask(SEARCH_DEBOUNCE_MS);

    const loadResources = async (background: boolean = false) => {
      if (!background) {
        patchState(store, { isLoading: true, error: null });
      } else {
        patchState(store, { error: null });
      }
      try {
        const payload = {
          searchTerm: store.filterText() || null,
          pageNumber: store.pageIndex() + 1,
          pageSize: store.pageSize()
        };

        const response = await lastValueFrom(
          http.post<{ metadata: { totalCount: number }; items: ResourceTable[] }>(
            '/navigation/resources/list',
            payload
          )
        );

        patchState(store, {
          resources: response.items,
          totalResourcesCount: response.metadata.totalCount,
          isLoading: false
        });
      } catch (err: any) {
        patchState(store, { error: err.message, isLoading: false });
      }
    };

    return {
      pagedResources: computed(() => store.resources()),

      async setFilterText(text: string) {
        patchState(store, { filterText: text, pageIndex: 0 });
        debouncedSearch.schedule(() => loadResources(true));
      },

      async setPage(index: number, size: number) {
        patchState(store, { pageIndex: index, pageSize: size });
        await loadResources(true);
      },

      loadResources,

      async addResource(name: string): Promise<boolean> {
        try {
          await lastValueFrom(http.post('/navigation/resources', { name }));
          toast.success('Resource successfully created!');
          await loadResources(true);
          return true;
        } catch (err: any) {
          toast.error(err?.error?.detail || err?.message || 'Failed to create resource');
          console.error('Error adding resource:', err);
          return false;
        }
      },

      async deleteResource(name: string): Promise<boolean> {
        try {
          await lastValueFrom(http.delete(`/navigation/resources/${encodeURIComponent(name)}`));
          toast.success('Resource deleted');
          await loadResources(true);
          return true;
        } catch (err: any) {
          toast.error(err?.error?.detail || err?.message || 'Failed to delete resource');
          console.error('Error deleting resource:', err);
          return false;
        }
      }
    };
  })
);
