import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { AuthenticationRouteConfiguration } from '../../../types/authentication-route';

@Injectable()
export class AuthenticationRoutesStore {
  private readonly http = inject(HttpClient);

  readonly routes = signal<AuthenticationRouteConfiguration[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  async load(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const items = await lastValueFrom(this.http.get<AuthenticationRouteConfiguration[]>('/authentication/routes'));
      this.routes.set(items);
    } catch (e: unknown) {
      this.error.set(this.apiError(e, 'Failed to load API endpoint authentication rules.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async save(route: AuthenticationRouteConfiguration): Promise<void> {
    this.error.set(null);
    this.successMessage.set(null);
    const payload = {
      route_pattern: route.route_pattern,
      http_method: route.http_method,
      mode: route.mode,
      description: route.description,
      priority: route.priority,
      is_enabled: route.is_enabled
    };

    try {
      if (route.id) {
        await lastValueFrom(this.http.put(`/authentication/routes/${route.id}`, payload));
      } else {
        await lastValueFrom(this.http.post('/authentication/routes', payload));
      }
      this.successMessage.set('API endpoint authentication rule saved.');
      await this.load();
    } catch (e: unknown) {
      this.error.set(this.apiError(e, 'Failed to save API endpoint rule.'));
    }
  }

  async remove(id: number): Promise<void> {
    this.error.set(null);
    try {
      await lastValueFrom(this.http.delete(`/authentication/routes/${id}`));
      this.successMessage.set('API endpoint rule deleted.');
      await this.load();
    } catch (e: unknown) {
      this.error.set(this.apiError(e, 'Failed to delete API endpoint rule.'));
    }
  }

  private apiError(err: unknown, fallback: string): string {
    const error = err as { error?: { detail?: string; title?: string; message?: string } };
    return error?.error?.detail || error?.error?.title || error?.error?.message || fallback;
  }
}
