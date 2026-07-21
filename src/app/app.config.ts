import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '../core/interceptors/auth.interceptor';
import { apiInterceptor } from '../core/interceptors/api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor, apiInterceptor]))
  ]
};
