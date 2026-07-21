import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { ToastService } from '../../../shared/ui/toast.service';
import { EmailAuthenticationSettings } from '../../../types/authentication';

interface EmailAuthenticationState {
  settings: EmailAuthenticationSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: EmailAuthenticationState = {
  settings: null,
  isLoading: false,
  isSaving: false,
  error: null,
  successMessage: null
};

function apiError(err: any, fallback: string): string {
  return err?.error?.detail || err?.error?.title || err?.error?.message || fallback;
}

export const EmailAuthenticationStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient), toast = inject(ToastService)) => ({
    clearMessages(): void {
      patchState(store, { error: null, successMessage: null });
    },

    async loadSettings(): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const settings = await lastValueFrom(http.get<EmailAuthenticationSettings>('/authentication/email'));
        patchState(store, { settings, isLoading: false });
      } catch (err: any) {
        patchState(store, { error: apiError(err, 'Failed to load email authentication settings'), isLoading: false });
      }
    },

    async saveSettings(payload: Record<string, unknown>): Promise<boolean> {
      patchState(store, { isSaving: true, error: null, successMessage: null });
      try {
        await lastValueFrom(http.put('/authentication/email', payload));
        await this.loadSettings();
        patchState(store, {
          isSaving: false,
          successMessage: 'Email authentication settings saved.'
        });
        toast.success('Email authentication settings saved.');
        return true;
      } catch (err: any) {
        const message = apiError(err, 'Failed to save email authentication settings');
        patchState(store, { error: message, isSaving: false });
        toast.error(message);
        return false;
      }
    }
  }))
);
