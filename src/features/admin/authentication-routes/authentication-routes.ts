import { Component, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import { KkhPageHeaderComponent, KkhButtonComponent, KkhAlertComponent, KkhInputComponent } from '../../../shared/ui';
import { AuthenticationRouteConfiguration, HTTP_METHOD_OPTIONS } from '../../../types/authentication-route';
import { AUTHENTICATION_REQUIREMENT_MODE_OPTIONS } from '../../../types/authentication-process';
import { AuthenticationRoutesStore } from './authentication-routes-store';

@Component({
  selector: 'app-authentication-routes',
  imports: [FormsModule, KkhPageHeaderComponent, KkhButtonComponent, KkhAlertComponent, KkhInputComponent],
  providers: [AuthenticationRoutesStore],
  template: `
    <div class="space-y-6 kkh-page-enter">
      <kkh-page-header
        eyebrow="AUTHENTICATION"
        title="API endpoint authentication"
        description="Map backend API paths (Host.Api) to a step-up authentication mode. These are not frontend admin routes."
      />

      @if (!canView()) {
        <kkh-alert tone="danger">You need sms_authentication_view to manage API endpoint rules.</kkh-alert>
      } @else {
        @if (store.error()) {
          <kkh-alert tone="danger">{{ store.error() }}</kkh-alert>
        }
        @if (store.successMessage()) {
          <kkh-alert tone="success">{{ store.successMessage() }}</kkh-alert>
        }

        <div class="kkh-panel p-6 space-y-4">
          <h2 class="text-sm font-semibold text-[var(--kkh-text)]">Add API endpoint rule</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <kkh-input
              label="API endpoint pattern"
              [(ngModel)]="draft.route_pattern"
              placeholder="/api/sensitive/{id}"
              hint="Backend path template only (e.g. /users/{id}), not /admin/…"
            />
            <label class="flex flex-col gap-2">
              <span class="kkh-field-label">HTTP method</span>
              <select class="kkh-input" [(ngModel)]="draft.http_method" [disabled]="!canEdit()">
                @for (method of httpMethods; track method) {
                  <option [ngValue]="method">{{ method }}</option>
                }
              </select>
            </label>
            <label class="flex flex-col gap-2">
              <span class="kkh-field-label">Authentication mode</span>
              <select class="kkh-input" [(ngModel)]="draft.mode" [disabled]="!canEdit()">
                @for (option of modeOptions; track option.value) {
                  <option [ngValue]="option.value">{{ option.label }}</option>
                }
              </select>
            </label>
            <kkh-input label="Priority" type="number" [(ngModel)]="draft.priority" hint="Higher wins when multiple patterns match" />
            <kkh-input label="Description" class="md:col-span-2" [(ngModel)]="draft.description" />
            <label class="flex items-center gap-3 text-sm md:col-span-2">
              <input type="checkbox" class="h-4 w-4 accent-[var(--kkh-accent)]" [(ngModel)]="draft.is_enabled" [disabled]="!canEdit()" />
              Rule enabled
            </label>
          </div>
          @if (canEdit()) {
            <div class="flex justify-end">
              <kkh-button variant="primary" type="button" (click)="saveDraft()">Add API endpoint rule</kkh-button>
            </div>
          }
        </div>

        @if (store.isLoading()) {
          <div class="kkh-panel p-8 text-sm text-[var(--kkh-muted)]">Loading API endpoint rules…</div>
        } @else {
          <div class="kkh-panel overflow-hidden">
            <table class="w-full text-sm">
              <thead class="border-b border-[var(--kkh-border)] bg-[var(--kkh-raised)]">
                <tr>
                  <th class="px-4 py-3 text-left">API endpoint</th>
                  <th class="px-4 py-3 text-left">Method</th>
                  <th class="px-4 py-3 text-left">Mode</th>
                  <th class="px-4 py-3 text-left">Priority</th>
                  <th class="px-4 py-3 text-left">Enabled</th>
                  <th class="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (route of store.routes(); track route.id) {
                  <tr class="border-b border-[var(--kkh-border)] last:border-0">
                    <td class="px-4 py-3 font-mono text-xs">{{ route.route_pattern }}</td>
                    <td class="px-4 py-3">{{ route.http_method }}</td>
                    <td class="px-4 py-3">{{ modeLabel(route.mode) }}</td>
                    <td class="px-4 py-3">{{ route.priority }}</td>
                    <td class="px-4 py-3">{{ route.is_enabled ? 'Yes' : 'No' }}</td>
                    <td class="px-4 py-3 text-right space-x-2">
                      @if (canEdit()) {
                        <kkh-button variant="secondary" size="sm" type="button" (click)="remove(route.id!)">Delete</kkh-button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="px-4 py-8 text-center text-[var(--kkh-muted)]">No API endpoint rules configured.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `
})
export class AuthenticationRoutesComponent implements OnInit {
  protected readonly store = inject(AuthenticationRoutesStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly httpMethods = HTTP_METHOD_OPTIONS;
  protected readonly modeOptions = AUTHENTICATION_REQUIREMENT_MODE_OPTIONS;
  protected draft: AuthenticationRouteConfiguration = this.emptyDraft();

  protected readonly canView = computed(() => this.authStore.hasPermission('sms_authentication_view'));
  protected readonly canEdit = computed(() => this.authStore.hasPermission('sms_authentication_edit'));

  ngOnInit(): void {
    if (this.canView()) {
      void this.store.load();
    }
  }

  protected modeLabel(mode: string): string {
    return this.modeOptions.find((o) => o.value === mode)?.label ?? mode;
  }

  protected async saveDraft(): Promise<void> {
    await this.store.save({ ...this.draft });
    this.draft = this.emptyDraft();
  }

  protected async remove(id: number): Promise<void> {
    await this.store.remove(id);
  }

  private emptyDraft(): AuthenticationRouteConfiguration {
    return {
      route_pattern: '',
      http_method: 'GET',
      mode: 'Totp',
      description: '',
      priority: 100,
      is_enabled: true
    };
  }
}
