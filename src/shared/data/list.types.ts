export type SortDirection = 'asc' | 'desc';

export interface SortSpec {
  field: string;
  direction: SortDirection;
}

export interface ListQuery {
  searchTerm: string | null;
  sorts: SortSpec[];
  pageNumber: number;
  pageSize: number;
  [extra: string]: unknown;
}

export interface ListResult<T> {
  items: T[];
  metadata: { totalCount: number };
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface TransferItem {
  id: string;
  name: string;
  description?: string;
  /** Resource key for access-prerequisite grouping (e.g. users). */
  resource?: string;
  /** Action key (access | view | create | edit | delete). */
  action?: string;
}
