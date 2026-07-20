import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'danger' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
  /** Short HUD code, e.g. SEC // OK */
  code: string;
  duration: number;
  createdAt: number;
}

const DEFAULT_CODES: Record<ToastTone, string> = {
  success: 'SEC // OK',
  danger: 'SEC // ALERT',
  warning: 'SEC // WARN',
  info: 'SEC // INFO'
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<ToastMessage[]>([]);

  show(
    text: string,
    tone: ToastTone = 'info',
    duration = 4000,
    code?: string
  ): void {
    if (!text) return;
    // Avoid stacking identical toasts (e.g. repeated 403s from parallel list calls).
    if (this.toasts().some((t) => t.text === text && t.tone === tone)) {
      return;
    }
    const id = this.nextId++;
    this.toasts.update((list) => [
      ...list,
      {
        id,
        text,
        tone,
        code: code?.trim() || DEFAULT_CODES[tone],
        duration,
        createdAt: Date.now()
      }
    ]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(text: string, duration = 3000, code?: string): void {
    this.show(text, 'success', duration, code);
  }

  error(text: string, duration = 5000, code?: string): void {
    this.show(text, 'danger', duration, code);
  }

  warning(text: string, duration = 4500, code?: string): void {
    this.show(text, 'warning', duration, code);
  }

  info(text: string, duration = 4000, code?: string): void {
    this.show(text, 'info', duration, code);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}
