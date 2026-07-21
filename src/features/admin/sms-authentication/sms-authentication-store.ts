import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { ToastService } from '../../../shared/ui/toast.service';
import { SmsAuthenticationSettings } from '../../../types/authentication';

interface SmsAuthenticationState {
  settings: SmsAuthenticationSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: SmsAuthenticationState = {
  settings: null,
  isLoading: false,
  isSaving: false,
  error: null,
  successMessage: null
};

function apiError(err: any, fallback: string): string {
  return err?.error?.detail || err?.error?.title || err?.error?.message || fallback;
}

export const SmsAuthenticationStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient), toast = inject(ToastService)) => ({
    clearMessages(): void {
      patchState(store, { error: null, successMessage: null });
    },

    async loadSettings(): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const settings = await lastValueFrom(http.get<SmsAuthenticationSettings>('/authentication/sms'));
        patchState(store, { settings, isLoading: false });
      } catch (err: any) {
        patchState(store, { error: apiError(err, 'Failed to load SMS authentication settings'), isLoading: false });
      }
    },

    async saveSettings(payload: Record<string, unknown>): Promise<boolean> {
      patchState(store, { isSaving: true, error: null, successMessage: null });
      try {
        await lastValueFrom(http.put('/authentication/sms', payload));
        await this.loadSettings();
        patchState(store, {
          isSaving: false,
          successMessage: 'SMS authentication settings saved.'
        });
        toast.success('SMS authentication settings saved.');
        return true;
      } catch (err: any) {
        const message = apiError(err, 'Failed to save SMS authentication settings');
        patchState(store, { error: message, isSaving: false });
        toast.error(message);
        return false;
      }
    }
  }))
);
