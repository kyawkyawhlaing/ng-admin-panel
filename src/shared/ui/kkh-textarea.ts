import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'kkh-textarea',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KkhTextareaComponent),
      multi: true
    }
  ],
  host: { class: 'kkh-field' },
  template: `
    <label class="flex flex-col gap-2 w-full">
      @if (label()) {
        <span class="kkh-field-label">{{ label() }}</span>
      }
      <textarea
        class="kkh-input min-h-[5rem] resize-none"
        [attr.rows]="rows()"
        [attr.placeholder]="placeholder() || null"
        [disabled]="isDisabled()"
        [value]="value()"
        (input)="onInput($event)"
        (blur)="onTouched()"
      ></textarea>
      @if (error()) {
        <span class="text-xs text-[var(--kkh-danger)] leading-snug">{{ error() }}</span>
      }
    </label>
  `
})
export class KkhTextareaComponent implements ControlValueAccessor {
  readonly label = input<string | null>(null);
  readonly placeholder = input('');
  readonly rows = input(3);
  readonly error = input<string | null>(null);

  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);

  private onChange: (v: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const next = (event.target as HTMLTextAreaElement).value;
    this.value.set(next);
    this.onChange(next);
  }
}
