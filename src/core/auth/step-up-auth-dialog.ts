import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  KkhDialogComponent,
  KkhButtonComponent,
  KkhInputComponent,
  KkhAlertComponent
} from '../../shared/ui';
import { MFA_OTP_LENGTH, MFA_OTP_FORMAT_HINT, isValidMfaOtp, normalizeMfaOtpInput } from '../auth/mfa-otp.util';
import { StepUpAuthService } from './step-up-auth.service';

@Component({
  selector: 'app-step-up-auth-dialog',
  standalone: true,
  imports: [FormsModule, KkhDialogComponent, KkhButtonComponent, KkhInputComponent, KkhAlertComponent],
  template: `
    <kkh-dialog
      title="Additional verification required"
      [subtitle]="subtitle()"
      [open]="stepUp.open()"
      [showDefaultActions]="false"
      (closed)="stepUp.cancel()"
    >
      @if (stepUp.phase() === 'choose') {
        <ng-container>
          @if (stepUp.error(); as err) {
            <kkh-alert tone="danger">{{ err }}</kkh-alert>
          }
          <div class="mt-4 space-y-4">
            <p class="text-sm text-[var(--kkh-muted)]">
              @if (isTotpSelected()) {
                Continue with your authenticator app for
                <span class="font-mono text-xs text-[var(--kkh-text)]">{{ requirementKey() }}</span>.
              } @else {
                Choose how you want to receive a one-time code for
                <span class="font-mono text-xs text-[var(--kkh-text)]">{{ requirementKey() }}</span>.
              }
            </p>
            <div class="flex flex-wrap gap-2">
              @for (method of methods(); track method) {
                <button
                  type="button"
                  class="kkh-btn"
                  [class.border-[var(--kkh-accent)]]="stepUp.selectedMethod() === method"
                  [class.text-[var(--kkh-accent)]]="stepUp.selectedMethod() === method"
                  (click)="stepUp.selectedMethod.set(method)"
                >
                  {{ methodLabel(method) }}
                </button>
              }
            </div>
            @if (!isTotpSelected()) {
              <kkh-input
                [label]="destinationLabel()"
                [placeholder]="destinationPlaceholder()"
                [ngModel]="stepUp.destination()"
                (ngModelChange)="stepUp.destination.set($event)"
                hint="Leave blank to use the phone/email on your profile."
              />
            }
          </div>
          <div class="mt-6 flex justify-end gap-2" footer>
            <kkh-button variant="ghost" type="button" (pressed)="stepUp.cancel()">Cancel</kkh-button>
            <kkh-button
              variant="primary"
              type="button"
              [loading]="stepUp.busy()"
              [disabled]="!stepUp.selectedMethod() || stepUp.busy()"
              (pressed)="stepUp.sendCode()"
            >
              {{ isTotpSelected() ? 'Continue' : 'Send code' }}
            </kkh-button>
          </div>
        </ng-container>
      }

      @if (stepUp.phase() === 'code' || stepUp.phase() === 'verifying') {
        <ng-container>
          @if (stepUp.error(); as err) {
            <kkh-alert tone="danger">{{ err }}</kkh-alert>
          }
          <div class="mt-4 space-y-4">
            <p class="text-sm text-[var(--kkh-muted)]">
              @if (isTotpSelected()) {
                Enter the {{ otpLength }}-digit code from your authenticator app.
              } @else {
                Enter the {{ otpLength }}-digit code sent via {{ methodLabel(stepUp.selectedMethod()) }}.
              }
            </p>
            <kkh-input
              label="Verification code"
              [ngModel]="stepUp.code()"
              (ngModelChange)="onCodeInput($event)"
              [otpMode]="true"
              [maxLength]="otpLength"
              inputMode="numeric"
              [hint]="otpHint"
            />
          </div>
          <div class="mt-6 flex justify-between gap-2" footer>
            @if (!isTotpOnly()) {
              <kkh-button variant="ghost" type="button" [disabled]="stepUp.busy()" (pressed)="stepUp.phase.set('choose')">
                Back
              </kkh-button>
            } @else {
              <kkh-button variant="ghost" type="button" [disabled]="stepUp.busy()" (pressed)="stepUp.cancel()">
                Cancel
              </kkh-button>
            }
            <kkh-button
              variant="primary"
              type="button"
              [loading]="stepUp.busy()"
              [disabled]="!codeValid() || stepUp.busy() || !stepUp.challengeToken()"
              (pressed)="stepUp.verifyCode()"
            >
              Verify
            </kkh-button>
          </div>
        </ng-container>
      }
    </kkh-dialog>
  `
})
export class StepUpAuthDialogComponent {
  protected readonly stepUp = inject(StepUpAuthService);
  protected readonly otpLength = MFA_OTP_LENGTH;
  protected readonly otpHint = MFA_OTP_FORMAT_HINT;

  protected readonly methods = computed(() => {
    const required = this.stepUp.payload()?.required_methods ?? [];
    return required.length > 0 ? required.map((m) => m.toLowerCase()) : ['sms', 'email'];
  });

  protected readonly requirementKey = computed(
    () => this.stepUp.payload()?.requirement_key || this.stepUp.payload()?.process_key || 'step-up'
  );

  protected readonly isTotpSelected = computed(() => this.stepUp.selectedMethod() === 'totp');
  protected readonly isTotpOnly = computed(() => {
    const methods = this.methods();
    return methods.length === 1 && methods[0] === 'totp';
  });

  protected readonly subtitle = computed(() => {
    const route = this.stepUp.payload()?.route_pattern;
    return route ? `Protected API endpoint: ${route}` : this.isTotpSelected()
      ? 'Complete authenticator verification to continue.'
      : 'Complete SMS or email verification to continue.';
  });

  protected methodLabel(method: string): string {
    if (method === 'sms') {
      return 'SMS';
    }
    if (method === 'email') {
      return 'Email';
    }
    if (method === 'totp') {
      return 'Authenticator';
    }
    return method;
  }

  protected destinationLabel(): string {
    return this.stepUp.selectedMethod() === 'sms' ? 'Phone number (optional)' : 'Email override (optional)';
  }

  protected destinationPlaceholder(): string {
    return this.stepUp.selectedMethod() === 'sms' ? '+959123456789' : 'you@example.com';
  }

  protected onCodeInput(value: string): void {
    this.stepUp.code.set(normalizeMfaOtpInput(value));
  }

  protected codeValid(): boolean {
    return isValidMfaOtp(this.stepUp.code());
  }
}
