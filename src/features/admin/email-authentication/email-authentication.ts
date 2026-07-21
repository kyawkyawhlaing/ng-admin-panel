import { Component, computed, effect, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import { MFA_OTP_LENGTH } from '../../../core/auth/mfa-otp.util';
import {
  KkhPageHeaderComponent,
  KkhButtonComponent,
  KkhInputComponent,
  KkhSelectComponent,
  KkhTextareaComponent,
  KkhAlertComponent,
  KkhSystemDefaultBadgeComponent
} from '../../../shared/ui';
import { SelectOption } from '../../../shared/data/list.types';
import { EmailAuthenticationStore } from './email-authentication-store';
import { AuthChannelStatusPanelComponent } from '../authentication-shared/auth-channel-status-panel';
import { formatAuthTemplatePreview, formatExpiryLabel, providerLabel } from '../authentication-shared/auth-channel.util';

const EMAIL_PROVIDER_LABELS: Record<string, string> = {
  smtp: 'SMTP',
  sendgrid: 'SendGrid',
  ses: 'Amazon SES'
};

@Component({
  selector: 'app-email-authentication',
  imports: [
    ReactiveFormsModule,
    KkhPageHeaderComponent,
    KkhButtonComponent,
    KkhInputComponent,
    KkhSelectComponent,
    KkhTextareaComponent,
    KkhAlertComponent,
    KkhSystemDefaultBadgeComponent,
    AuthChannelStatusPanelComponent
  ],
  providers: [EmailAuthenticationStore],
  template: `
    <div class="space-y-6 kkh-page-enter">
      <kkh-page-header
        eyebrow="AUTHENTICATION"
        title="Email Authentication"
        description="Configure email OTP delivery, provider credentials, and templates for configurable sign-in flows."
      >
        <kkh-system-default-badge />
      </kkh-page-header>

      @if (!canView()) {
        <kkh-alert tone="danger" title="Access denied">
          You need <code class="font-mono text-xs">email_authentication_view</code> to manage email settings.
        </kkh-alert>
      } @else {
        @if (store.error()) {
          <kkh-alert tone="danger" [dismissible]="true" (dismissed)="store.clearMessages()">{{ store.error() }}</kkh-alert>
        }
        @if (store.successMessage()) {
          <kkh-alert tone="success" [dismissible]="true" (dismissed)="store.clearMessages()">{{ store.successMessage() }}</kkh-alert>
        }

        @if (store.isLoading()) {
          <div class="kkh-panel flex items-center justify-center gap-3 p-12 text-sm text-[var(--kkh-muted)]">
            <div class="h-6 w-6 animate-spin border border-[var(--kkh-accent)] border-t-transparent" style="border-radius: 9999px"></div>
            Loading email authentication settings…
          </div>
        } @else {
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <aside class="lg:col-span-1">
              <auth-channel-status-panel
                icon="mail"
                channelLabel="Delivery channel"
                title="Email OTP"
                [enabled]="form.controls.is_enabled.value"
                [providerName]="providerDisplayName()"
                [otpLength]="otpLength"
                [otpExpirySeconds]="form.controls.otp_expiry_seconds.value"
                [maxAttempts]="form.controls.max_attempts_per_hour.value"
                [updatedAt]="settings()?.updated_at"
                [updatedBy]="settings()?.updated_by"
              />
            </aside>

            <div class="lg:col-span-2">
              <form [formGroup]="form" (ngSubmit)="onSubmit()" class="kkh-panel relative overflow-hidden">
                <div class="kkh-rail"></div>
                <div class="space-y-0 p-6 md:p-8">
                  <section class="kkh-auth-section">
                    <div class="kkh-auth-section__head">
                      <h2 class="kkh-auth-section__title">Channel status</h2>
                      <p class="kkh-auth-section__desc">
                        When enabled, email OTP can be used for login and API endpoint step-up rules.
                      </p>
                    </div>
                    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <label class="kkh-switch md:col-span-2">
                        <input type="checkbox" formControlName="is_enabled" [disabled]="!canEdit()" />
                        <span class="kkh-switch__track" aria-hidden="true"></span>
                        <span class="kkh-switch__label">Enable email OTP authentication</span>
                      </label>
                      <kkh-select
                        label="Provider"
                        formControlName="provider"
                        [options]="providerOptions"
                        [error]="providerError()"
                      />
                    </div>
                  </section>

                  <section class="kkh-auth-section">
                    <div class="kkh-auth-section__head">
                      <h2 class="kkh-auth-section__title">Sender &amp; credentials</h2>
                      <p class="kkh-auth-section__desc">{{ deliveryDescription() }}</p>
                    </div>
                    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                      @if (isSmtp()) {
                        <kkh-input label="SMTP host" formControlName="smtp_host" placeholder="smtp.example.com" />
                        <kkh-input label="SMTP port" type="number" formControlName="smtp_port" />
                        <label class="kkh-switch md:col-span-2">
                          <input type="checkbox" formControlName="use_tls" [disabled]="!canEdit()" />
                          <span class="kkh-switch__track" aria-hidden="true"></span>
                          <span class="kkh-switch__label">Use TLS (STARTTLS)</span>
                        </label>
                      }
                      <kkh-input label="From email" formControlName="from_email" placeholder="noreply@example.com" />
                      <kkh-input label="From name" formControlName="from_name" placeholder="KyawHlaing Console" />
                      <kkh-input
                        [label]="usernameLabel()"
                        formControlName="username"
                        [placeholder]="usernamePlaceholder()"
                      />
                      <kkh-input
                        [label]="secretLabel()"
                        type="password"
                        formControlName="password_secret"
                        [placeholder]="settings()?.has_password_secret ? 'Leave blank to keep existing secret' : secretPlaceholder()"
                      />
                    </div>
                  </section>

                  <section class="kkh-auth-section">
                    <div class="kkh-auth-section__head">
                      <h2 class="kkh-auth-section__title">OTP policy</h2>
                      <p class="kkh-auth-section__desc">
                        Codes are fixed at {{ otpLength }} digits. Expiry applies to each challenge session.
                      </p>
                    </div>
                    <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
                      <kkh-input label="OTP length" formControlName="otp_length" [hint]="'Fixed at ' + otpLength + ' digits'" />
                      <kkh-input
                        label="Expiry (seconds)"
                        type="number"
                        formControlName="otp_expiry_seconds"
                        [hint]="'≈ ' + expiryHint()"
                      />
                      <kkh-input label="Max attempts / hour" type="number" formControlName="max_attempts_per_hour" />
                    </div>
                  </section>

                  <section class="kkh-auth-section">
                    <div class="kkh-auth-section__head">
                      <h2 class="kkh-auth-section__title">Email templates</h2>
                      <p class="kkh-auth-section__desc">
                        Use <code class="font-mono text-xs">{{ codeToken }}</code> and <code class="font-mono text-xs">{{ minutesToken }}</code> placeholders.
                      </p>
                    </div>
                    <kkh-input label="Subject" formControlName="subject_template" placeholder="Your KyawHlaing verification code" />
                    <div class="mt-5">
                      <kkh-textarea
                        label="Body"
                        formControlName="body_template"
                        [rows]="5"
                        [placeholder]="defaultBodyPlaceholder"
                      />
                    </div>
                    <div class="kkh-template-preview mt-3">
                      <span class="kkh-template-preview__label">Preview</span>
                      <strong class="block text-sm font-semibold text-[var(--kkh-text)] mb-1">{{ subjectPreview() }}</strong>
                      {{ bodyPreview() }}
                    </div>
                  </section>

                  @if (canEdit()) {
                    <div class="flex flex-col gap-3 border-t border-[var(--kkh-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <p class="text-xs text-[var(--kkh-muted)]">
                        Changes apply immediately to new OTP challenges.
                      </p>
                      <kkh-button
                        variant="primary"
                        type="submit"
                        [loading]="store.isSaving()"
                        [disabled]="form.invalid || store.isSaving() || !form.dirty"
                      >
                        Save email settings
                      </kkh-button>
                    </div>
                  }
                </div>
              </form>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class EmailAuthenticationComponent implements OnInit {
  protected readonly store = inject(EmailAuthenticationStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly otpLength = MFA_OTP_LENGTH;
  protected readonly codeToken = '{code}';
  protected readonly minutesToken = '{minutes}';
  protected readonly defaultBodyPlaceholder =
    'Your verification code is {code}. It expires in {minutes} minutes.';
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
    smtp_port: new FormControl(587, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(65535)]
    }),
    use_tls: new FormControl(true, { nonNullable: true }),
    from_email: new FormControl('', { nonNullable: true }),
    from_name: new FormControl('', { nonNullable: true }),
    username: new FormControl('', { nonNullable: true }),
    password_secret: new FormControl('', { nonNullable: true }),
    otp_length: new FormControl({ value: MFA_OTP_LENGTH, disabled: true }, { nonNullable: true }),
    otp_expiry_seconds: new FormControl(300, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(60), Validators.max(3600)]
    }),
    max_attempts_per_hour: new FormControl(5, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(100)]
    }),
    subject_template: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(256)]
    }),
    body_template: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(1024)]
    })
  });

  private readonly providerValue = toSignal(this.form.controls.provider.valueChanges, {
    initialValue: this.form.controls.provider.value
  });

  private readonly subjectValue = toSignal(this.form.controls.subject_template.valueChanges, {
    initialValue: this.form.controls.subject_template.value
  });

  private readonly bodyValue = toSignal(this.form.controls.body_template.valueChanges, {
    initialValue: this.form.controls.body_template.value
  });

  private readonly expiryValue = toSignal(this.form.controls.otp_expiry_seconds.valueChanges, {
    initialValue: this.form.controls.otp_expiry_seconds.value
  });

  constructor() {
    effect(() => {
      const settings = this.store.settings();
      if (!settings) return;

      this.form.patchValue(
        {
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
        },
        { emitEvent: false }
      );

      this.applyEditState();
      this.form.markAsPristine();
    });

    effect(() => {
      this.canEdit();
      this.applyEditState();
    });
  }

  ngOnInit(): void {
    if (this.canView()) {
      void this.store.loadSettings();
    }
  }

  protected isSmtp(): boolean {
    return this.providerValue() === 'smtp';
  }

  protected providerDisplayName(): string {
    return providerLabel(this.providerValue(), EMAIL_PROVIDER_LABELS);
  }

  protected deliveryDescription(): string {
    switch (this.providerValue()) {
      case 'sendgrid':
        return 'SendGrid uses your API key and verified sender identity.';
      case 'ses':
        return 'Amazon SES uses SMTP credentials from your AWS account.';
      default:
        return 'Connect to your SMTP relay for outbound OTP email.';
    }
  }

  protected usernameLabel(): string {
    return this.providerValue() === 'sendgrid' ? 'API user (optional)' : 'Username';
  }

  protected usernamePlaceholder(): string {
    return this.providerValue() === 'sendgrid' ? 'apikey' : 'SMTP username';
  }

  protected secretLabel(): string {
    return this.providerValue() === 'sendgrid' ? 'API key' : 'Password';
  }

  protected secretPlaceholder(): string {
    return this.providerValue() === 'sendgrid' ? 'SG.xxxxxxxx' : 'SMTP password';
  }

  protected subjectPreview(): string {
    const template = this.subjectValue() || 'Your verification code';
    const minutes = Math.max(1, Math.round((this.expiryValue() ?? 300) / 60));
    return formatAuthTemplatePreview(template, '1'.repeat(MFA_OTP_LENGTH), minutes);
  }

  protected bodyPreview(): string {
    const template = this.bodyValue() || 'Your verification code is {code}.';
    const minutes = Math.max(1, Math.round((this.expiryValue() ?? 300) / 60));
    return formatAuthTemplatePreview(template, '1'.repeat(MFA_OTP_LENGTH), minutes);
  }

  protected expiryHint(): string {
    return formatExpiryLabel(this.expiryValue() ?? 300);
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
      this.form.markAsPristine();
    }
  }

  private applyEditState(): void {
    if (!this.canEdit()) {
      this.form.disable({ emitEvent: false });
      return;
    }

    this.form.enable({ emitEvent: false });
    this.form.controls.otp_length.disable({ emitEvent: false });
  }
}
