import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { UsersTable } from '../../../types/database';

export interface UsersState {
  users: UsersTable[];
  filterText: string;
  lockoutFilter: 'all' | 'locked' | 'active';
  twoFactorFilter: 'all' | 'enabled' | 'disabled';
  pageIndex: number;
  pageSize: number;
  sorts: Array<{ field: keyof UsersTable; direction: 'asc' | 'desc' }>;
}

const initialUsers: UsersTable[] = [];

const initialState: UsersState = {
  users: initialUsers,
  filterText: '',
  lockoutFilter: 'all',
  twoFactorFilter: 'all',
  pageIndex: 0,
  pageSize: 5,
  sorts: []
};

export const UsersStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient)) => {
    // Computed filtering
    const filteredUsers = computed(() => {
      let list = store.users();
      const text = store.filterText().toLowerCase().trim();
      const lockout = store.lockoutFilter();
      const twoFa = store.twoFactorFilter();

      if (text) {
        list = list.filter(u => 
          u.display_name.toLowerCase().includes(text) ||
          u.email.toLowerCase().includes(text) ||
          u.first_name.toLowerCase().includes(text) ||
          u.last_name.toLowerCase().includes(text)
        );
      }

      if (lockout === 'locked') {
        list = list.filter(u => u.is_locked_out);
      } else if (lockout === 'active') {
        list = list.filter(u => !u.is_locked_out);
      }

      if (twoFa === 'enabled') {
        list = list.filter(u => u.two_factor_enabled);
      } else if (twoFa === 'disabled') {
        list = list.filter(u => !u.two_factor_enabled);
      }

      return list;
    });

    // Computed sorting (handles multi-column sorting)
    const sortedUsers = computed(() => {
      const list = [...filteredUsers()];
      const sorts = store.sorts();
      
      if (sorts.length === 0) return list;

      list.sort((a, b) => {
        for (const sort of sorts) {
          const valA = a[sort.field];
          const valB = b[sort.field];

          if (valA === valB) continue;
          if (valA === null || valA === undefined) return sort.direction === 'asc' ? 1 : -1;
          if (valB === null || valB === undefined) return sort.direction === 'asc' ? -1 : 1;

          // String comparison
          if (typeof valA === 'string' && typeof valB === 'string') {
            const comp = valA.localeCompare(valB);
            return sort.direction === 'asc' ? comp : -comp;
          }

          // Date comparison
          if (valA instanceof Date && valB instanceof Date) {
            const comp = valA.getTime() - valB.getTime();
            return sort.direction === 'asc' ? comp : -comp;
          }

          // General type comparison
          const comp = valA < valB ? -1 : 1;
          return sort.direction === 'asc' ? comp : -comp;
        }
        return 0;
      });

      return list;
    });

    // Computed paging
    const pagedUsers = computed(() => {
      const list = sortedUsers();
      const start = store.pageIndex() * store.pageSize();
      return list.slice(start, start + store.pageSize());
    });

    const totalUsersCount = computed(() => filteredUsers().length);

    return {
      filteredUsers,
      sortedUsers,
      pagedUsers,
      totalUsersCount,

      setFilterText(text: string): void {
        patchState(store, { filterText: text, pageIndex: 0 });
      },

      setLockoutFilter(filter: 'all' | 'locked' | 'active'): void {
        patchState(store, { lockoutFilter: filter, pageIndex: 0 });
      },

      setTwoFactorFilter(filter: 'all' | 'enabled' | 'disabled'): void {
        patchState(store, { twoFactorFilter: filter, pageIndex: 0 });
      },

      setPage(index: number, size: number): void {
        patchState(store, { pageIndex: index, pageSize: size });
      },

      toggleSort(field: keyof UsersTable, multi: boolean = false): void {
        const current = store.sorts();
        const existing = current.find(s => s.field === field);
        let nextSorts: Array<{ field: keyof UsersTable; direction: 'asc' | 'desc' }> = [];

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

      async loadUsers() {
        try {
          const users = await lastValueFrom(http.get<UsersTable[]>('/api/users'));
          patchState(store, { users, pageIndex: 0 });
        } catch (err) {
          console.error('Error loading users:', err);
        }
      },

      async addUser(user: Omit<UsersTable, 'id' | 'password_hash' | 'password_salt' | 'created_by' | 'created_at' | 'updated_by' | 'last_updated_at' | 'refresh_token' | 'refresh_token_expiry_time' | 'access_failed_count' | 'is_locked_out' | 'lockout_end'> & { password_clear: string }) {
        try {
          await lastValueFrom(http.post('/api/users', { ...user, password: user.password_clear }));
          // Reload users
          const users = await lastValueFrom(http.get<UsersTable[]>('/api/users'));
          patchState(store, { users, pageIndex: 0 });
        } catch (err) {
          console.error('Error adding user:', err);
        }
      },

      async editUser(id: string, user: Partial<UsersTable> & { password_clear?: string }) {
        try {
          const payload = { ...user };
          if (user.password_clear) {
             (payload as any).password = user.password_clear;
          }
          await lastValueFrom(http.put(`/api/users/${id}`, payload));
          // Reload users
          const users = await lastValueFrom(http.get<UsersTable[]>('/api/users'));
          patchState(store, { users });
        } catch (err) {
          console.error('Error editing user:', err);
        }
      },

      async toggleLockout(userId: string) {
        // Implement api/users/:id/lockout if needed. For now just update locally.
        const updated = store.users().map(u => {
          if (u.id === userId) {
            const nextLockedState = !u.is_locked_out;
            return {
              ...u,
              is_locked_out: nextLockedState,
              lockout_end: nextLockedState ? new Date(Date.now() + 30 * 60 * 1000) : null, // 30 min lock
              last_updated_at: new Date()
            };
          }
          return u;
        });
        patchState(store, { users: updated });
      }
    };
  })
);
