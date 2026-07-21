import { Component, inject, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore, AuthStoreType } from '../../core/stores/auth-store';
import { ThemeStore } from '../../core/stores/theme-store';
import {
  MFA_ACCESS_CODE_FORMAT_HINT,
  MFA_OTP_FORMAT_HINT,
  MFA_OTP_LENGTH,
  mfaAccessCodeValidator,
  mfaOtpErrorMessage,
  normalizeMfaOtpInput,
  isValidMfaOtp
} from '../../core/auth/mfa-otp.util';
import {
  KkhAlertComponent,
  KkhButtonComponent,
  KkhInputComponent,
  KkhProgressComponent
} from '../../shared/ui';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    KkhAlertComponent,
    KkhButtonComponent,
    KkhInputComponent,
    KkhProgressComponent
  ],
  template: `
    <div class="relative min-h-screen cyber-grid flex flex-col">
      <div class="absolute top-4 right-4 z-20">
        <button type="button" (click)="themeStore.toggleTheme()"
                class="kkh-btn kkh-btn-ghost !min-h-9 !w-9 !px-0"
                [attr.aria-label]="themeStore.theme() === 'light' ? 'Switch to dark theme' : 'Switch to light theme'">
          @if (themeStore.theme() === 'light') {
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
          } @else {
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m0 13.5V21M4.22 4.22l1.59 1.59m12.38 12.38l1.59 1.59M3 12h2.25m13.5 0H21m-16.78 6.78l1.59-1.59m12.38-12.38l1.59-1.59M12 7.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z" /></svg>
          }
        </button>
      </div>

      <main class="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div class="w-full max-w-[420px]">
          <div class="text-center mb-8">
            <p class="kkh-label text-[var(--kkh-accent)]">Identity Console</p>
            <h1 class="kkh-title mt-3 text-4xl sm:text-5xl text-[var(--kkh-text)] tracking-[0.12em]">KyawHlaing</h1>
            <p class="mt-3 font-mono text-xs tracking-[0.14em] uppercase text-[var(--kkh-muted)]">
              {{ secondaryStep() ? 'Second factor required' : 'Secure access required' }}
            </p>
          </div>

          <div class="kkh-panel kkh-panel--framed relative overflow-hidden">
            <div class="kkh-rail"></div>

            @if (!secondaryStep()) {
              <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-5 px-6 py-7 sm:px-8 sm:py-8">
                @if (errorMessage(); as err) {
                  <kkh-alert tone="danger">{{ err }}</kkh-alert>
                }

                @if (isLoading()) {
                  <div class="kkh-auth-status" role="status" aria-live="polite">
                    <span class="kkh-spinner-cyber text-[var(--kkh-accent)]" aria-hidden="true"></span>
                    <span class="kkh-auth-status__code">AUTH // VERIFY</span>
                    <span class="kkh-auth-status__msg">Establishing secure session…</span>
                  </div>
                }

                <kkh-input
                  label="Email"
                  icon="mail"
                  type="email"
                  autocomplete="username"
                  placeholder="name@company.com"
                  formControlName="email"
                  [error]="loginForm.controls.email.touched && loginForm.controls.email.invalid ? 'Enter a valid email' : null"
                />

                <kkh-input
                  label="Password"
                  icon="lock"
                  type="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  formControlName="password"
                  [error]="loginForm.controls.password.touched && loginForm.controls.password.invalid ? 'Password is required' : null"
                />

                <div class="pt-1">
                  <kkh-button variant="primary" type="submit" [fullWidth]="true" [loading]="isLoading()" [disabled]="isLoading()">
                    {{ isLoading() ? 'Authenticating…' : 'Authenticate' }}
                  </kkh-button>
                </div>
              </form>
            } @else if (mfaStep()) {
              <form [formGroup]="mfaForm" (ngSubmit)="onMfaSubmit()" class="flex flex-col gap-5 px-6 py-7 sm:px-8 sm:py-8">
                @if (errorMessage(); as err) {
                  <kkh-alert tone="danger">{{ err }}</kkh-alert>
                }

                <p class="text-sm text-[var(--kkh-muted)]">
                  {{ MFA_ACCESS_CODE_FORMAT_HINT }}.
                </p>

                @if (isLoading()) {
                  <kkh-progress [indeterminate]="true" label="Verifying second factor" />
                }

                <kkh-input
                  label="Authentication code"
                  icon="lock"
                  type="text"
                  autocomplete="one-time-code"
                  placeholder="123456"
                  formControlName="code"
                  [error]="mfaCodeError()"
                />

                <div class="flex flex-col gap-3 pt-1">
                  <kkh-button variant="primary" type="submit" [fullWidth]="true" [loading]="isLoading()" [disabled]="isLoading()">
                    {{ isLoading() ? 'Verifying…' : 'Verify' }}
                  </kkh-button>
                  <kkh-button variant="ghost" type="button" [fullWidth]="true" [disabled]="isLoading()" (pressed)="onCancelSecondary()">
                    Back to sign in
                  </kkh-button>
                </div>
              </form>
            } @else {
              <div class="flex flex-col gap-5 px-6 py-7 sm:px-8 sm:py-8">
                @if (errorMessage(); as err) {
                  <kkh-alert tone="danger">{{ err }}</kkh-alert>
                }

                @if (!otpCodeStep()) {
                  <p class="text-sm text-[var(--kkh-muted)]">
                    Choose how to receive a one-time login code.
                  </p>

                  <div class="flex flex-wrap gap-2">
                    @for (method of otpMethods(); track method) {
                      <button
                        type="button"
                        class="kkh-btn"
                        [class.border-[var(--kkh-accent)]]="selectedOtpMethod() === method"
                        [class.text-[var(--kkh-accent)]]="selectedOtpMethod() === method"
                        (click)="onSelectOtpMethod(method)"
                      >
                        {{ methodLabel(method) }}
                      </button>
                    }
                  </div>

                  <kkh-input
                    [label]="otpDestinationLabel()"
                    [placeholder]="otpDestinationPlaceholder()"
                    [formControl]="otpDestination"
                    hint="Leave blank to use the phone/email on your profile."
                  />

                  <div class="flex flex-col gap-3 pt-1">
                    <kkh-button
                      variant="primary"
                      type="button"
                      [fullWidth]="true"
                      [loading]="isLoading()"
                      [disabled]="isLoading() || !selectedOtpMethod()"
                      (pressed)="onSendOtp()"
                    >
                      Send code
                    </kkh-button>
                    <kkh-button variant="ghost" type="button" [fullWidth]="true" [disabled]="isLoading()" (pressed)="onCancelSecondary()">
                      Back to sign in
                    </kkh-button>
                  </div>
                } @else {
                  <form [formGroup]="otpForm" (ngSubmit)="onOtpSubmit()" class="flex flex-col gap-5">
                    <p class="text-sm text-[var(--kkh-muted)]">
                      Enter the {{ otpLength }}-digit code sent via {{ methodLabel(selectedOtpMethod() || '') }}.
                    </p>

                    @if (isLoading()) {
                      <kkh-progress [indeterminate]="true" label="Verifying one-time code" />
                    }

                    <kkh-input
                      label="Verification code"
                      icon="lock"
                      type="text"
                      autocomplete="one-time-code"
                      inputMode="numeric"
                      [otpMode]="true"
                      [maxLength]="otpLength"
                      [hint]="otpHint"
                      formControlName="code"
                      [error]="otpCodeError()"
                    />

                    <div class="flex flex-col gap-3 pt-1">
                      <kkh-button variant="primary" type="submit" [fullWidth]="true" [loading]="isLoading()" [disabled]="isLoading() || !otpCodeValid()">
                        {{ isLoading() ? 'Verifying…' : 'Verify' }}
                      </kkh-button>
                      <kkh-button variant="ghost" type="button" [fullWidth]="true" [disabled]="isLoading()" (pressed)="onResendOtp()">
                        Resend code
                      </kkh-button>
                      <kkh-button variant="ghost" type="button" [fullWidth]="true" [disabled]="isLoading()" (pressed)="onCancelSecondary()">
                        Back to sign in
                      </kkh-button>
                    </div>
                  </form>
                }
              </div>
            }
          </div>

          @if (!secondaryStep()) {
            <p class="mt-6 text-center text-sm text-[var(--kkh-muted)]">
              Need an account?
              <a routerLink="/register" class="text-[var(--kkh-accent)] font-medium hover:underline ml-1">Register</a>
            </p>
          }
        </div>
      </main>
    </div>
  `
})
export class LoginComponent {
  protected readonly themeStore = inject(ThemeStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly MFA_ACCESS_CODE_FORMAT_HINT = MFA_ACCESS_CODE_FORMAT_HINT;
  protected readonly otpLength = MFA_OTP_LENGTH;
  protected readonly otpHint = MFA_OTP_FORMAT_HINT.replace('authenticator app', 'SMS or email');

  protected readonly isLoading = computed(() => this.authStore.isLoading());
  protected readonly errorMessage = computed(() => this.authStore.error());
  protected readonly mfaStep = computed(() => this.authStore.isMfaPending());
  protected readonly otpStep = computed(() => this.authStore.isOtpChallengePending());
  protected readonly secondaryStep = computed(() => this.mfaStep() || this.otpStep());
  protected readonly otpCodeStep = computed(() => !!this.authStore.loginChallengeToken());
  protected readonly otpMethods = computed(() => this.authStore.loginRequiredMethods());
  protected readonly selectedOtpMethod = computed(() => this.authStore.loginSelectedMethod());

  protected readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  protected readonly mfaForm = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, mfaAccessCodeValidator()]
    })
  });

  protected readonly otpForm = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  protected readonly otpDestination = new FormControl('', { nonNullable: true });

  protected mfaCodeError(): string | null {
    return mfaOtpErrorMessage(this.mfaForm.controls.code, { accessCode: true });
  }

  protected otpCodeError(): string | null {
    const control = this.otpForm.controls.code;
    if (!control.touched || !control.value) {
      return null;
    }
    return isValidMfaOtp(control.value) ? null : 'Enter a valid 6-digit code';
  }

  protected otpCodeValid(): boolean {
    return isValidMfaOtp(this.otpForm.controls.code.value);
  }

  protected methodLabel(method: string): string {
    if (method === 'sms') {
      return 'SMS';
    }
    if (method === 'email') {
      return 'Email';
    }
    return method;
  }

  protected otpDestinationLabel(): string {
    return this.selectedOtpMethod() === 'sms' ? 'Phone number (optional)' : 'Email override (optional)';
  }

  protected otpDestinationPlaceholder(): string {
    return this.selectedOtpMethod() === 'sms' ? '+959123456789' : 'you@example.com';
  }

  protected onSelectOtpMethod(method: string): void {
    this.authStore.setLoginChallengeMethod(method);
  }

  protected async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.authStore.setError(null);

    try {
      await this.authStore.login(
        this.loginForm.controls.email.value,
        this.loginForm.controls.password.value
      );
    } catch {
      // Error message is set on AuthStore.
    }
  }

  protected async onMfaSubmit(): Promise<void> {
    if (this.mfaForm.invalid) {
      this.mfaForm.markAllAsTouched();
      return;
    }

    this.authStore.setError(null);
    try {
      await this.authStore.completeMfaLogin(this.mfaForm.controls.code.value);
    } catch {
      // Error message is set on AuthStore.
    }
  }

  protected async onSendOtp(): Promise<void> {
    this.authStore.setError(null);
    try {
      await this.authStore.sendLoginOtpChallenge(this.otpDestination.value);
    } catch {
      // Error message is set on AuthStore.
    }
  }

  protected async onResendOtp(): Promise<void> {
    this.otpForm.reset();
    await this.onSendOtp();
  }

  protected async onOtpSubmit(): Promise<void> {
    const raw = this.otpForm.controls.code.value;
    const code = normalizeMfaOtpInput(raw);
    this.otpForm.controls.code.setValue(code);
    this.otpForm.controls.code.markAsTouched();

    if (!isValidMfaOtp(code)) {
      return;
    }

    this.authStore.setError(null);
    try {
      await this.authStore.completeLoginOtpChallenge(code);
    } catch {
      // Error message is set on AuthStore.
    }
  }

  protected onCancelSecondary(): void {
    this.mfaForm.reset();
    this.otpForm.reset();
    this.otpDestination.reset();
    this.authStore.cancelMfaChallenge();
  }
}
