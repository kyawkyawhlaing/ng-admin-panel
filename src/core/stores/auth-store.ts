import {
  signalStore,
  withState,
  withMethods,
  patchState,
  withComputed,
  withHooks
} from '@ngrx/signals';
import { computed, inject, PLATFORM_ID, Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { isAccessTokenExpired, parseAccessToken } from '../auth/jwt.util';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export type SessionStatus =
  | 'bootstrapping'
  | 'authenticated'
  | 'anonymous'
  | 'mfa_pending'
  | 'mfa_enroll_pending';

export interface AuthState {
  user: AuthUser | null;
  /** Access JWT or enroll-only pending JWT — memory only; never written to storage. */
  token: string | null;
  /** Short-lived MFA challenge token (login step 2). */
  mfaToken: string | null;
  tokenExpiresAtMs: number | null;
  roles: string[];
  permissions: string[];
  sessionStatus: SessionStatus;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  mfaToken: null,
  tokenExpiresAtMs: null,
  roles: [],
  permissions: [],
  sessionStatus: 'bootstrapping',
  isLoading: false,
  error: null
};

interface AccessTokenResponse {
  accessToken: string;
}

interface LoginResponse {
  status: 'authenticated' | 'mfa_required' | 'mfa_enrollment_required';
  accessToken?: string | null;
  mfaToken?: string | null;
  enrollToken?: string | null;
}

/** Legacy keys from earlier builds that persisted JWT in browser storage. */
const LEGACY_AUTH_STORAGE_KEYS = ['ace.auth', 'kkh.auth'] as const;

function purgeLegacyAuthStorage(): void {
  try {
    for (const key of LEGACY_AUTH_STORAGE_KEYS) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function authErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
  }
  const errors = err.error?.errors as Array<{ description?: string }> | undefined;
  const firstValidation = errors?.find((e) => e.description)?.description;
  return firstValidation || err.error?.detail || err.error?.title || fallback;
}

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isAuthenticated: computed(() => {
      const token = store.token();
      if (!token || store.sessionStatus() !== 'authenticated') {
        return false;
      }
      if (store.tokenExpiresAtMs() != null && store.tokenExpiresAtMs()! <= Date.now()) {
        return false;
      }
      return !isAccessTokenExpired(token);
    }),
    isMfaPending: computed(() => store.sessionStatus() === 'mfa_pending'),
    isMfaEnrollPending: computed(() => store.sessionStatus() === 'mfa_enroll_pending'),
    displayName: computed(() => store.user()?.name || 'User'),
    displayEmail: computed(() => store.user()?.email || '')
  })),
  withMethods((
    store,
    http = inject(HttpClient),
    router = inject(Router),
    platformId = inject(PLATFORM_ID)
  ) => {
    const applyAccessToken = (accessToken: string): boolean => {
      const parsed = parseAccessToken(accessToken);
      if (!parsed || !parsed.userId) {
        return false;
      }

      purgeLegacyAuthStorage();
      patchState(store, {
        token: accessToken,
        mfaToken: null,
        tokenExpiresAtMs: parsed.expiresAtMs,
        user: {
          id: parsed.userId,
          email: parsed.email,
          name: parsed.name
        },
        roles: parsed.roles,
        permissions: parsed.permissions,
        sessionStatus: 'authenticated',
        error: null
      });
      return true;
    };

    const applyEnrollToken = (enrollToken: string): boolean => {
      const parsed = parseAccessToken(enrollToken);
      if (!parsed || !parsed.userId) {
        return false;
      }

      purgeLegacyAuthStorage();
      patchState(store, {
        token: enrollToken,
        mfaToken: null,
        tokenExpiresAtMs: parsed.expiresAtMs,
        user: {
          id: parsed.userId,
          email: parsed.email,
          name: parsed.name
        },
        roles: [],
        permissions: [],
        sessionStatus: 'mfa_enroll_pending',
        error: null
      });
      return true;
    };

    const clearSession = (): void => {
      purgeLegacyAuthStorage();
      patchState(store, {
        user: null,
        token: null,
        mfaToken: null,
        tokenExpiresAtMs: null,
        roles: [],
        permissions: [],
        sessionStatus: 'anonymous',
        isLoading: false,
        error: null
      });
    };

    return {
      applyAccessToken,
      clearAuth: clearSession,

      updateUser(patch: Partial<AuthUser>): void {
        const current = store.user();
        if (!current) {
          return;
        }
        patchState(store, {
          user: { ...current, ...patch }
        });
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
      },

      hasAnyPermission(...permissions: string[]): boolean {
        if (permissions.length === 0) {
          return true;
        }
        const granted = store.permissions();
        return permissions.some((p) => granted.includes(p));
      },

      async login(email: string, password: string): Promise<'authenticated' | 'mfa_required' | 'mfa_enrollment_required'> {
        patchState(store, { isLoading: true, error: null, mfaToken: null });
        try {
          const response = await firstValueFrom(
            http.post<LoginResponse>(
              '/users/login',
              { email: email.trim(), password },
              { withCredentials: true }
            )
          );

          if (response.status === 'mfa_required' && response.mfaToken) {
            patchState(store, {
              isLoading: false,
              sessionStatus: 'mfa_pending',
              mfaToken: response.mfaToken,
              token: null,
              user: null,
              roles: [],
              permissions: [],
              error: null
            });
            return 'mfa_required';
          }

          if (response.status === 'mfa_enrollment_required' && response.enrollToken) {
            if (!applyEnrollToken(response.enrollToken)) {
              clearSession();
              patchState(store, {
                isLoading: false,
                error: 'Invalid enrollment token.'
              });
              throw new Error('Invalid enrollment token.');
            }
            patchState(store, { isLoading: false });
            await router.navigateByUrl('/admin/profile');
            return 'mfa_enrollment_required';
          }

          if (response.status === 'authenticated' && response.accessToken) {
            if (!applyAccessToken(response.accessToken)) {
              clearSession();
              patchState(store, {
                isLoading: false,
                error: 'Invalid authentication token.'
              });
              throw new Error('Invalid authentication token.');
            }
            patchState(store, { isLoading: false });
            await router.navigateByUrl('/admin/dashboard');
            return 'authenticated';
          }

          clearSession();
          patchState(store, {
            isLoading: false,
            error: 'Unexpected login response.',
            sessionStatus: 'anonymous'
          });
          throw new Error('Unexpected login response.');
        } catch (err) {
          if (store.sessionStatus() === 'mfa_pending' || store.sessionStatus() === 'mfa_enroll_pending') {
            throw err;
          }
          clearSession();
          const message = authErrorMessage(err, 'Invalid email or password.');
          patchState(store, { isLoading: false, error: message, sessionStatus: 'anonymous' });
          throw err;
        }
      },

      async completeMfaLogin(code: string): Promise<void> {
        const mfaToken = store.mfaToken();
        if (!mfaToken) {
          patchState(store, { error: 'MFA session expired. Sign in again.', sessionStatus: 'anonymous' });
          throw new Error('MFA session expired.');
        }

        patchState(store, { isLoading: true, error: null });
        try {
          const response = await firstValueFrom(
            http.post<AccessTokenResponse>(
              '/users/login/mfa',
              { mfaToken, code: code.trim() },
              { withCredentials: true }
            )
          );

          if (!applyAccessToken(response.accessToken)) {
            clearSession();
            patchState(store, {
              isLoading: false,
              error: 'Invalid authentication token.'
            });
            throw new Error('Invalid authentication token.');
          }

          patchState(store, { isLoading: false });
          await router.navigateByUrl('/admin/dashboard');
        } catch (err) {
          const message = authErrorMessage(err, 'Invalid authentication code.');
          patchState(store, { isLoading: false, error: message });
          throw err;
        }
      },

      cancelMfaChallenge(): void {
        clearSession();
      },

      async logout(): Promise<void> {
        patchState(store, { isLoading: true });
        try {
          await firstValueFrom(
            http.post('/users/logout', null, { withCredentials: true })
          );
        } catch {
          // Always clear local session even if revoke fails.
        } finally {
          clearSession();
          await router.navigateByUrl('/login');
        }
      },

      /**
       * Exchange HttpOnly refresh cookie for a new access token.
       * Returns the new token, or null if the session cannot be restored.
       */
      async refreshSession(): Promise<string | null> {
        if (store.sessionStatus() === 'mfa_pending' || store.sessionStatus() === 'mfa_enroll_pending') {
          return null;
        }

        try {
          const response = await firstValueFrom(
            http.post<AccessTokenResponse>('/refresh-token', null, { withCredentials: true })
          );
          if (!applyAccessToken(response.accessToken)) {
            clearSession();
            return null;
          }
          return response.accessToken;
        } catch {
          clearSession();
          return null;
        }
      },

      /** Called once on app bootstrap to restore session from refresh cookie. */
      async bootstrapSession(): Promise<void> {
        if (!isPlatformBrowser(platformId)) {
          patchState(store, { sessionStatus: 'anonymous' });
          return;
        }

        // Drop any leftover JWT blobs from older builds (memory-only now).
        purgeLegacyAuthStorage();

        patchState(store, { sessionStatus: 'bootstrapping', isLoading: true });
        try {
          const response = await firstValueFrom(
            http.post<AccessTokenResponse>('/refresh-token', null, { withCredentials: true })
          );
          if (!applyAccessToken(response.accessToken)) {
            clearSession();
          }
        } catch {
          clearSession();
        } finally {
          patchState(store, { isLoading: false });
          if (store.sessionStatus() === 'bootstrapping') {
            patchState(store, { sessionStatus: 'anonymous' });
          }
        }
      },

      /** @deprecated Use applyAccessToken / login instead. */
      setAuth(user: AuthUser, token: string, _roles?: string[], _permissions?: string[]): void {
        if (!applyAccessToken(token) && user) {
          patchState(store, {
            user,
            token,
            roles: _roles ?? [],
            permissions: _permissions ?? [],
            sessionStatus: 'authenticated'
          });
        }
      },

      /** @deprecated Prefer applyAccessToken so claims stay in sync. */
      updateToken(token: string): void {
        applyAccessToken(token);
      }
    };
  }),
  withHooks({
    onInit(store) {
      void store.bootstrapSession();
    }
  })
);

