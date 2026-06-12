import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface AdminState {
  users: any[];
  roles: any[];
  permissions: any[];
  menus: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  users: [],
  roles: [],
  permissions: [],
  menus: [],
  isLoading: false,
  error: null,
};

export const AdminStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, http = inject(HttpClient)) => ({
    async loadUsers() {
      patchState(store, { isLoading: true, error: null });
      try {
        const users = await lastValueFrom(http.get<any[]>('/api/users'));
        patchState(store, { users, isLoading: false });
      } catch (err: any) {
        patchState(store, { error: err.message, isLoading: false });
      }
    },
    async loadRoles() {
      patchState(store, { isLoading: true, error: null });
      try {
        const roles = await lastValueFrom(http.get<any[]>('/api/roles'));
        patchState(store, { roles, isLoading: false });
      } catch (err: any) {
        patchState(store, { error: err.message, isLoading: false });
      }
    },
    async loadPermissions() {
      patchState(store, { isLoading: true, error: null });
      try {
        const permissions = await lastValueFrom(http.get<any[]>('/api/permissions'));
        patchState(store, { permissions, isLoading: false });
      } catch (err: any) {
        patchState(store, { error: err.message, isLoading: false });
      }
    },
    async loadMenus() {
      patchState(store, { isLoading: true, error: null });
      try {
        const menus = await lastValueFrom(http.get<any[]>('/api/menus'));
        patchState(store, { menus, isLoading: false });
      } catch (err: any) {
        patchState(store, { error: err.message, isLoading: false });
      }
    }
  }))
);
