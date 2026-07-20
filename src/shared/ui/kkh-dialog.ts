import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { KkhButtonComponent } from './kkh-button';

@Component({
  selector: 'kkh-dialog',
  standalone: true,
  imports: [KkhButtonComponent],
  host: {
    class: 'contents'
  },
  template: `
    <dialog #dialogRef class="kkh-dialog" [class.kkh-dialog--wide]="wide()" (close)="onNativeClose()">
      <header class="kkh-dialog__header">
        <div class="min-w-0 flex-1 pr-2">
          <h3 class="kkh-title text-base sm:text-lg text-[var(--kkh-text)] leading-snug">{{ title() }}</h3>
          @if (subtitle()) {
            <p class="mt-1.5 text-sm text-[var(--kkh-muted)] leading-relaxed">{{ subtitle() }}</p>
          }
        </div>
        <button
          type="button"
          class="shrink-0 -mr-1 -mt-0.5 flex h-9 w-9 items-center justify-center text-[var(--kkh-muted)] hover:text-[var(--kkh-text)] hover:bg-[var(--kkh-hover)] cursor-pointer"
          style="border-radius: var(--kkh-radius);"
          (click)="close()"
          aria-label="Close"
        >✕</button>
      </header>

      <div class="kkh-dialog__body">
        <ng-content />
      </div>

      @if (showFooter()) {
        <footer class="kkh-dialog__footer">
          <ng-content select="[footer]" />
          @if (showDefaultActions()) {
            <kkh-button variant="ghost" (pressed)="close()">{{ cancelLabel() }}</kkh-button>
            <kkh-button
              variant="primary"
              [disabled]="confirmDisabled()"
              [loading]="confirmLoading()"
              (pressed)="confirmed.emit()"
            >{{ confirmLabel() }}</kkh-button>
          }
        </footer>
      }
    </dialog>
  `
})
export class KkhDialogComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly open = input(false);
  readonly wide = input(false);
  readonly showFooter = input(true);
  readonly showDefaultActions = input(true);
  readonly cancelLabel = input('Cancel');
  readonly confirmLabel = input('Save');
  readonly confirmDisabled = input(false);
  readonly confirmLoading = input(false);

  readonly closed = output<void>();
  readonly confirmed = output<void>();

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogRef');
  /** Avoid re-emitting closed when effect calls dialog.close() after parent already synced. */
  private closingFromInput = false;

  constructor() {
    effect(() => {
      const shouldOpen = this.open();
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) return;

      if (shouldOpen && !dialog.open) {
        dialog.showModal();
      } else if (!shouldOpen && dialog.open) {
        this.closingFromInput = true;
        dialog.close();
        this.closingFromInput = false;
      }
    });
  }

  /** Request close — parent must set `[open]` to false (via `(closed)`). */
  close(): void {
    this.closed.emit();
  }

  protected onNativeClose(): void {
    if (this.closingFromInput) return;
    this.closed.emit();
  }
}
