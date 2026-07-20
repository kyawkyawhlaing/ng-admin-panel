import {
  HttpInterceptorFn,
  HttpHandlerFn,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  catchError,
  switchMap,
  throwError,
  from,
  BehaviorSubject,
  filter,
  take,
  finalize
} from 'rxjs';
import { AuthStore, AuthStoreType } from '../stores/auth-store';
import { Router } from '@angular/router';

const AUTH_SKIP_BEARER = ['/users/login', '/users/register', '/users/logout', '/refresh-token'];

let isRefreshing = false;
/** Emits new access token on success, or '' on failure so waiters unblock. */
const refreshGate$ = new BehaviorSubject<string | null>(null);

function isAuthBootstrapUrl(url: string): boolean {
  return AUTH_SKIP_BEARER.some((path) => url.includes(path));
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authStore = inject(AuthStore) as unknown as AuthStoreType;
  const router = inject(Router);
  const token = authStore.token();

  let authReq = req.clone({ withCredentials: true });

  if (token && !isAuthBootstrapUrl(req.url)) {
    authReq = authReq.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        isAuthBootstrapUrl(req.url)
      ) {
        return throwError(() => error);
      }

      return handle401(authReq, next, authStore, router);
    })
  );
};

function handle401(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authStore: AuthStoreType,
  router: Router
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshGate$.next(null);

    return from(authStore.refreshSession()).pipe(
      switchMap((newToken) => {
        if (!newToken) {
          refreshGate$.next('');
          void router.navigateByUrl('/login');
          return throwError(() => new HttpErrorResponse({
            status: 401,
            statusText: 'Session expired',
            url: request.url
          }));
        }

        refreshGate$.next(newToken);
        return next(request.clone({
          setHeaders: { Authorization: `Bearer ${newToken}` },
          withCredentials: true
        }));
      }),
      finalize(() => {
        isRefreshing = false;
      })
    );
  }

  return refreshGate$.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap((token) => {
      if (!token) {
        return throwError(() => new HttpErrorResponse({
          status: 401,
          statusText: 'Session expired',
          url: request.url
        }));
      }

      return next(request.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
        withCredentials: true
      }));
    })
  );
}
