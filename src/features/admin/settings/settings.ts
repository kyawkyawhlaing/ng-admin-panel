import { Component, inject } from '@angular/core';
import { ThemeStore } from '../../../core/stores/theme-store';
import { KkhPageHeaderComponent, KkhButtonComponent, KkhAlertComponent } from '../../../shared/ui';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [KkhPageHeaderComponent, KkhButtonComponent, KkhAlertComponent],
  template: `
    <div class="space-y-8 max-w-3xl kkh-page-enter">
      <kkh-page-header
        eyebrow="Preferences"
        title="Settings"
        description="Console appearance. MFA endpoints are not available on this API build."
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

      <kkh-alert tone="info" title="Security note">
        Two-factor authentication UI was removed because Dotnet-NTier does not expose MFA APIs yet.
        Use strong passwords and role-scoped permissions instead.
      </kkh-alert>
    </div>
  `
})
export class SettingsComponent {
  protected readonly themeStore = inject(ThemeStore);
}
