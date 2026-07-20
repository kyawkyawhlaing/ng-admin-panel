import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthStore, AuthStoreType, SessionStatus } from '../stores/auth-store';

function waitForSessionReady(authStore: AuthStoreType) {
  return toObservable(authStore.sessionStatus).pipe(
    filter((status: SessionStatus) => status !== 'bootstrapping'),
    take(1)
  );
}

function hasAdminAccess(authStore: AuthStoreType): boolean {
  return authStore.isAuthenticated() || authStore.isMfaEnrollPending();
}

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore) as unknown as AuthStoreType;
  const router = inject(Router);

  return waitForSessionReady(authStore).pipe(
    map((): boolean | UrlTree =>
      hasAdminAccess(authStore) ? true : router.createUrlTree(['/login'])
    )
  );
};

/** Blocks non-profile admin routes while MFA enrollment is required. */
export const mfaEnrollGateGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore) as unknown as AuthStoreType;
  const router = inject(Router);

  return waitForSessionReady(authStore).pipe(
    map((): boolean | UrlTree => {
      if (authStore.isMfaEnrollPending()) {
        return router.createUrlTree(['/admin/profile']);
      }
      if (!authStore.isAuthenticated()) {
        return router.createUrlTree(['/login']);
      }
      return true;
    })
  );
};

export const redirectIfLoggedInGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore) as unknown as AuthStoreType;
  const router = inject(Router);

  return waitForSessionReady(authStore).pipe(
    map((): boolean | UrlTree => {
      if (authStore.isMfaPending()) {
        return true;
      }
      if (authStore.isMfaEnrollPending()) {
        return router.createUrlTree(['/admin/profile']);
      }
      return authStore.isAuthenticated() ? router.createUrlTree(['/admin']) : true;
    })
  );
};

/** Route data: `{ permissions: string[] }` — user needs any one. */
export const permissionGuard: CanActivateFn = (route) => {
  const authStore = inject(AuthStore) as unknown as AuthStoreType;
  const router = inject(Router);
  const required = (route.data['permissions'] as string[] | undefined) ?? [];

  return waitForSessionReady(authStore).pipe(
    map((): boolean | UrlTree => {
      if (authStore.isMfaEnrollPending()) {
        return router.createUrlTree(['/admin/profile']);
      }
      if (!authStore.isAuthenticated()) {
        return router.createUrlTree(['/login']);
      }
      if (required.length === 0 || authStore.hasAnyPermission(...required)) {
        return true;
      }
      return router.createUrlTree(['/admin/dashboard']);
    })
  );
};
