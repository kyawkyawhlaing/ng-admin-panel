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
          // We can reuse the users endpoint to fetch single user if it existed,
          // but we only have /api/users which returns all users.
          // Let's just fetch all users and find ours, or just use /api/auth/me
          // Since mock backend /users doesn't have a GET /users/:id, we can fetch all and filter.
          const users = await lastValueFrom(http.get<UsersTable[]>('/api/users'));
          const user = users.find(u => u.id === id) || null;
          patchState(store, { userDetails: user, isLoading: false });
        } catch (err: any) {
          patchState(store, { error: 'Failed to load profile', isLoading: false });
        }
      },

      async updatePersonalDetails(id: string, payload: { first_name: string, last_name: string, display_name: string, email: string }) {
        patchState(store, { isSaving: true, error: null, successMessage: null });
        try {
          const updatedUser = await lastValueFrom(http.put<UsersTable>(`/api/users/${id}`, payload));
          patchState(store, { userDetails: updatedUser, isSaving: false, successMessage: 'Personal details updated successfully!' });
          
          // Update global AuthStore
          const currentUser = authStore.user()!;
          authStore.setAuth(
            { ...currentUser, email: payload.email, name: payload.display_name },
            authStore.token()!,
            authStore.roles(),
            authStore.permissions()
          );
        } catch (err: any) {
          patchState(store, { error: err.error?.message || 'Failed to update details', isSaving: false });
        }
      },

      async updatePassword(id: string, payload: any) {
        patchState(store, { isSaving: true, error: null, successMessage: null });
        try {
          await lastValueFrom(http.put(`/api/users/${id}/password`, payload));
          patchState(store, { isSaving: false, successMessage: 'Password updated successfully!' });
        } catch (err: any) {
          patchState(store, { error: err.error?.message || 'Failed to update password', isSaving: false });
        }
      },

      async updatePreferences(id: string, preferences: { security_alerts: boolean, system_updates: boolean }) {
        patchState(store, { isSaving: true, error: null, successMessage: null });
        try {
          const updatedUser = await lastValueFrom(http.put<UsersTable>(`/api/users/${id}`, { preferences }));
          patchState(store, { userDetails: updatedUser, isSaving: false, successMessage: 'Preferences updated successfully!' });
        } catch (err: any) {
          patchState(store, { error: err.error?.message || 'Failed to update preferences', isSaving: false });
        }
      }
    };
  })
);
