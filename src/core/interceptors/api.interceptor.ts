import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ToastService } from '../../shared/ui/toast.service';
import { resolveForbiddenMessage } from '../auth/permission-denied.util';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  let apiReq = req;
  if (req.url.startsWith('/')) {
    apiReq = req.clone({
      url: `${environment.apiUrl}${req.url}`
    });
  }

  return next(apiReq).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMsg = 'An unknown error occurred!';

      if (error.error instanceof ErrorEvent) {
        errorMsg = `Error: ${error.error.message}`;
      } else if (error.status === 401) {
        // Auth/session failures are handled by AuthStore / calling screens.
        errorMsg = '';
      } else if (error.status === 403) {
        errorMsg = resolveForbiddenMessage(req.method, req.url, error.error);
      } else if (
        req.url.includes('/users/login') ||
        req.url.includes('/users/logout') ||
        req.url.includes('/refresh-token')
      ) {
        errorMsg = '';
      } else if (error.error?.detail) {
        errorMsg = error.error.detail;
      } else if (error.error?.title) {
        errorMsg = error.error.title;
      } else if (error.error?.message) {
        errorMsg = error.error.message;
      } else if (error.status === 0) {
        errorMsg = 'Cannot connect to the server. Please check your network connection.';
      } else {
        errorMsg = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }

      if (errorMsg) {
        toast.error(errorMsg);
      }

      return throwError(() => error);
    })
  );
};
