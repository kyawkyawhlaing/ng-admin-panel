import { signalStore, withState, withMethods, patchState, withHooks } from '@ngrx/signals';
import { inject, PLATFORM_ID, Signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface ThemeState {
  theme: 'light' | 'dark';
}

const initialState: ThemeState = {
  theme: 'dark',
};

export const ThemeStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, platformId = inject(PLATFORM_ID)) => {
    const isBrowser = isPlatformBrowser(platformId);

    return {
      initTheme(): void {
        if (isBrowser) {
          const stored = localStorage.getItem('theme');
          if (stored === 'light' || stored === 'dark') {
            patchState(store, { theme: stored });
          } else {
            patchState(store, { theme: 'dark' });
          }
        }
      },
      toggleTheme(): void {
        const nextTheme = store.theme() === 'light' ? 'dark' : 'light';
        patchState(store, { theme: nextTheme });
        if (isBrowser) {
          localStorage.setItem('theme', nextTheme);
        }
      }
    };
  }),
  withHooks({
    onInit(store) {
      store.initTheme();

      const platformId = inject(PLATFORM_ID);
      const isBrowser = isPlatformBrowser(platformId);

      effect(() => {
        const theme = store.theme();
        if (isBrowser) {
          const root = document.documentElement;
          if (theme === 'dark') {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      });
    }
  })
);

export interface ThemeStoreType {
  readonly theme: Signal<'light' | 'dark'>;
  toggleTheme(): void;
}