export interface AuthStoreType {
  readonly user: Signal<AuthUser | null>;
  readonly token: Signal<string | null>;
  readonly mfaToken: Signal<string | null>;
  readonly tokenExpiresAtMs: Signal<number | null>;
  readonly roles: Signal<string[]>;
  readonly permissions: Signal<string[]>;
  readonly sessionStatus: Signal<SessionStatus>;
  readonly isLoading: Signal<boolean>;
  readonly error: Signal<string | null>;
  readonly isAuthenticated: Signal<boolean>;
  readonly isMfaPending: Signal<boolean>;
  readonly isMfaEnrollPending: Signal<boolean>;
  readonly displayName: Signal<string>;
  readonly displayEmail: Signal<string>;
  applyAccessToken(accessToken: string): boolean;
  clearAuth(): void;
  updateUser(patch: Partial<AuthUser>): void;
  setLoading(isLoading: boolean): void;
  setError(error: string | null): void;
  hasRole(role: string): boolean;
  hasPermission(permission: string): boolean;
  hasAnyPermission(...permissions: string[]): boolean;
  login(email: string, password: string): Promise<'authenticated' | 'mfa_required' | 'mfa_enrollment_required'>;
  completeMfaLogin(code: string): Promise<void>;
  cancelMfaChallenge(): void;
  logout(): Promise<void>;
  refreshSession(): Promise<string | null>;
  bootstrapSession(): Promise<void>;
  setAuth(user: AuthUser, token: string, roles?: string[], permissions?: string[]): void;
  updateToken(token: string): void;
}

/** @deprecated Use AuthUser */
export type User = AuthUser;
