import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { computed, Signal } from '@angular/core';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  roles: string[];
  permissions: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  roles: [],
  permissions: [],
  isLoading: false,
  error: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isAuthenticated: computed(() => !!store.token()),
  })),
  withMethods((store) => ({
    setAuth(user: User, token: string, roles: string[], permissions: string[]): void {
      patchState(store, { user, token, roles, permissions, error: null });
    },
    clearAuth(): void {
      patchState(store, { user: null, token: null, roles: [], permissions: [], error: null });
    },
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error });
    },
    hasRole(role: string): boolean {
      return store.roles().includes(role);
    },
    hasPermission(permission: string): boolean {
      return store.permissions().includes(permission);
    }
  }))
);

export interface AuthStoreType {
  readonly user: Signal<User | null>;
  readonly token: Signal<string | null>;
  readonly roles: Signal<string[]>;
  readonly permissions: Signal<string[]>;
  readonly isLoading: Signal<boolean>;
  readonly error: Signal<string | null>;
  readonly isAuthenticated: Signal<boolean>;
  setAuth(user: User, token: string, roles: string[], permissions: string[]): void;
  clearAuth(): void;
  setLoading(isLoading: boolean): void;
  setError(error: string | null): void;
  hasRole(role: string): boolean;
  hasPermission(permission: string): boolean;
}
