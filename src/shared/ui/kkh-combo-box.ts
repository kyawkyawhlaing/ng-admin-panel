import { Component, computed, ElementRef, forwardRef, inject, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ListDataSource } from '../data/list-datasource';
import { SelectOption } from '../data/list.types';
import { createDebouncedTask, SEARCH_DEBOUNCE_MS } from '../util/debounce';

@Component({
  selector: 'kkh-combo-box',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KkhComboBoxComponent),
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
      <input
        #inputRef
        class="kkh-input"
        type="text"
        role="combobox"
        [attr.aria-expanded]="open()"
        [placeholder]="placeholder()"
        [disabled]="isDisabled()"
        [value]="display()"
        (focus)="onFocus()"
        (input)="onType($event)"
        (blur)="onBlur()"
      />
      @if (open()) {
        <div
          class="fixed z-[200] max-h-56 overflow-y-auto border border-[var(--kkh-border)] bg-[var(--kkh-panel)]"
          style="border-radius: var(--kkh-radius); box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);"
          [style.top.px]="panelTop()"
          [style.left.px]="panelLeft()"
          [style.width.px]="panelWidth()"
        >
          @if (loading()) {
            <p class="px-3 py-2.5 text-sm text-[var(--kkh-muted)]">Loading…</p>
          } @else if (filtered().length === 0) {
            <p class="px-3 py-2.5 text-sm text-[var(--kkh-muted)]">No matches</p>
          } @else {
            @for (opt of filtered(); track opt.value) {
              <button
                type="button"
                class="w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--kkh-hover)] cursor-pointer"
                [class.bg-[var(--kkh-hover)]]="opt.value === value()"
                (mousedown)="$event.preventDefault(); pick(opt)"
              >
                <span class="block text-[var(--kkh-text)]">{{ opt.label }}</span>
                @if (opt.description) {
                  <span class="block text-xs text-[var(--kkh-muted)] mt-0.5">{{ opt.description }}</span>
                }
              </button>
            }
          }
        </div>
      }
      @if (error()) {
        <span class="text-xs text-[var(--kkh-danger)] leading-snug">{{ error() }}</span>
      }
    </label>
  `
})
export class KkhComboBoxComponent implements ControlValueAccessor {
  private readonly listDs = inject(ListDataSource);
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('inputRef');

  readonly label = input<string | null>(null);
  readonly placeholder = input('Search…');
  readonly options = input<SelectOption[]>([]);
  /** Prepended options (e.g. "Root") shown above API results. */
  readonly extraOptions = input<SelectOption[]>([]);
  /** When set, loads options from POST endpoint using ListQuery.searchTerm */
  readonly endpoint = input<string | null>(null);
  readonly mapItem = input<(item: any) => SelectOption>((item) => ({
    value: String(item.id ?? item.name ?? item.status ?? item.value),
    label: String(item.name ?? item.label ?? item.status ?? item.id),
    description: item.description ?? item.route ?? item.api_path ?? undefined
  }));
  readonly error = input<string | null>(null);

  protected readonly value = signal('');
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly remoteOptions = signal<SelectOption[]>([]);
  protected readonly resolvedLabel = signal('');
  protected readonly isDisabled = signal(false);
  protected readonly panelTop = signal(0);
  protected readonly panelLeft = signal(0);
  protected readonly panelWidth = signal(0);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};
  private blurTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debouncedRemoteSearch = createDebouncedTask(SEARCH_DEBOUNCE_MS);

  protected readonly filtered = computed(() => {
    const extras = this.extraOptions();
    const base = this.endpoint() ? this.remoteOptions() : this.options();
    const seen = new Set<string>();
    const merged: SelectOption[] = [];
    for (const opt of [...extras, ...base]) {
      const key = String(opt.value);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(opt);
    }

    const q = this.query().trim().toLowerCase();
    if (!q || this.endpoint()) return merged;
    return merged.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.description?.toLowerCase().includes(q) ?? false)
    );
  });

  protected display(): string {
    if (this.open()) return this.query();
    const match = this.findOption(this.value());
    return match?.label ?? (this.resolvedLabel() || this.value());
  }

  writeValue(value: string | null): void {
    const next = value ?? '';
    this.value.set(next);
    this.query.set('');
    if (next) {
      const local = this.findOption(next);
      if (local) {
        this.resolvedLabel.set(local.label);
      } else if (this.endpoint()) {
        void this.refreshRemote('').then(() => {
          const match = this.findOption(next);
          this.resolvedLabel.set(match?.label ?? next);
        });
      } else {
        this.resolvedLabel.set(next);
      }
    } else {
      this.resolvedLabel.set('');
    }
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
    const current = this.findOption(this.value());
    this.query.set(current?.label ?? (this.resolvedLabel() || this.value()));
    this.syncPanel();
    // Load full page on open; typing will refine via searchTerm
    void this.refreshRemote('');
  }

  protected onType(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.query.set(text);
    this.open.set(true);
    this.syncPanel();
    this.debouncedRemoteSearch.schedule(() => this.refreshRemote(text));
  }

  protected onBlur(): void {
    this.blurTimer = setTimeout(() => {
      this.open.set(false);
      this.onTouched();
    }, 150);
  }

  protected pick(opt: SelectOption): void {
    this.value.set(String(opt.value));
    this.query.set(opt.label);
    this.resolvedLabel.set(opt.label);
    this.onChange(String(opt.value));
    this.open.set(false);
  }

  private findOption(value: string): SelectOption | undefined {
    if (!value) return undefined;
    return this.filtered().find((o) => String(o.value) === value)
      ?? this.extraOptions().find((o) => String(o.value) === value)
      ?? this.remoteOptions().find((o) => String(o.value) === value)
      ?? this.options().find((o) => String(o.value) === value);
  }

  private syncPanel(): void {
    const el = this.inputRef()?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    this.panelTop.set(rect.bottom + 4);
    this.panelLeft.set(rect.left);
    this.panelWidth.set(rect.width);
  }

  private async refreshRemote(term: string): Promise<void> {
    const url = this.endpoint();
    if (!url) return;
    this.loading.set(true);
    try {
      const items = await this.listDs.searchOptions(url, term, (item) => this.mapItem()(item));
      this.remoteOptions.set(items);
    } catch {
      this.remoteOptions.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
