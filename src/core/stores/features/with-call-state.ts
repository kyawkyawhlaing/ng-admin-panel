import { signalStoreFeature, withState, withComputed } from '@ngrx/signals';
import { computed } from '@angular/core';

export type CallState = 'init' | 'loading' | 'loaded' | { error: string };

export interface CallStateState {
  callState: CallState;
}

export function withCallState() {
  return signalStoreFeature(
    withState<CallStateState>({ callState: 'init' }),
    withComputed(({ callState }) => ({
      isLoading: computed(() => callState() === 'loading'),
      isLoaded: computed(() => callState() === 'loaded'),
      error: computed(() => {
        const state = callState();
        return typeof state === 'object' && state !== null ? state.error : null;
      }),
    }))
  );
}

export function setLoading(): Partial<CallStateState> {
  return { callState: 'loading' };
}

export function setLoaded(): Partial<CallStateState> {
  return { callState: 'loaded' };
}

export function setError(error: string): Partial<CallStateState> {
  return { callState: { error } };
}
