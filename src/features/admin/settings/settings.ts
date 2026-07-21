import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { ThemeStore } from '../../../core/stores/theme-store';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import {
  KkhPageHeaderComponent,
  KkhButtonComponent,
  KkhAlertComponent
} from '../../../shared/ui';
import {
  AUTHENTICATION_REQUIREMENT_MODE_OPTIONS,
  AuthenticationRequirementMode,
  LoginAuthenticationSettings
} from '../../../types/authentication-process';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    KkhPageHeaderComponent,
    KkhButtonComponent,
    KkhAlertComponent
  ],
  template: `
    <div class="space-y-8 max-w-3xl kkh-page-enter">
      <kkh-page-header
        eyebrow="Preferences"
        title="Settings"
        description="Console appearance and login secondary authentication."
      />

      <div class="kkh-panel p-6 relative">
        <div class="kkh-rail"></div>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-sm font-semibold text-[var(--kkh-text)]">Display theme</h2>
            <p class="mt-1 text-sm text-[var(--kkh-muted)]">Defaults to dark. Switch to a lighter corporate surface set when needed.</p>
            <p class="mt-3 kkh-label">Active: {{ themeStore.theme() }}</p>
          </div>
          <kkh-button variant="secondary" (pressed)="themeStore.toggleTheme()">Toggle theme</kkh-button>
        </div>
      </div>

      <div class="kkh-panel p-6 relative space-y-5">
        <div class="kkh-rail"></div>
        <div>
          <h2 class="text-sm font-semibold text-[var(--kkh-text)]">Login authentication</h2>
          <p class="mt-1 text-sm text-[var(--kkh-muted)]">
            System-wide secondary authentication after email/password. SMS/Email modes require those channels to be enabled.
          </p>
        </div>

        @if (!canViewLogin()) {
          <kkh-alert tone="danger">You need sms_authentication_view to manage login authentication.</kkh-alert>
        } @else {
          @if (loginError(); as err) {
            <kkh-alert tone="danger">{{ err }}</kkh-alert>
          }
          @if (loginSuccess(); as ok) {
            <kkh-alert tone="success">{{ ok }}</kkh-alert>
          }

          <form [formGroup]="loginForm" class="space-y-5" (ngSubmit)="saveLoginSettings()">
            <label class="kkh-switch">
              <input type="checkbox" formControlName="is_enabled" [disabled]="!canEditLogin()" />
              <span class="kkh-switch__track" aria-hidden="true"></span>
              <span class="kkh-switch__label">Require secondary authentication at login</span>
            </label>

            <label class="flex flex-col gap-2 max-w-md">
              <span class="kkh-field-label">Login mode</span>
              <select class="kkh-input" formControlName="mode" [disabled]="!canEditLogin()">
                @for (option of modeOptions; track option.value) {
                  <option [ngValue]="option.value">{{ option.label }}</option>
                }
              </select>
            </label>

            @if (canEditLogin()) {
              <div class="flex justify-end">
                <kkh-button variant="primary" type="submit" [loading]="loginSaving()" [disabled]="loginSaving()">
                  Save login settings
                </kkh-button>
              </div>
            }
          </form>
        }
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  protected readonly themeStore = inject(ThemeStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;
  private readonly http = inject(HttpClient);

  protected readonly modeOptions = AUTHENTICATION_REQUIREMENT_MODE_OPTIONS;
  protected readonly loginSaving = signal(false);
  protected readonly loginError = signal<string | null>(null);
  protected readonly loginSuccess = signal<string | null>(null);

  protected readonly loginForm = new FormGroup({
    mode: new FormControl<AuthenticationRequirementMode>('Totp', { nonNullable: true }),
    is_enabled: new FormControl(true, { nonNullable: true })
  });

  protected readonly canViewLogin = computed(() => this.authStore.hasPermission('sms_authentication_view'));
  protected readonly canEditLogin = computed(() => this.authStore.hasPermission('sms_authentication_edit'));

  ngOnInit(): void {
    if (this.canViewLogin()) {
      void this.loadLoginSettings();
    }
  }

  protected async loadLoginSettings(): Promise<void> {
    this.loginError.set(null);
    try {
      const settings = await lastValueFrom(
        this.http.get<LoginAuthenticationSettings>('/authentication/login-settings')
      );
      this.loginForm.patchValue({
        mode: settings.mode,
        is_enabled: settings.is_enabled
      });
    } catch (err: unknown) {
      this.loginError.set(this.apiError(err, 'Failed to load login settings.'));
    }
  }

  protected async saveLoginSettings(): Promise<void> {
    if (!this.canEditLogin()) {
      return;
    }

    this.loginSaving.set(true);
    this.loginError.set(null);
    this.loginSuccess.set(null);
    try {
      const value = this.loginForm.getRawValue();
      await lastValueFrom(
        this.http.put('/authentication/login-settings', {
          mode: value.mode,
          is_enabled: value.is_enabled
        })
      );
      this.loginSuccess.set('Login authentication settings saved.');
    } catch (err: unknown) {
      this.loginError.set(this.apiError(err, 'Failed to save login settings.'));
    } finally {
      this.loginSaving.set(false);
    }
  }

  private apiError(err: unknown, fallback: string): string {
    const error = err as { error?: { detail?: string; title?: string; message?: string } };
    return error?.error?.detail || error?.error?.title || error?.error?.message || fallback;
  }
}
