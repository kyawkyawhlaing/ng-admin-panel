import { Component, inject } from '@angular/core';
import { ToastService, ToastTone } from './toast.service';

@Component({
  selector: 'kkh-toast-host',
  standalone: true,
  template: `
    <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(100%-2rem,22rem)] pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start justify-between gap-3 border px-3.5 py-3 text-sm shadow-sm"
          style="border-radius: var(--kkh-radius); background: var(--kkh-panel);"
          [class]="toneClass(toast.tone)"
          role="status"
        >
          <p class="min-w-0 flex-1 leading-snug">{{ toast.text }}</p>
          <button
            type="button"
            class="shrink-0 opacity-70 hover:opacity-100 cursor-pointer leading-none"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Dismiss"
          >✕</button>
        </div>
      }
    </div>
  `
})
export class KkhToastHostComponent {
  protected readonly toastService = inject(ToastService);

  protected toneClass(tone: ToastTone): string {
    const map: Record<ToastTone, string> = {
      success: 'border-[var(--kkh-ok)] text-[var(--kkh-ok)]',
      danger: 'border-[var(--kkh-danger)] text-[var(--kkh-danger)]',
      info: 'border-[var(--kkh-info)] text-[var(--kkh-info)]',
      warning: 'border-[var(--kkh-warning)] text-[var(--kkh-warning)]'
    };
    return map[tone];
  }
}
