import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MFA_OTP_LENGTH = 6;
export const MFA_OTP_PATTERN = /^\d{6}$/;

export const MFA_OTP_FORMAT_HINT = 'Enter the 6-digit code from your authenticator app';
export const MFA_ACCESS_CODE_FORMAT_HINT =
  'Enter a 6-digit authenticator code or a valid recovery code';

export function normalizeMfaOtpInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, MFA_OTP_LENGTH);
}

export function isValidMfaOtp(value: string | null | undefined): boolean {
  const normalized = normalizeMfaOtpInput((value ?? '').trim());
  return MFA_OTP_PATTERN.test(normalized);
}

export function isValidMfaRecoveryCode(value: string | null | undefined): boolean {
  const normalized = (value ?? '')
    .trim()
    .replace(/[-\s]/g, '')
    .toUpperCase();

  if (!normalized || normalized.length < 8 || normalized.length > 16) {
    return false;
  }

  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return false;
  }

  // OTP is digits-only and exactly 6 — handled separately.
  return !/^\d+$/.test(normalized);
}

export function isValidMfaAccessCode(value: string | null | undefined): boolean {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return false;
  }

  const digitsOnly = /^\d[\d\s]*$/.test(trimmed);
  if (digitsOnly) {
    return isValidMfaOtp(trimmed);
  }

  return isValidMfaRecoveryCode(trimmed);
}

export function mfaOtpValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    isValidMfaOtp(control.value) ? null : { mfaOtp: true };
}

export function mfaAccessCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    isValidMfaAccessCode(control.value) ? null : { mfaAccessCode: true };
}

export function mfaOtpErrorMessage(
  control: AbstractControl,
  options: { accessCode?: boolean } = {}
): string | null {
  if (!control.touched || !control.invalid) {
    return null;
  }

  if (control.hasError('required')) {
    return options.accessCode ? 'Authentication code is required' : 'Verification code is required';
  }

  if (control.hasError('mfaAccessCode')) {
    return MFA_ACCESS_CODE_FORMAT_HINT;
  }

  if (control.hasError('mfaOtp')) {
    return MFA_OTP_FORMAT_HINT;
  }

  return null;
}
