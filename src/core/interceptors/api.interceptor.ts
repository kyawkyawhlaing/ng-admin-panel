import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  // Prepend API URL if the request starts with /api
  let apiReq = req;
  if (req.url.startsWith('/api')) {
    // If environment.apiUrl already ends with /api, we should replace the '/api' prefix from the URL
    // Actually, req.url is like /api/users. If environment.apiUrl is https://localhost:5001/api,
    // we want https://localhost:5001/api/users.
    const urlPath = req.url.substring(4); // remove the '/api' prefix
    apiReq = req.clone({
      url: `${environment.apiUrl}${urlPath}`
    });
  }

  return next(apiReq).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMsg = 'An unknown error occurred!';
      
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMsg = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        if (error.status === 401) {
          // Handled by auth interceptor, we might not want to show a global snackbar here
          // as it redirects to login.
          errorMsg = ''; 
        } else if (error.error && error.error.message) {
          errorMsg = error.error.message;
        } else if (error.status === 0) {
          errorMsg = 'Cannot connect to the server. Please check your network connection.';
        } else {
          errorMsg = `Error Code: ${error.status}\nMessage: ${error.message}`;
        }
      }

      if (errorMsg) {
        snackBar.open(errorMsg, 'Close', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        });
      }

      return throwError(() => error);
    })
  );
};
