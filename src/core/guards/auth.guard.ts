import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore, AuthStoreType } from '../stores/auth-store';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore) as unknown as AuthStoreType;
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const redirectIfLoggedInGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore) as unknown as AuthStoreType;
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return router.createUrlTree(['/admin']);
  }

  return true;
};
