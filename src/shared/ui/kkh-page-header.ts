import { Component, input } from '@angular/core';

@Component({
  selector: 'kkh-page-header',
  standalone: true,
  template: `
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--kkh-border)] pb-6">
      <div class="min-w-0">
        @if (eyebrow()) {
          <p class="kkh-label text-[var(--kkh-accent)]">{{ eyebrow() }}</p>
        }
        <h1 class="kkh-title mt-2 text-3xl text-[var(--kkh-text)]">{{ title() }}</h1>
        @if (description()) {
          <p class="mt-2 text-sm text-[var(--kkh-muted)] max-w-2xl">{{ description() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <ng-content select="[actions]" />
        <ng-content />
      </div>
    </div>
  `
})
export class KkhPageHeaderComponent {
  readonly eyebrow = input<string | null>(null);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
