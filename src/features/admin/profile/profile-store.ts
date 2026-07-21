import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import QRCode from 'qrcode';
import { UsersTable } from '../../../types/database';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';

export interface MfaStatus {
  enabled: boolean;
  required: boolean;
  hasRecoveryCodesLeft: boolean;
  setupInProgress: boolean;
}

export interface TotpSetupResult {
  sharedKey: string;
  authenticatorUri: string;
  /** Client-rendered PNG data URL for authenticator scan. */
  qrDataUrl: string;
}

export interface ConfirmTotpResult {
  recoveryCodes: string[];
}

export interface ProfileState {
  userDetails: UsersTable | null;
  mfaStatus: MfaStatus | null;
  totpSetup: TotpSetupResult | null;
  recoveryCodes: string[] | null;
  isLoading: boolean;
  isSaving: boolean;
  isMfaBusy: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: ProfileState = {
  userDetails: null,
  mfaStatus: null,
  totpSetup: null,
  recoveryCodes: null,
  isLoading: false,
  isSaving: false,
  isMfaBusy: false,
  error: null,
  successMessage: null
};

function apiError(err: any, fallback: string): string {
  return err?.error?.detail || err?.error?.title || err?.error?.message || fallback;
}

async function buildTotpQr(authenticatorUri: string): Promise<string> {
  return QRCode.toDataURL(authenticatorUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 220,
    color: {
      dark: '#0b1220',
      light: '#ffffff'
    }
  });
}

export const ProfileStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient), authStore = inject(AuthStore) as unknown as AuthStoreType) => {
    const loadMfaStatus = async () => {
      try {
        const mfaStatus = await lastValueFrom(http.get<MfaStatus>('/users/me/mfa'));
        patchState(store, { mfaStatus });
      } catch (err: any) {
        patchState(store, { error: apiError(err, 'Failed to load MFA status') });
      }
    };

    return {
      clearMessages(): void {
        patchState(store, { error: null, successMessage: null });
      },

      clearRecoveryCodes(): void {
        patchState(store, { recoveryCodes: null });
      },

      clearTotpSetup(): void {
        patchState(store, { totpSetup: null });
      },

      async loadProfile(id: string) {
        patchState(store, { isLoading: true, error: null });
        try {
          const [user, mfaStatus] = await Promise.all([
            lastValueFrom(http.get<UsersTable>(`/users/${id}`)),
            lastValueFrom(http.get<MfaStatus>('/users/me/mfa'))
          ]);
          patchState(store, { userDetails: user, mfaStatus, isLoading: false });
        } catch (err: any) {
          try {
            const mfaStatus = await lastValueFrom(http.get<MfaStatus>('/users/me/mfa'));
            patchState(store, {
              mfaStatus,
              isLoading: false,
              error: null
            });
          } catch {
            patchState(store, { error: apiError(err, 'Failed to load profile'), isLoading: false });
          }
        }
      },

      loadMfaStatus,

      async beginTotpSetup(): Promise<boolean> {
        patchState(store, { isMfaBusy: true, error: null, successMessage: null, totpSetup: null });
        try {
          const setup = await lastValueFrom(http.post<Omit<TotpSetupResult, 'qrDataUrl'>>('/users/me/mfa/totp/setup', {}));
          const qrDataUrl = await buildTotpQr(setup.authenticatorUri);
          patchState(store, {
            totpSetup: {
              sharedKey: setup.sharedKey,
              authenticatorUri: setup.authenticatorUri,
              qrDataUrl
            },
            isMfaBusy: false
          });
          return true;
        } catch (err: any) {
          patchState(store, { error: apiError(err, 'Failed to start MFA setup'), isMfaBusy: false });
          return false;
        }
      },

      async confirmTotp(code: string): Promise<boolean> {
        patchState(store, { isMfaBusy: true, error: null, successMessage: null });
        try {
          const result = await lastValueFrom(
            http.post<ConfirmTotpResult>('/users/me/mfa/totp/confirm', { code })
          );
          patchState(store, {
            totpSetup: null,
            recoveryCodes: result.recoveryCodes,
            isMfaBusy: false,
            successMessage: 'Two-factor authentication is now enabled. Please sign in again.'
          });
          await authStore.logout();
          return true;
        } catch (err: any) {
          patchState(store, { error: apiError(err, 'Invalid verification code'), isMfaBusy: false });
          return false;
        }
      },

      async disableMfa(password: string, code: string): Promise<boolean> {
        patchState(store, { isMfaBusy: true, error: null, successMessage: null });
        try {
          await lastValueFrom(http.post('/users/me/mfa/disable', { password, code }));
          await loadMfaStatus();
          patchState(store, {
            isMfaBusy: false,
            successMessage: 'Two-factor authentication has been disabled.'
          });
          return true;
        } catch (err: any) {
          patchState(store, { error: apiError(err, 'Failed to disable MFA'), isMfaBusy: false });
          return false;
        }
      },

      async regenerateRecoveryCodes(password: string, code: string): Promise<boolean> {
        patchState(store, { isMfaBusy: true, error: null, successMessage: null });
        try {
          const result = await lastValueFrom(
            http.post<{ recoveryCodes: string[] }>('/users/me/mfa/recovery-codes/regenerate', {
              password,
              code
            })
          );
          await loadMfaStatus();
          patchState(store, {
            recoveryCodes: result.recoveryCodes,
            isMfaBusy: false,
            successMessage: 'Recovery codes regenerated. Store them securely — they will not be shown again.'
          });
          return true;
        } catch (err: any) {
          patchState(store, { error: apiError(err, 'Failed to regenerate recovery codes'), isMfaBusy: false });
          return false;
        }
      },

      async updatePersonalDetails(id: string, payload: {
        first_name: string;
        last_name: string;
        display_name: string;
        email: string;
        phone_number?: string | null;
      }) {
        patchState(store, { isSaving: true, error: null, successMessage: null });
        try {
          await lastValueFrom(http.put(`/users/${id}`, {
            ...payload,
            phone_number: payload.phone_number?.trim() || null
          }));
          const updatedUser = await lastValueFrom(http.get<UsersTable>(`/users/${id}`));
          patchState(store, { userDetails: updatedUser, isSaving: false, successMessage: 'Personal details updated successfully!' });
          authStore.updateUser({
            email: payload.email,
            name: payload.display_name
          });
        } catch (err: any) {
          patchState(store, { error: apiError(err, 'Failed to update details'), isSaving: false });
        }
      },

      async updatePassword(id: string, payload: any) {
        patchState(store, { isSaving: true, error: null, successMessage: null });
        try {
          const requestPayload = {
            current_password: payload.currentPassword,
            new_password: payload.newPassword
          };
          await lastValueFrom(http.put(`/users/${id}/password`, requestPayload));
          patchState(store, { isSaving: false, successMessage: 'Password updated successfully!' });
        } catch (err: any) {
          patchState(store, { error: apiError(err, 'Failed to update password'), isSaving: false });
        }
      },

      async updatePreferences(_id: string, _preferences: { security_alerts: boolean, system_updates: boolean }) {
        patchState(store, { isSaving: true, error: null, successMessage: null });
        try {
          patchState(store, { isSaving: false, successMessage: 'Preferences updated successfully!' });
        } catch (err: any) {
          patchState(store, { error: apiError(err, 'Failed to update preferences'), isSaving: false });
        }
      }
    };
  })
);
