import { Component, computed, effect, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import { MFA_OTP_LENGTH } from '../../../core/auth/mfa-otp.util';
import {
  KkhPageHeaderComponent,
  KkhButtonComponent,
  KkhInputComponent,
  KkhSelectComponent,
  KkhAlertComponent,
  KkhSystemDefaultBadgeComponent
} from '../../../shared/ui';
import { SelectOption } from '../../../shared/data/list.types';
import { SmsAuthenticationStore } from './sms-authentication-store';

@Component({
  selector: 'app-sms-authentication',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    KkhPageHeaderComponent,
    KkhButtonComponent,
    KkhInputComponent,
    KkhSelectComponent,
    KkhAlertComponent,
    KkhSystemDefaultBadgeComponent
  ],
  providers: [SmsAuthenticationStore],
  template: `
    <div class="space-y-6 kkh-page-enter">
      <kkh-page-header
        eyebrow="AUTHENTICATION"
        title="SMS Authentication"
        description="Configure flexible SMS OTP delivery for console sign-in and verification flows."
      >
        <kkh-system-default-badge />
      </kkh-page-header>

      @if (!canView()) {
        <kkh-alert tone="danger">You need sms_authentication_view to load SMS authentication settings.</kkh-alert>
      } @else {
        @if (store.error()) {
          <kkh-alert tone="danger">{{ store.error() }}</kkh-alert>
        }
        @if (store.successMessage()) {
          <kkh-alert tone="success">{{ store.successMessage() }}</kkh-alert>
        }

        @if (store.isLoading()) {
          <div class="kkh-panel p-8 text-sm text-[var(--kkh-muted)]">Loading SMS authentication settings…</div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="kkh-panel p-6 space-y-6 relative">
            <div class="kkh-rail"></div>

            <section class="space-y-4">
              <h2 class="text-sm font-semibold text-[var(--kkh-text)]">Channel</h2>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label class="flex items-center gap-3 text-sm text-[var(--kkh-text)]">
                  <input type="checkbox" formControlName="is_enabled" class="h-4 w-4 accent-[var(--kkh-accent)]" [disabled]="!canEdit()" />
                  Enable SMS OTP authentication
                </label>
                <kkh-select
                  label="Provider"
                  formControlName="provider"
                  [options]="providerOptions"
                  [error]="providerError()"
                />
              </div>
            </section>

            <section class="space-y-4 border-t border-[var(--kkh-border)] pt-6">
              <h2 class="text-sm font-semibold text-[var(--kkh-text)]">Provider credentials</h2>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <kkh-input label="Account SID" formControlName="account_sid" placeholder="Twilio account SID" />
                <kkh-input
                  label="API key / auth token"
                  type="password"
                  formControlName="api_key_secret"
                  [placeholder]="settings()?.has_api_key_secret ? 'Leave blank to keep existing secret' : 'Enter API key or auth token'"
                />
                <kkh-input label="From number" formControlName="from_number" placeholder="+15551234567" />
                <kkh-input label="Webhook URL" formControlName="webhook_url" placeholder="https://example.com/sms/send" />
              </div>
            </section>

            <section class="space-y-4 border-t border-[var(--kkh-border)] pt-6">
              <h2 class="text-sm font-semibold text-[var(--kkh-text)]">OTP policy</h2>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <kkh-input label="OTP length" formControlName="otp_length" [hint]="'Fixed at ' + otpLength + ' digits'" />
                <kkh-input label="Expiry (seconds)" type="number" formControlName="otp_expiry_seconds" />
                <kkh-input label="Max attempts / hour" type="number" formControlName="max_attempts_per_hour" />
              </div>
              <kkh-input
                label="Message template"
                formControlName="message_template"
                hint="Use {code} and {minutes} placeholders."
              />
            </section>

            @if (settings()?.updated_at) {
              <p class="text-xs text-[var(--kkh-muted)]">
                Last updated {{ settings()!.updated_at | date:'yyyy-MM-dd HH:mm' }}
                @if (settings()?.updated_by) {
                  by {{ settings()!.updated_by }}
                }
              </p>
            }

            @if (canEdit()) {
              <div class="flex justify-end border-t border-[var(--kkh-border)] pt-4">
                <kkh-button variant="primary" type="submit" [loading]="store.isSaving()" [disabled]="form.invalid || store.isSaving()">
                  Save settings
                </kkh-button>
              </div>
            }
          </form>
        }
      }
    </div>
  `
})
export class SmsAuthenticationComponent implements OnInit {
  protected readonly store = inject(SmsAuthenticationStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly otpLength = MFA_OTP_LENGTH;
  protected readonly settings = computed(() => this.store.settings());
  protected readonly canView = computed(() => this.authStore.hasPermission('sms_authentication_view'));
  protected readonly canEdit = computed(() => this.authStore.hasPermission('sms_authentication_edit'));

  protected readonly providerOptions: SelectOption[] = [
    { value: 'twilio', label: 'Twilio' },
    { value: 'custom_webhook', label: 'Custom webhook' }
  ];

  protected readonly form = new FormGroup({
    is_enabled: new FormControl(false, { nonNullable: true }),
    provider: new FormControl('twilio', { nonNullable: true, validators: [Validators.required] }),
    account_sid: new FormControl('', { nonNullable: true }),
    api_key_secret: new FormControl('', { nonNullable: true }),
    from_number: new FormControl('', { nonNullable: true }),
    webhook_url: new FormControl('', { nonNullable: true }),
    otp_length: new FormControl({ value: MFA_OTP_LENGTH, disabled: true }, { nonNullable: true }),
    otp_expiry_seconds: new FormControl(300, { nonNullable: true, validators: [Validators.required, Validators.min(60), Validators.max(3600)] }),
    max_attempts_per_hour: new FormControl(5, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(100)] }),
    message_template: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(512)] })
  });

  constructor() {
    effect(() => {
      const settings = this.store.settings();
      if (!settings) return;
      this.form.patchValue({
        is_enabled: settings.is_enabled,
        provider: settings.provider,
        account_sid: settings.account_sid ?? '',
        from_number: settings.from_number ?? '',
        webhook_url: settings.webhook_url ?? '',
        otp_expiry_seconds: settings.otp_expiry_seconds,
        max_attempts_per_hour: settings.max_attempts_per_hour,
        message_template: settings.message_template
      });
      if (!this.canEdit()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
        this.form.controls.otp_length.disable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    if (this.canView()) {
      void this.store.loadSettings();
    }
  }

  protected providerError(): string | null {
    const control = this.form.controls.provider;
    return control.touched && control.invalid ? 'Select a provider' : null;
  }

  protected async onSubmit(): Promise<void> {
    if (!this.canEdit() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      is_enabled: value.is_enabled,
      provider: value.provider,
      account_sid: value.account_sid || null,
      from_number: value.from_number || null,
      webhook_url: value.webhook_url || null,
      otp_length: MFA_OTP_LENGTH,
      otp_expiry_seconds: value.otp_expiry_seconds,
      max_attempts_per_hour: value.max_attempts_per_hour,
      message_template: value.message_template
    };

    if (value.api_key_secret.trim()) {
      payload['api_key_secret'] = value.api_key_secret.trim();
    }

    const ok = await this.store.saveSettings(payload);
    if (ok) {
      this.form.controls.api_key_secret.reset('');
    }
  }
}
