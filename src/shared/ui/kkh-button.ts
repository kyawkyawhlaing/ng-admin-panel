import { Component, input, output } from '@angular/core';

export type KkhButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

@Component({
  selector: 'kkh-button',
  standalone: true,
  host: {
    '[class.kkh-host-full]': 'fullWidth()'
  },
  template: `
    <button
      [attr.type]="type()"
      [attr.form]="form()"
      [disabled]="disabled() || loading()"
      [class]="hostClass()"
      (click)="pressed.emit($event)"
    >
      @if (loading()) {
        <span class="kkh-spinner-cyber" aria-hidden="true"></span>
      }
      <ng-content />
    </button>
  `
})
export class KkhButtonComponent {
  readonly variant = input<KkhButtonVariant>('secondary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  /** Associates submit/reset with a form when the button sits outside the form (e.g. dialog footer). */
  readonly form = input<string | null>(null);
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly fullWidth = input(false);
  readonly pressed = output<MouseEvent>();

  protected hostClass(): string {
    const base = 'kkh-btn';
    const map: Record<KkhButtonVariant, string> = {
      primary: 'kkh-btn-primary',
      secondary: '',
      ghost: 'kkh-btn-ghost',
      danger: 'kkh-btn-danger'
    };
    return [
      base,
      map[this.variant()],
      this.fullWidth() ? 'w-full' : '',
      this.loading() ? 'kkh-btn-loading' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }
}
