import { Component, computed, input } from '@angular/core';

export type KkhProgressTone = 'accent' | 'success' | 'danger' | 'warning' | 'info';

@Component({
  selector: 'kkh-progress',
  standalone: true,
  host: {
    class: 'kkh-progress-host'
  },
  template: `
    <div
      class="kkh-progress"
      [class]="toneClass()"
      [class.kkh-progress--indeterminate]="indeterminate()"
      role="progressbar"
      [attr.aria-valuemin]="indeterminate() ? null : 0"
      [attr.aria-valuemax]="indeterminate() ? null : 100"
      [attr.aria-valuenow]="indeterminate() ? null : clamped()"
      [attr.aria-label]="label() || 'Progress'"
      [attr.aria-busy]="indeterminate() ? true : null"
    >
      @if (label() || showValue()) {
        <div class="kkh-progress__meta">
          @if (label()) {
            <span class="kkh-progress__label">{{ label() }}</span>
          }
          @if (showValue() && !indeterminate()) {
            <span class="kkh-progress__value">{{ clamped() }}%</span>
          }
          @if (indeterminate()) {
            <span class="kkh-progress__value">SCAN</span>
          }
        </div>
      }
      <div class="kkh-progress__track">
        <div
          class="kkh-progress__fill"
          [style.width.%]="indeterminate() ? null : clamped()"
        ></div>
      </div>
    </div>
  `
})
export class KkhProgressComponent {
  /** 0–100 when determinate. Ignored when indeterminate. */
  readonly value = input(0);
  readonly indeterminate = input(false);
  readonly tone = input<KkhProgressTone>('accent');
  readonly label = input<string | null>(null);
  readonly showValue = input(false);

  protected readonly clamped = computed(() => {
    const v = this.value();
    if (Number.isNaN(v)) return 0;
    return Math.min(100, Math.max(0, Math.round(v)));
  });

  protected toneClass(): string {
    return `kkh-progress--${this.tone()}`;
  }
}
