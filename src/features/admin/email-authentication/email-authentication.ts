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
import { EmailAuthenticationStore } from './email-authentication-store';

@Component({
  selector: 'app-email-authentication',
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
  providers: [EmailAuthenticationStore],
  template: `
    <div class="space-y-6 kkh-page-enter">
      <kkh-page-header
        eyebrow="AUTHENTICATION"
        title="Email Authentication"
        description="Configure flexible email OTP delivery for console sign-in and verification flows."
      >
        <kkh-system-default-badge />
      </kkh-page-header>

      @if (!canView()) {
        <kkh-alert tone="danger">You need email_authentication_view to load email authentication settings.</kkh-alert>
      } @else {
        @if (store.error()) {
          <kkh-alert tone="danger">{{ store.error() }}</kkh-alert>
        }
        @if (store.successMessage()) {
          <kkh-alert tone="success">{{ store.successMessage() }}</kkh-alert>
        }

        @if (store.isLoading()) {
          <div class="kkh-panel p-8 text-sm text-[var(--kkh-muted)]">Loading email authentication settings…</div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="kkh-panel p-6 space-y-6 relative">
            <div class="kkh-rail"></div>

            <section class="space-y-4">
              <h2 class="text-sm font-semibold text-[var(--kkh-text)]">Channel</h2>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label class="flex items-center gap-3 text-sm text-[var(--kkh-text)]">
                  <input type="checkbox" formControlName="is_enabled" class="h-4 w-4 accent-[var(--kkh-accent)]" [disabled]="!canEdit()" />
                  Enable email OTP authentication
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
              <h2 class="text-sm font-semibold text-[var(--kkh-text)]">Delivery settings</h2>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <kkh-input label="SMTP host" formControlName="smtp_host" placeholder="smtp.example.com" />
                <kkh-input label="SMTP port" type="number" formControlName="smtp_port" />
                <kkh-input label="From email" formControlName="from_email" placeholder="noreply@example.com" />
                <kkh-input label="From name" formControlName="from_name" placeholder="KyawHlaing Console" />
                <kkh-input label="Username / API user" formControlName="username" />
                <kkh-input
                  label="Password / API key"
                  type="password"
                  formControlName="password_secret"
                  [placeholder]="settings()?.has_password_secret ? 'Leave blank to keep existing secret' : 'Enter password or API key'"
                />
                <label class="flex items-center gap-3 text-sm text-[var(--kkh-text)] md:col-span-2">
                  <input type="checkbox" formControlName="use_tls" class="h-4 w-4 accent-[var(--kkh-accent)]" [disabled]="!canEdit()" />
                  Use TLS
                </label>
              </div>
            </section>

            <section class="space-y-4 border-t border-[var(--kkh-border)] pt-6">
              <h2 class="text-sm font-semibold text-[var(--kkh-text)]">OTP policy</h2>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <kkh-input label="OTP length" formControlName="otp_length" [hint]="'Fixed at ' + otpLength + ' digits'" />
                <kkh-input label="Expiry (seconds)" type="number" formControlName="otp_expiry_seconds" />
                <kkh-input label="Max attempts / hour" type="number" formControlName="max_attempts_per_hour" />
              </div>
              <kkh-input label="Subject template" formControlName="subject_template" />
              <kkh-input
                label="Body template"
                formControlName="body_template"
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
export class EmailAuthenticationComponent implements OnInit {
  protected readonly store = inject(EmailAuthenticationStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly otpLength = MFA_OTP_LENGTH;
  protected readonly settings = computed(() => this.store.settings());
  protected readonly canView = computed(() => this.authStore.hasPermission('email_authentication_view'));
  protected readonly canEdit = computed(() => this.authStore.hasPermission('email_authentication_edit'));

  protected readonly providerOptions: SelectOption[] = [
    { value: 'smtp', label: 'SMTP' },
    { value: 'sendgrid', label: 'SendGrid' },
    { value: 'ses', label: 'Amazon SES' }
  ];

  protected readonly form = new FormGroup({
    is_enabled: new FormControl(false, { nonNullable: true }),
    provider: new FormControl('smtp', { nonNullable: true, validators: [Validators.required] }),
    smtp_host: new FormControl('', { nonNullable: true }),
    smtp_port: new FormControl(587, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(65535)] }),
    use_tls: new FormControl(true, { nonNullable: true }),
    from_email: new FormControl('', { nonNullable: true }),
    from_name: new FormControl('', { nonNullable: true }),
    username: new FormControl('', { nonNullable: true }),
    password_secret: new FormControl('', { nonNullable: true }),
    otp_length: new FormControl({ value: MFA_OTP_LENGTH, disabled: true }, { nonNullable: true }),
    otp_expiry_seconds: new FormControl(300, { nonNullable: true, validators: [Validators.required, Validators.min(60), Validators.max(3600)] }),
    max_attempts_per_hour: new FormControl(5, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(100)] }),
    subject_template: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(256)] }),
    body_template: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(1024)] })
  });

  constructor() {
    effect(() => {
      const settings = this.store.settings();
      if (!settings) return;
      this.form.patchValue({
        is_enabled: settings.is_enabled,
        provider: settings.provider,
        smtp_host: settings.smtp_host ?? '',
        smtp_port: settings.smtp_port,
        use_tls: settings.use_tls,
        from_email: settings.from_email ?? '',
        from_name: settings.from_name ?? '',
        username: settings.username ?? '',
        otp_expiry_seconds: settings.otp_expiry_seconds,
        max_attempts_per_hour: settings.max_attempts_per_hour,
        subject_template: settings.subject_template,
        body_template: settings.body_template
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
      smtp_host: value.smtp_host || null,
      smtp_port: value.smtp_port,
      use_tls: value.use_tls,
      from_email: value.from_email || null,
      from_name: value.from_name || null,
      username: value.username || null,
      otp_length: MFA_OTP_LENGTH,
      otp_expiry_seconds: value.otp_expiry_seconds,
      max_attempts_per_hour: value.max_attempts_per_hour,
      subject_template: value.subject_template,
      body_template: value.body_template
    };

    if (value.password_secret.trim()) {
      payload['password_secret'] = value.password_secret.trim();
    }

    const ok = await this.store.saveSettings(payload);
    if (ok) {
      this.form.controls.password_secret.reset('');
    }
  }
}
