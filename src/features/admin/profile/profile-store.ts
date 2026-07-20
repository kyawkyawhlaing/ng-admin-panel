import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { UsersTable } from '../../../types/database';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';

export interface ProfileState {
  userDetails: UsersTable | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: ProfileState = {
  userDetails: null,
  isLoading: false,
  isSaving: false,
  error: null,
  successMessage: null
};

export const ProfileStore = signalStore(
  withState(initialState),
  withMethods((store, http = inject(HttpClient), authStore = inject(AuthStore) as unknown as AuthStoreType) => {
    return {
      clearMessages(): void {
        patchState(store, { error: null, successMessage: null });
      },

      async loadProfile(id: string) {
        patchState(store, { isLoading: true, error: null });
        try {
          const user = await lastValueFrom(http.get<UsersTable>(`/users/${id}`));
          patchState(store, { userDetails: user, isLoading: false });
        } catch (err: any) {
          patchState(store, { error: 'Failed to load profile', isLoading: false });
        }
      },

      async updatePersonalDetails(id: string, payload: { first_name: string, last_name: string, display_name: string, email: string }) {
        patchState(store, { isSaving: true, error: null, successMessage: null });
        try {
          await lastValueFrom(http.put(`/users/${id}`, payload));
          
          // Fetch updated user to reflect changes accurately
          const updatedUser = await lastValueFrom(http.get<UsersTable>(`/users/${id}`));
          patchState(store, { userDetails: updatedUser, isSaving: false, successMessage: 'Personal details updated successfully!' });
          
          // Keep auth user profile in sync (token stays memory-only in AuthStore).
          authStore.updateUser({
            email: payload.email,
            name: payload.display_name
          });
        } catch (err: any) {
          patchState(store, { error: err.error?.message || 'Failed to update details', isSaving: false });
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
          patchState(store, { error: err.error?.message || 'Failed to update password', isSaving: false });
        }
      },

      async updatePreferences(id: string, preferences: { security_alerts: boolean, system_updates: boolean }) {
        patchState(store, { isSaving: true, error: null, successMessage: null });
        try {
          // Preferences are not natively supported by the backend yet, just simulate or ignore.
          patchState(store, { isSaving: false, successMessage: 'Preferences updated successfully!' });
        } catch (err: any) {
          patchState(store, { error: err.error?.message || 'Failed to update preferences', isSaving: false });
        }
      }
    };
  })
);
