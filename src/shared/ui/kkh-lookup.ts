import { Component, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ListDataSource } from '../data/list-datasource';
import { SelectOption } from '../data/list.types';
import { createDebouncedTask, SEARCH_DEBOUNCE_MS } from '../util/debounce';

/**
 * Typeahead lookup bound to a list API endpoint.
 * Emits the selected option value via CVA.
 */
@Component({
  selector: 'kkh-lookup',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KkhLookupComponent),
      multi: true
    }
  ],
  template: `
    <label class="block space-y-1.5 relative">
      @if (label()) {
        <span class="kkh-field-label">{{ label() }}</span>
      }
      <div class="relative">
        <input
          class="kkh-input pr-8"
          type="search"
          [placeholder]="placeholder()"
          [disabled]="isDisabled()"
          [value]="display()"
          (focus)="onFocus()"
          (input)="onType($event)"
          (blur)="onBlur()"
        />
        @if (value()) {
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--kkh-muted)] hover:text-[var(--kkh-text)] cursor-pointer"
            (mousedown)="$event.preventDefault(); clear()"
            aria-label="Clear"
          >✕</button>
        }
      </div>
      @if (open()) {
        <div class="absolute z-40 left-0 right-0 mt-1 max-h-56 overflow-y-auto kkh-panel">
          @if (loading()) {
            <p class="px-3 py-2 text-sm text-[var(--kkh-muted)]">Searching…</p>
          } @else if (results().length === 0) {
            <p class="px-3 py-2 text-sm text-[var(--kkh-muted)]">No results</p>
          } @else {
            @for (opt of results(); track opt.value) {
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm hover:bg-[var(--kkh-hover)] cursor-pointer"
                (mousedown)="$event.preventDefault(); pick(opt)"
              >
                <span class="block text-[var(--kkh-text)]">{{ opt.label }}</span>
                @if (opt.description) {
                  <span class="block text-xs text-[var(--kkh-muted)]">{{ opt.description }}</span>
                }
              </button>
            }
          }
        </div>
      }
      @if (error()) {
        <span class="block text-xs text-[var(--kkh-danger)]">{{ error() }}</span>
      }
    </label>
  `
})
export class KkhLookupComponent implements ControlValueAccessor {
  private readonly listDs = inject(ListDataSource);

  readonly label = input<string | null>(null);
  readonly placeholder = input('Lookup…');
  readonly endpoint = input.required<string>();
  readonly mapItem = input<(item: any) => SelectOption>((item) => ({
    value: String(item.id ?? item.status ?? item.value),
    label: String(item.name ?? item.status ?? item.label ?? item.id),
    description: item.description ?? item.api_path
  }));
  readonly pageSize = input(20);
  readonly error = input<string | null>(null);

  protected readonly value = signal('');
  protected readonly labelText = signal('');
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly results = signal<SelectOption[]>([]);
  protected readonly isDisabled = signal(false);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};
  private blurTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debouncedSearch = createDebouncedTask(SEARCH_DEBOUNCE_MS);

  protected display(): string {
    if (this.open()) return this.query();
    return this.labelText() || this.value();
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
    if (!value) this.labelText.set('');
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

  protected onFocus(): void {
    if (this.blurTimer) clearTimeout(this.blurTimer);
    this.open.set(true);
    this.query.set(this.labelText() || this.value());
    void this.search(this.query());
  }

  protected onType(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.query.set(text);
    this.open.set(true);
    this.debouncedSearch.schedule(() => this.search(text));
  }

  protected onBlur(): void {
    this.blurTimer = setTimeout(() => {
      this.open.set(false);
      this.onTouched();
    }, 150);
  }

  protected pick(opt: SelectOption): void {
    this.value.set(String(opt.value));
    this.labelText.set(opt.label);
    this.query.set(opt.label);
    this.onChange(String(opt.value));
    this.open.set(false);
  }

  protected clear(): void {
    this.value.set('');
    this.labelText.set('');
    this.query.set('');
    this.onChange('');
  }

  private async search(term: string): Promise<void> {
    this.loading.set(true);
    try {
      const items = await this.listDs.searchOptions(
        this.endpoint(),
        term,
        (item) => this.mapItem()(item),
        this.pageSize()
      );
      this.results.set(items);
    } catch {
      this.results.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
