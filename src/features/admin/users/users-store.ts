import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { ToastService } from '../../../shared/ui/toast.service';
import { createDebouncedTask, SEARCH_DEBOUNCE_MS } from '../../../shared/util/debounce';
import { UsersTable } from '../../../types/database';

export interface UsersState {
  users: UsersTable[];
  totalUsersCount: number;
  filterText: string;
  lockoutFilter: 'all' | 'locked' | 'active';
  twoFactorFilter: 'all' | 'enabled' | 'disabled';
  pageIndex: number;
  pageSize: number;
  sorts: Array<{ field: keyof UsersTable; direction: 'asc' | 'desc' }>;
  isLoading: boolean;
}

const initialState: UsersState = {
  users: [],
  totalUsersCount: 0,
  filterText: '',
  lockoutFilter: 'all',
  twoFactorFilter: 'all',
  pageIndex: 0,
  pageSize: 5,
  sorts: [],
  isLoading: false
};

export const UsersStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient), toast = inject(ToastService)) => {
    const debouncedSearch = createDebouncedTask(SEARCH_DEBOUNCE_MS);

    const loadUsers = async (background: boolean = false) => {
      if (!background) {
        patchState(store, { isLoading: true });
      }
      try {
        const payload = {
          searchTerm: store.filterText() || null,
          lockoutFilter: store.lockoutFilter(),
          twoFactorFilter: store.twoFactorFilter(),
          sorts: store.sorts().map(s => ({ field: s.field, direction: s.direction })),
          pageNumber: store.pageIndex() + 1, // Backend uses 1-based index
          pageSize: store.pageSize()
        };

        const response = await lastValueFrom(
          http.post<{ metadata: { totalCount: number }, items: UsersTable[] }>('/users/list', payload)
        );

        patchState(store, { 
          users: response.items, 
          totalUsersCount: response.metadata.totalCount,
          isLoading: false
        });
      } catch (err) {
        patchState(store, { isLoading: false });
        console.error('Error loading users:', err);
      }
    };

    return {
      pagedUsers: computed(() => store.users()),

      async setFilterText(text: string) {
        patchState(store, { filterText: text, pageIndex: 0 });
        debouncedSearch.schedule(() => loadUsers(true));
      },

      async setLockoutFilter(filter: 'all' | 'locked' | 'active') {
        patchState(store, { lockoutFilter: filter, pageIndex: 0 });
        await loadUsers(true);
      },

      async setTwoFactorFilter(filter: 'all' | 'enabled' | 'disabled') {
        patchState(store, { twoFactorFilter: filter, pageIndex: 0 });
        await loadUsers(true);
      },

      async setPage(index: number, size: number) {
        patchState(store, { pageIndex: index, pageSize: size });
        await loadUsers(true);
      },

      async toggleSort(field: keyof UsersTable, multi: boolean = false) {
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
        await loadUsers(true);
      },

      async clearSorts() {
        patchState(store, { sorts: [], pageIndex: 0 });
        await loadUsers(true);
      },

      loadUsers,

      async addUser(user: any): Promise<boolean> {
        try {
          await lastValueFrom(http.post('/users', user));
          toast.success('User successfully created!');
          await loadUsers(true);
          return true;
        } catch (err: any) {
          toast.error(
            err?.error?.detail || err?.message || 'Failed to create user'
          );
          console.error('Error adding user:', err);
          return false;
        }
      },

      async editUser(id: string, user: any, newPassword?: string): Promise<boolean> {
        try {
          await lastValueFrom(http.put(`/users/${id}`, user));

          if (newPassword) {
            await lastValueFrom(
              http.put(`/users/${id}/password`, {
                current_password: '',
                new_password: newPassword
              })
            );
            toast.success('User and password successfully updated!');
          } else {
            toast.success('User successfully updated!');
          }

          await loadUsers(true);
          return true;
        } catch (err: any) {
          const validation = err?.error?.errors as Array<{ description?: string }> | undefined;
          const first = validation?.find((e) => e.description)?.description;
          toast.error(
            first || err?.error?.detail || err?.message || 'Failed to update user'
          );
          console.error('Error editing user:', err);
          return false;
        }
      },

      async toggleLockout(userId: string) {
        const user = store.users().find(u => u.id === userId);
        if (!user) return;

        try {
          await lastValueFrom(http.put(`/users/${userId}`, {
            is_locked_out: !user.is_locked_out
          }));
          await loadUsers(true);
          toast.success(user.is_locked_out ? 'User unlocked' : 'User locked');
        } catch (err: any) {
          toast.error(err?.error?.detail || err?.message || 'Failed to update account status');
          console.error('Error toggling lockout:', err);
        }
      },

      async toggleMfa(userId: string) {
        const user = store.users().find(u => u.id === userId);
        if (!user) return;

        try {
          await lastValueFrom(http.put(`/users/${userId}`, {
            two_factor_enabled: !user.two_factor_enabled
          }));
          await loadUsers(true);
          toast.success(user.two_factor_enabled ? 'MFA disabled' : 'MFA enabled');
        } catch (err: any) {
          toast.error(err?.error?.detail || err?.message || 'Failed to update MFA');
          console.error('Error toggling MFA:', err);
        }
      },

      async deleteUser(userId: string): Promise<boolean> {
        try {
          await lastValueFrom(http.delete(`/users/${userId}`));
          toast.success('User deleted');
          await loadUsers(true);
          return true;
        } catch (err: any) {
          toast.error(err?.error?.detail || err?.message || 'Failed to delete user');
          console.error('Error deleting user:', err);
          return false;
        }
      }
    };
  })
);
