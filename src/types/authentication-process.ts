export type AuthenticationRequirementMode =
  | 'None'
  | 'Sms'
  | 'Email'
  | 'SmsOrEmail'
  | 'Totp';

export const AUTHENTICATION_REQUIREMENT_MODE_OPTIONS: { value: AuthenticationRequirementMode; label: string }[] = [
  { value: 'None', label: 'None' },
  { value: 'Sms', label: 'SMS only' },
  { value: 'Email', label: 'Email only' },
  { value: 'SmsOrEmail', label: 'SMS or Email' },
  { value: 'Totp', label: 'Authenticator (TOTP)' }
];

export interface LoginAuthenticationSettings {
  mode: AuthenticationRequirementMode;
  is_enabled: boolean;
  updated_at?: string | null;
  updated_by?: string | null;
}
