import { Component, inject } from '@angular/core';
import { ThemeStore } from '../../../core/stores/theme-store';
import { KkhPageHeaderComponent, KkhButtonComponent } from '../../../shared/ui';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [KkhPageHeaderComponent, KkhButtonComponent],
  template: `
    <div class="space-y-8 max-w-3xl kkh-page-enter">
      <kkh-page-header
        eyebrow="Preferences"
        title="Settings"
        description="Console appearance and display preferences."
      />

      <div class="kkh-panel p-6 relative">
        <div class="kkh-rail"></div>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-sm font-semibold text-[var(--kkh-text)]">Display theme</h2>
            <p class="mt-1 text-sm text-[var(--kkh-muted)]">Defaults to dark. Switch to a lighter corporate surface set when needed.</p>
            <p class="mt-3 kkh-label">Active: {{ themeStore.theme() }}</p>
          </div>
          <kkh-button variant="secondary" (pressed)="themeStore.toggleTheme()">Toggle theme</kkh-button>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent {
  protected readonly themeStore = inject(ThemeStore);
}
