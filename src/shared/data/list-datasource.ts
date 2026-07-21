import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ListQuery, ListResult } from './list.types';

@Injectable({ providedIn: 'root' })
export class ListDataSource {
  private readonly http = inject(HttpClient);

  async fetch<T>(endpoint: string, query: Partial<ListQuery> = {}): Promise<ListResult<T>> {
    const payload: ListQuery = {
      searchTerm: query.searchTerm ?? null,
      sorts: query.sorts ?? [],
      pageNumber: query.pageNumber ?? 1,
      pageSize: query.pageSize ?? 20,
      ...query
    };

    return lastValueFrom(this.http.post<ListResult<T>>(endpoint, payload));
  }

  async searchOptions(
    endpoint: string,
    searchTerm: string,
    mapItem: (item: any) => { value: string; label: string; description?: string },
    pageSize = 20,
    extra: Partial<ListQuery> = {}
  ): Promise<Array<{ value: string; label: string; description?: string }>> {
    const result = await this.fetch<any>(endpoint, {
      searchTerm: searchTerm || null,
      pageNumber: 1,
      pageSize,
      ...extra
    });
    let items = result.items;
    if (extra['exclude_system_defaults'] === true) {
      items = items.filter((item: { system_default?: boolean }) => !item.system_default);
    }
    return items.map(mapItem);
  }
}
