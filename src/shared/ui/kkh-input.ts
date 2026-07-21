import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Mail,
  Lock,
  Search,
  User,
  Eye,
  EyeOff
} from 'lucide-angular';
import { normalizeMfaOtpInput } from '../../core/auth/mfa-otp.util';

@Component({
  selector: 'kkh-input',
  standalone: true,
  imports: [LucideAngularModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KkhInputComponent),
      multi: true
    },
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Mail, Lock, Search, User, Eye, EyeOff })
    }
  ],
  host: {
    class: 'kkh-field'
  },
  template: `
    <label class="flex flex-col gap-2 w-full">
      @if (label()) {
        <span class="kkh-field-label">{{ label() }}</span>
      }
      <div class="kkh-input-shell">
        @if (icon(); as iconName) {
          <span class="kkh-input-icon" aria-hidden="true">
            <lucide-icon [name]="iconName" class="h-4 w-4" [strokeWidth]="1.75" />
          </span>
        }
        <input
          class="kkh-input"
          [class.kkh-input--with-icon]="!!icon()"
          [class.kkh-input--with-toggle]="showPasswordToggle()"
          [attr.type]="resolvedType()"
          [attr.placeholder]="placeholder() || null"
          [attr.autocomplete]="autocomplete()"
          [attr.maxlength]="maxLength()"
          [attr.inputmode]="inputMode()"
          [attr.pattern]="pattern()"
          [disabled]="isDisabled()"
          [value]="value()"
          (input)="onInput($event)"
          (blur)="onTouched()"
        />
        @if (showPasswordToggle()) {
          <button
            type="button"
            class="kkh-input-toggle"
            [attr.aria-label]="passwordVisible() ? 'Hide password' : 'Show password'"
            [attr.aria-pressed]="passwordVisible()"
            [disabled]="isDisabled()"
            (click)="togglePasswordVisibility($event)"
          >
            <lucide-icon
              [name]="passwordVisible() ? 'eye-off' : 'eye'"
              class="h-4 w-4"
              [strokeWidth]="1.75"
            />
          </button>
        }
      </div>
      @if (hint() && !error()) {
        <span class="text-xs text-[var(--kkh-muted)] leading-snug">{{ hint() }}</span>
      }
      @if (error()) {
        <span class="text-xs text-[var(--kkh-danger)] leading-snug">{{ error() }}</span>
      }
    </label>
  `
})
export class KkhInputComponent implements ControlValueAccessor {
  readonly label = input<string | null>(null);
  readonly type = input('text');
  readonly placeholder = input('');
  readonly autocomplete = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  /** Lucide icon name shown on the left (e.g. mail, lock, search, user). */
  readonly icon = input<string | null>(null);
  /** Strip non-digits and cap at 6 characters (authenticator OTP fields). */
  readonly otpMode = input(false);
  readonly maxLength = input<number | null>(null);
  readonly inputMode = input<string | null>(null);
  readonly pattern = input<string | null>(null);
  /** Show eye toggle for password fields. Defaults to true when type is password. */
  readonly revealable = input<boolean | null>(null);

  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);
  protected readonly passwordVisible = signal(false);

  protected readonly showPasswordToggle = computed(() => {
    if (this.type() !== 'password') return false;
    return this.revealable() ?? true;
  });

  protected readonly resolvedType = computed(() => {
    if (this.type() === 'password' && this.passwordVisible()) return 'text';
    return this.type();
  });

  private onChange: (v: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let next = input.value;
    if (this.otpMode()) {
      next = normalizeMfaOtpInput(next);
      if (input.value !== next) {
        input.value = next;
      }
    }
    this.value.set(next);
    this.onChange(next);
  }

  protected togglePasswordVisibility(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.passwordVisible.update((v) => !v);
  }
}
