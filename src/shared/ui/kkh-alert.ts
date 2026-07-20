import { Component, input, output } from '@angular/core';

export type KkhAlertTone = 'success' | 'danger' | 'info' | 'warning';

@Component({
  selector: 'kkh-alert',
  standalone: true,
  template: `
    <div
      class="flex items-start justify-between gap-3 border p-3.5 text-sm"
      [style.border-radius]="'var(--kkh-radius)'"
      [class]="toneClass()"
      role="alert"
    >
      <div class="min-w-0 flex-1">
        @if (title()) {
          <p class="font-semibold mb-0.5">{{ title() }}</p>
        }
        <div class="text-[0.875rem] leading-relaxed">
          <ng-content />
        </div>
      </div>
      @if (dismissible()) {
        <button
          type="button"
          class="shrink-0 opacity-70 hover:opacity-100 cursor-pointer text-lg leading-none"
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
  readonly dismissible = input(false);
  readonly dismissed = output<void>();

  protected toneClass(): string {
    const map: Record<KkhAlertTone, string> = {
      success: 'border-[var(--kkh-ok)] bg-[color-mix(in_srgb,var(--kkh-ok)_8%,transparent)] text-[var(--kkh-ok)]',
      danger: 'border-[var(--kkh-danger)] bg-[color-mix(in_srgb,var(--kkh-danger)_8%,transparent)] text-[var(--kkh-danger)]',
      info: 'border-[var(--kkh-info)] bg-[color-mix(in_srgb,var(--kkh-info)_8%,transparent)] text-[var(--kkh-info)]',
      warning: 'border-[var(--kkh-warning)] bg-[color-mix(in_srgb,var(--kkh-warning)_8%,transparent)] text-[var(--kkh-warning)]'
    };
    return map[this.tone()];
  }
}
