import { Component, inject } from '@angular/core';
import { ToastService, ToastTone } from './toast.service';

@Component({
  selector: 'kkh-toast-host',
  standalone: true,
  template: `
    <div class="kkh-toast-stack" aria-live="polite" aria-relevant="additions">
      @for (toast of toastService.toasts(); track toast.id) {
        <article
          class="kkh-toast"
          [class]="toneClass(toast.tone)"
          role="status"
          [style.--kkh-toast-ttl]="toast.duration > 0 ? toast.duration + 'ms' : '0ms'"
        >
          <div class="kkh-toast__corners" aria-hidden="true"></div>
          <header class="kkh-toast__head">
            <span class="kkh-toast__code">{{ toast.code }}</span>
            <button
              type="button"
              class="kkh-toast__close"
              (click)="toastService.dismiss(toast.id)"
              aria-label="Dismiss"
            >✕</button>
          </header>
          <p class="kkh-toast__body">{{ toast.text }}</p>
          @if (toast.duration > 0) {
            <div class="kkh-toast__ttl" aria-hidden="true">
              <span class="kkh-toast__ttl-fill"></span>
            </div>
          }
        </article>
      }
    </div>
  `
})
export class KkhToastHostComponent {
  protected readonly toastService = inject(ToastService);

  protected toneClass(tone: ToastTone): string {
    return `kkh-toast--${tone}`;
  }
}
