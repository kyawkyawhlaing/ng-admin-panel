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
import { SmsAuthenticationStore } from './sms-authentication-store';
import { AuthChannelStatusPanelComponent } from '../authentication-shared/auth-channel-status-panel';
import { formatAuthTemplatePreview, formatExpiryLabel, providerLabel } from '../authentication-shared/auth-channel.util';

const SMS_PROVIDER_LABELS: Record<string, string> = {
  twilio: 'Twilio',
  custom_webhook: 'Custom webhook'
};

@Component({
  selector: 'app-sms-authentication',
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
  providers: [SmsAuthenticationStore],
  template: `
    <div class="space-y-6 kkh-page-enter">
      <kkh-page-header
        eyebrow="AUTHENTICATION"
        title="SMS Authentication"
        description="Configure SMS OTP delivery, provider credentials, and message templates for configurable sign-in flows."
      >
        <kkh-system-default-badge />
      </kkh-page-header>

      @if (!canView()) {
        <kkh-alert tone="danger" title="Access denied">
          You need <code class="font-mono text-xs">sms_authentication_view</code> to manage SMS settings.
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
            Loading SMS authentication settings…
          </div>
        } @else {
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <aside class="lg:col-span-1">
              <auth-channel-status-panel
                icon="smartphone"
                channelLabel="Delivery channel"
                title="SMS OTP"
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
                        When enabled, SMS OTP can be used for login and API endpoint step-up rules.
                      </p>
                    </div>
                    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <label class="kkh-switch md:col-span-2">
                        <input type="checkbox" formControlName="is_enabled" [disabled]="!canEdit()" />
                        <span class="kkh-switch__track" aria-hidden="true"></span>
                        <span class="kkh-switch__label">Enable SMS OTP authentication</span>
                      </label>
                      <kkh-select
                        label="Provider"
                        formControlName="provider"
                        [options]="providerOptions"
                        [error]="providerError()"
                      />
                    </div>
                  </section>

                  @if (isTwilio()) {
                    <section class="kkh-auth-section">
                      <div class="kkh-auth-section__head">
                        <h2 class="kkh-auth-section__title">Twilio credentials</h2>
                        <p class="kkh-auth-section__desc">
                          Messages are sent through your Twilio account using the configured sender number.
                        </p>
                      </div>
                      <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <kkh-input label="Account SID" formControlName="account_sid" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                        <kkh-input
                          label="Auth token"
                          type="password"
                          formControlName="api_key_secret"
                          [placeholder]="settings()?.has_api_key_secret ? 'Leave blank to keep existing token' : 'Enter auth token'"
                        />
                        <kkh-input
                          label="From number"
                          formControlName="from_number"
                          placeholder="+15551234567"
                          hint="E.164 format recommended"
                        />
                      </div>
                    </section>
                  }

                  @if (isWebhook()) {
                    <section class="kkh-auth-section">
                      <div class="kkh-auth-section__head">
                        <h2 class="kkh-auth-section__title">Webhook delivery</h2>
                        <p class="kkh-auth-section__desc">
                          KyawHlaing POSTs the OTP payload to your endpoint. Implement delivery to the user device on your side.
                        </p>
                      </div>
                      <kkh-input
                        label="Webhook URL"
                        formControlName="webhook_url"
                        placeholder="https://api.example.com/sms/otp"
                        hint="Must accept HTTPS POST requests from the API."
                      />
                    </section>
                  }

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
                      <h2 class="kkh-auth-section__title">Message template</h2>
                      <p class="kkh-auth-section__desc">
                        Use <code class="font-mono text-xs">{{ codeToken }}</code> and <code class="font-mono text-xs">{{ minutesToken }}</code> placeholders.
                      </p>
                    </div>
                    <kkh-textarea
                      label="SMS body"
                      formControlName="message_template"
                      [rows]="4"
                      [placeholder]="defaultMessagePlaceholder"
                    />
                    <div class="kkh-template-preview">
                      <span class="kkh-template-preview__label">Preview</span>
                      {{ messagePreview() }}
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
                        Save SMS settings
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
export class SmsAuthenticationComponent implements OnInit {
  protected readonly store = inject(SmsAuthenticationStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly otpLength = MFA_OTP_LENGTH;
  protected readonly codeToken = '{code}';
  protected readonly minutesToken = '{minutes}';
  protected readonly defaultMessagePlaceholder =
    'Your KyawHlaing verification code is {code}. Valid for {minutes} minutes.';
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
    otp_expiry_seconds: new FormControl(300, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(60), Validators.max(3600)]
    }),
    max_attempts_per_hour: new FormControl(5, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(100)]
    }),
    message_template: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(512)]
    })
  });

  private readonly providerValue = toSignal(this.form.controls.provider.valueChanges, {
    initialValue: this.form.controls.provider.value
  });

  private readonly messageTemplateValue = toSignal(this.form.controls.message_template.valueChanges, {
    initialValue: this.form.controls.message_template.value
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
          account_sid: settings.account_sid ?? '',
          from_number: settings.from_number ?? '',
          webhook_url: settings.webhook_url ?? '',
          otp_expiry_seconds: settings.otp_expiry_seconds,
          max_attempts_per_hour: settings.max_attempts_per_hour,
          message_template: settings.message_template
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

  protected isTwilio(): boolean {
    return this.providerValue() === 'twilio';
  }

  protected isWebhook(): boolean {
    return this.providerValue() === 'custom_webhook';
  }

  protected providerDisplayName(): string {
    return providerLabel(this.providerValue(), SMS_PROVIDER_LABELS);
  }

  protected messagePreview(): string {
    const template = this.messageTemplateValue() || 'Your verification code is {code}.';
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
