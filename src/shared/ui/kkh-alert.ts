import { Component, input, output } from '@angular/core';

export type KkhAlertTone = 'success' | 'danger' | 'info' | 'warning';

const DEFAULT_CODES: Record<KkhAlertTone, string> = {
  success: 'SEC // OK',
  danger: 'SEC // ALERT',
  warning: 'SEC // WARN',
  info: 'SEC // INFO'
};

@Component({
  selector: 'kkh-alert',
  standalone: true,
  template: `
    <div
      class="kkh-alert"
      [class]="toneClass()"
      [class.kkh-alert--scan]="scan()"
      role="alert"
    >
      <div class="kkh-alert__corners" aria-hidden="true"></div>
      <div class="kkh-alert__content">
        <div class="kkh-alert__head">
          <span class="kkh-alert__code">{{ resolvedCode() }}</span>
          @if (title()) {
            <span class="kkh-alert__title">{{ title() }}</span>
          }
        </div>
        <div class="kkh-alert__body">
          <ng-content />
        </div>
      </div>
      @if (dismissible()) {
        <button
          type="button"
          class="kkh-alert__close"
          (click)="dismissed.emit()"
          aria-label="Dismiss"
        >✕</button>
      }
    </div>
  `
})
export class KkhAlertComponent {
  readonly tone = input<KkhAlertTone>('info');
  readonly title = input<string | null>(null);
  /** Override HUD code; defaults by tone (SEC // OK, …). */
  readonly code = input<string | null>(null);
  readonly dismissible = input(false);
  /** Soft scanline wash (cyber HUD). */
  readonly scan = input(true);
  readonly dismissed = output<void>();

  protected resolvedCode(): string {
    return this.code()?.trim() || DEFAULT_CODES[this.tone()];
  }

  protected toneClass(): string {
    return `kkh-alert--${this.tone()}`;
  }
}
