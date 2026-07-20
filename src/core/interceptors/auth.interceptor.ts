import { HttpInterceptorFn, HttpHandlerFn, HttpRequest, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthStore, AuthStoreType } from '../stores/auth-store';
import { Router } from '@angular/router';

let isRefreshing = false;
let refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authStore = inject(AuthStore) as unknown as AuthStoreType;
  const router = inject(Router);
  const injector = inject(Injector);
  const token = authStore.token();

  let authReq = req.clone({
    withCredentials: true
  });

  if (token && !req.url.includes('/login') && !req.url.includes('/refresh-token')) {
    authReq = authReq.clone({
      headers: authReq.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError((error: any) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('users/login') &&
        !req.url.includes('refresh-token')
      ) {
        return handle401Error(authReq, next, authStore, router, injector);
      }
      return throwError(() => error);
    })
  );
};

const handle401Error = (request: HttpRequest<any>, next: HttpHandlerFn, authStore: AuthStoreType, router: Router, injector: Injector) => {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const http = injector.get(HttpClient);
    const userId = authStore.user()?.id;

    if (userId) {
      return http.post<{ accessToken: string }>('https://localhost:5001/refresh-token', { userId }, { withCredentials: true }).pipe(
        switchMap((tokenResponse) => {
          isRefreshing = false;
          authStore.updateToken(tokenResponse.accessToken);
          refreshTokenSubject.next(tokenResponse.accessToken);

          return next(request.clone({
            headers: request.headers.set('Authorization', `Bearer ${tokenResponse.accessToken}`)
          }));
        }),
        catchError((err) => {
          isRefreshing = false;
          authStore.clearAuth();
          router.navigate(['/login']);
          return throwError(() => err);
        })
      );
    } else {
      isRefreshing = false;
      authStore.clearAuth();
      router.navigate(['/login']);
      // Return a throwError instead of falling through to avoid "A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value."
      return throwError(() => new Error('User ID not found for refresh token'));
    }
  }

  return refreshTokenSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap((token) => next(request.clone({
      headers: request.headers.set('Authorization', `Bearer ${token}`)
    })))
  );
};

