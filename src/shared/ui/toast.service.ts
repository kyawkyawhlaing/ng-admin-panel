import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'danger' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<ToastMessage[]>([]);

  show(text: string, tone: ToastTone = 'info', duration = 4000): void {
    if (!text) return;
    // Avoid stacking identical toasts (e.g. repeated 403s from parallel list calls).
    if (this.toasts().some((t) => t.text === text && t.tone === tone)) {
      return;
    }
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, text, tone, duration }]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(text: string, duration = 3000): void {
    this.show(text, 'success', duration);
  }

  error(text: string, duration = 5000): void {
    this.show(text, 'danger', duration);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
