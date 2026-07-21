import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Smartphone,
  Mail,
  ArrowRight
} from 'lucide-angular';
import { formatExpiryLabel } from './auth-channel.util';

@Component({
  selector: 'auth-channel-status-panel',
  standalone: true,
  imports: [DatePipe, RouterLink, LucideAngularModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Smartphone, Mail, ArrowRight })
    }
  ],
  template: `
    <div class="kkh-panel overflow-hidden">
      <div class="border-b border-[var(--kkh-border)] bg-[var(--kkh-raised)] px-6 py-6">
        <div class="flex items-start gap-4">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--kkh-accent)] bg-[var(--kkh-hover)] text-[var(--kkh-accent)]"
            style="border-radius: var(--kkh-radius)"
          >
            <lucide-icon [name]="icon()" class="h-6 w-6" [strokeWidth]="1.75" />
          </div>
          <div class="min-w-0 space-y-2">
            <p class="kkh-label">{{ channelLabel() }}</p>
            <h2 class="text-base font-semibold text-[var(--kkh-text)]">{{ title() }}</h2>
            <span
              class="kkh-chip"
              [class.kkh-chip-ok]="enabled()"
              [class.kkh-chip-muted]="!enabled()"
            >
              {{ enabled() ? 'Channel active' : 'Channel disabled' }}
            </span>
          </div>
        </div>
      </div>

      <div class="space-y-4 px-6 py-5">
        <div class="flex items-center justify-between gap-3 text-sm">
          <span class="kkh-label">Provider</span>
          <span class="kkh-chip kkh-chip-accent">{{ providerName() }}</span>
        </div>
        <div class="flex items-center justify-between gap-3 text-sm">
          <span class="kkh-label">OTP length</span>
          <span class="font-mono text-xs text-[var(--kkh-text)]">{{ otpLength() }} digits</span>
        </div>
        <div class="flex items-center justify-between gap-3 text-sm">
          <span class="kkh-label">Code expiry</span>
          <span class="text-sm text-[var(--kkh-text)]">{{ expiryLabel() }}</span>
        </div>
        <div class="flex items-center justify-between gap-3 text-sm">
          <span class="kkh-label">Rate limit</span>
          <span class="text-sm text-[var(--kkh-text)]">{{ maxAttempts() }} / hour</span>
        </div>

        @if (updatedAt()) {
          <p class="border-t border-[var(--kkh-border)] pt-4 text-xs leading-relaxed text-[var(--kkh-muted)]">
            Last updated {{ updatedAt() | date:'yyyy-MM-dd HH:mm' }}
            @if (updatedBy()) {
              <span>by {{ updatedBy() }}</span>
            }
          </p>
        }
      </div>

      <div class="border-t border-[var(--kkh-border)] bg-[var(--kkh-raised)] px-6 py-4">
        <a
          routerLink="/admin/authentication-routes"
          class="group flex items-center justify-between gap-3 text-sm font-medium text-[var(--kkh-accent)] hover:underline"
        >
          <span>Configure protected API endpoints</span>
          <lucide-icon name="arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-0.5" [strokeWidth]="2" />
        </a>
        <p class="mt-2 text-xs text-[var(--kkh-muted)]">
          Choose which API endpoints use this channel for step-up authentication.
        </p>
      </div>
    </div>
  `
})
export class AuthChannelStatusPanelComponent {
  readonly icon = input.required<'smartphone' | 'mail'>();
  readonly channelLabel = input.required<string>();
  readonly title = input.required<string>();
  readonly enabled = input(false);
  readonly providerName = input('—');
  readonly otpLength = input(6);
  readonly otpExpirySeconds = input(300);
  readonly maxAttempts = input(5);
  readonly updatedAt = input<string | null | undefined>(null);
  readonly updatedBy = input<string | null | undefined>(null);

  protected expiryLabel(): string {
    return formatExpiryLabel(this.otpExpirySeconds());
  }
}
