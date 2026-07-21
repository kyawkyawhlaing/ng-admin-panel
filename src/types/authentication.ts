export interface SmsAuthenticationSettings {
  is_enabled: boolean;
  provider: 'twilio' | 'custom_webhook';
  account_sid?: string | null;
  has_api_key_secret: boolean;
  from_number?: string | null;
  webhook_url?: string | null;
  otp_length: number;
  otp_expiry_seconds: number;
  max_attempts_per_hour: number;
  message_template: string;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface EmailAuthenticationSettings {
  is_enabled: boolean;
  provider: 'smtp' | 'sendgrid' | 'ses';
  smtp_host?: string | null;
  smtp_port: number;
  use_tls: boolean;
  from_email?: string | null;
  from_name?: string | null;
  username?: string | null;
  has_password_secret: boolean;
  otp_length: number;
  otp_expiry_seconds: number;
  max_attempts_per_hour: number;
  subject_template: string;
  body_template: string;
  updated_at?: string | null;
  updated_by?: string | null;
}
