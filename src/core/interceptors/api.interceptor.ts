import { HttpInterceptorFn, HttpErrorResponse, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ToastService } from '../../shared/ui/toast.service';
import { resolveForbiddenMessage } from '../auth/permission-denied.util';
import {
  AuthenticationRequiredPayload,
  StepUpAuthService
} from '../auth/step-up-auth.service';

/** Marks a request that already completed step-up once (prevents loops). */
export const STEP_UP_RETRIED = new HttpContextToken(() => false);

function isStepUpForbidden(error: HttpErrorResponse): AuthenticationRequiredPayload | null {
  if (error.status !== 403) {
    return null;
  }

  const body = error.error as { authentication_required?: AuthenticationRequiredPayload } | null;
  const required = body?.authentication_required;
  if (!required?.requirement_key && !required?.process_key) {
    return null;
  }

  return required;
}

function isStepUpEndpoint(url: string): boolean {
  return (
    url.includes('/authentication/challenges/initiate-session') ||
    url.includes('/authentication/challenges/verify') ||
    url.includes('/authentication/challenges/initiate')
  );
}

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const stepUp = inject(StepUpAuthService);

  let apiReq = req;
  if (req.url.startsWith('/')) {
    apiReq = req.clone({
      url: `${environment.apiUrl}${req.url}`
    });
  }

  return next(apiReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const stepUpPayload = isStepUpForbidden(error);
      if (
        stepUpPayload &&
        !apiReq.context.get(STEP_UP_RETRIED) &&
        !isStepUpEndpoint(apiReq.url)
      ) {
        return from(stepUp.requestChallenge(stepUpPayload)).pipe(
          switchMap((ok) => {
            if (!ok) {
              return throwError(() => error);
            }

            const retryReq = apiReq.clone({
              context: apiReq.context.set(STEP_UP_RETRIED, true)
            });
            return next(retryReq);
          }),
          catchError(() => throwError(() => error))
        );
      }

      let errorMsg = 'An unknown error occurred!';

      if (error.error instanceof ErrorEvent) {
        errorMsg = `Error: ${error.error.message}`;
      } else if (error.status === 401) {
        errorMsg = '';
      } else if (error.status === 403 && stepUpPayload) {
        // User cancelled step-up — avoid RBAC toast noise.
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
