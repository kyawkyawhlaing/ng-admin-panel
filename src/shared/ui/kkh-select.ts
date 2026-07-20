import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectOption } from '../data/list.types';

@Component({
  selector: 'kkh-select',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KkhSelectComponent),
      multi: true
    }
  ],
  host: {
    class: 'kkh-field'
  },
  template: `
    <label class="flex flex-col gap-2 w-full">
      @if (label()) {
        <span class="kkh-field-label">{{ label() }}</span>
      }
      <select
        class="kkh-input"
        [disabled]="isDisabled()"
        [value]="value()"
        (change)="onSelect($event)"
        (blur)="onTouched()"
      >
        @if (placeholder()) {
          <option value="" disabled [selected]="!value()">{{ placeholder() }}</option>
        }
        @for (opt of options(); track opt.value) {
          <option [value]="opt.value" [disabled]="opt.disabled === true">{{ opt.label }}</option>
        }
      </select>
      @if (error()) {
        <span class="text-xs text-[var(--kkh-danger)] leading-snug">{{ error() }}</span>
      }
    </label>
  `
})
export class KkhSelectComponent implements ControlValueAccessor {
  readonly label = input<string | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly options = input<SelectOption[]>([]);
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

  protected onSelect(event: Event): void {
    const next = (event.target as HTMLSelectElement).value;
    this.value.set(next);
    this.onChange(next);
  }
}
