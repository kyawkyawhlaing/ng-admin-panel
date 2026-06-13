import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
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
}

const initialState: UsersState = {
  users: [],
  totalUsersCount: 0,
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
    
    const loadUsers = async () => {
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
          http.post<{ metadata: { totalCount: number }, items: UsersTable[] }>('https://localhost:5001/users/list', payload)
        );

        patchState(store, { 
          users: response.items, 
          totalUsersCount: response.metadata.totalCount 
        });
      } catch (err) {
        console.error('Error loading users:', err);
      }
    };

    return {
      pagedUsers: computed(() => store.users()),
      totalUsersCount: computed(() => store.totalUsersCount()),

      async setFilterText(text: string) {
        patchState(store, { filterText: text, pageIndex: 0 });
        await loadUsers();
      },

      async setLockoutFilter(filter: 'all' | 'locked' | 'active') {
        patchState(store, { lockoutFilter: filter, pageIndex: 0 });
        await loadUsers();
      },

      async setTwoFactorFilter(filter: 'all' | 'enabled' | 'disabled') {
        patchState(store, { twoFactorFilter: filter, pageIndex: 0 });
        await loadUsers();
      },

      async setPage(index: number, size: number) {
        patchState(store, { pageIndex: index, pageSize: size });
        await loadUsers();
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
        await loadUsers();
      },

      async clearSorts() {
        patchState(store, { sorts: [], pageIndex: 0 });
        await loadUsers();
      },

      loadUsers,

      async addUser(user: any) {
        try {
          await lastValueFrom(http.post('https://localhost:5001/users', user));
          await loadUsers();
        } catch (err) {
          console.error('Error adding user:', err);
        }
      },

      async editUser(id: string, user: any) {
        try {
          await lastValueFrom(http.put(`https://localhost:5001/users/${id}`, user));
          await loadUsers();
        } catch (err) {
          console.error('Error editing user:', err);
        }
      },

      async toggleLockout(userId: string) {
        // Find current user state
        const user = store.users().find(u => u.id === userId);
        if (!user) return;
        
        try {
          const payload = { 
            lockoutEnabled: true, 
            isLockedOut: !user.is_locked_out 
          };
          // Simulate toggle locally until endpoint is fully ready or just call put
          await lastValueFrom(http.put(`https://localhost:5001/users/${userId}`, payload));
          await loadUsers();
        } catch (err) {
           console.error('Error toggling lockout:', err);
           // Fallback optimistic update
           const updated = store.users().map(u => {
              if (u.id === userId) {
                const nextLockedState = !u.is_locked_out;
                return {
                  ...u,
                  is_locked_out: nextLockedState,
                  lockout_end: nextLockedState ? new Date(Date.now() + 30 * 60 * 1000) : null,
                };
              }
              return u;
           });
           patchState(store, { users: updated });
        }
      }
    };
  })
);
