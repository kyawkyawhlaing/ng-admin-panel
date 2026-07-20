import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TransferItem } from '../data/list.types';
import { isAccessAction } from '../../core/auth/permission.util';
import { createDebouncedTask, LOCAL_FILTER_DEBOUNCE_MS } from '../util/debounce';
import { KkhButtonComponent } from './kkh-button';
import { KkhDialogComponent } from './kkh-dialog';

@Component({
  selector: 'kkh-transfer',
  standalone: true,
  imports: [KkhDialogComponent, KkhButtonComponent],
  template: `
    <kkh-dialog
      [open]="open()"
      [title]="title()"
      [subtitle]="subtitle()"
      [wide]="true"
      [showDefaultActions]="true"
      confirmLabel="Apply"
      (closed)="closed.emit()"
      (confirmed)="onConfirm()"
    >
      <div class="space-y-3">
        @if (enforceAccessPrerequisite()) {
          <p class="text-xs text-[var(--kkh-muted)] leading-snug">
            <span class="text-[var(--kkh-accent)] font-semibold uppercase tracking-wide">Rule:</span>
            assign <code class="text-[var(--kkh-text)]">*_access</code> before view/create/edit/delete.
            Removing access also clears that resource’s other permissions.
          </p>
        }

        <input
          class="kkh-input"
          type="search"
          placeholder="Filter items…"
          [value]="filterInput()"
          (input)="onFilterInput(($any($event.target)).value)"
        />

        <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          <div class="kkh-raised p-3 min-h-[220px] flex flex-col">
            <p class="kkh-label mb-2">Available ({{ availableFiltered().length }})</p>
            <div class="flex-1 overflow-y-auto space-y-1 max-h-56">
              @for (item of availableFiltered(); track item.id) {
                @let locked = isLockedWithoutAccess(item);
                <label
                  class="flex items-start gap-2 px-2 py-1.5"
                  [class.hover:bg-[var(--kkh-hover)]]="!locked"
                  [class.cursor-pointer]="!locked"
                  [class.opacity-45]="locked"
                  [class.cursor-not-allowed]="locked"
                >
                  <input
                    type="checkbox"
                    class="mt-1"
                    [checked]="leftSelected().has(item.id)"
                    [disabled]="locked"
                    (change)="toggleLeft(item.id)"
                  />
                  <span>
                    <span class="block text-sm text-[var(--kkh-text)]">{{ item.name }}</span>
                    @if (item.description) {
                      <span class="block text-xs text-[var(--kkh-muted)]">{{ item.description }}</span>
                    }
                    @if (locked) {
                      <span class="block text-xs text-[var(--kkh-danger)] mt-0.5">Requires {{ item.resource }}_access first</span>
                    }
                  </span>
                </label>
              } @empty {
                <p class="text-sm text-[var(--kkh-muted)] px-2 py-4 text-center">None</p>
              }
            </div>
          </div>

          <div class="flex md:flex-col items-center justify-center gap-2">
            <kkh-button variant="secondary" [disabled]="movableLeftCount() === 0" (pressed)="moveRight()">→</kkh-button>
            <kkh-button variant="secondary" [disabled]="rightSelected().size === 0" (pressed)="moveLeft()">←</kkh-button>
          </div>

          <div class="kkh-raised p-3 min-h-[220px] flex flex-col">
            <p class="kkh-label mb-2">Assigned ({{ assignedFiltered().length }})</p>
            <div class="flex-1 overflow-y-auto space-y-1 max-h-56">
              @for (item of assignedFiltered(); track item.id) {
                <label class="flex items-start gap-2 px-2 py-1.5 hover:bg-[var(--kkh-hover)] cursor-pointer">
                  <input type="checkbox" class="mt-1" [checked]="rightSelected().has(item.id)" (change)="toggleRight(item.id)" />
                  <span>
                    <span class="block text-sm text-[var(--kkh-text)]">{{ item.name }}</span>
                    @if (item.description) {
                      <span class="block text-xs text-[var(--kkh-muted)]">{{ item.description }}</span>
                    }
                  </span>
                </label>
              } @empty {
                <p class="text-sm text-[var(--kkh-muted)] px-2 py-4 text-center">None</p>
              }
            </div>
          </div>
        </div>
      </div>
    </kkh-dialog>
  `
})
export class KkhTransferComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly allItems = input.required<TransferItem[]>();
  readonly assignedItemIds = input.required<string[]>();
  /** When true, non-access items stay locked until `{resource}_access` is assigned. */
  readonly enforceAccessPrerequisite = input(false);

  readonly assigned = output<string[]>();
  readonly closed = output<void>();

  protected readonly filterInput = signal('');
  protected readonly filter = signal('');
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly leftSelected = signal(new Set<string>());
  protected readonly rightSelected = signal(new Set<string>());
  private readonly debouncedFilter = createDebouncedTask(LOCAL_FILTER_DEBOUNCE_MS);

  constructor() {
    effect(() => {
      this.selectedIds.set([...this.assignedItemIds()]);
      this.leftSelected.set(new Set());
      this.rightSelected.set(new Set());
      this.filterInput.set('');
      this.filter.set('');
      this.debouncedFilter.cancel();
    });
  }

  protected onFilterInput(value: string): void {
    this.filterInput.set(value);
    this.debouncedFilter.schedule(() => this.filter.set(value));
  }

  private matches(item: TransferItem): boolean {
    const q = this.filter().trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.description?.toLowerCase().includes(q) ?? false)
    );
  }

  private itemById(id: string): TransferItem | undefined {
    return this.allItems().find((i) => i.id === id);
  }

  private hasAccessForResource(resource: string | undefined, selected: Set<string>): boolean {
    if (!resource) return true;
    for (const id of selected) {
      const item = this.itemById(id);
      if (item?.resource === resource && isAccessAction(item.action)) {
        return true;
      }
    }
    return false;
  }

  protected isLockedWithoutAccess(item: TransferItem): boolean {
    if (!this.enforceAccessPrerequisite()) return false;
    if (!item.resource || isAccessAction(item.action)) return false;
    return !this.hasAccessForResource(item.resource, new Set(this.selectedIds()));
  }

  protected readonly availableFiltered = computed(() => {
    const assigned = new Set(this.selectedIds());
    return this.allItems().filter((i) => !assigned.has(i.id) && this.matches(i));
  });

  protected readonly assignedFiltered = computed(() => {
    const map = new Map(this.allItems().map((i) => [i.id, i]));
    return this.selectedIds()
      .map((id) => map.get(id))
      .filter((i): i is TransferItem => !!i && this.matches(i));
  });

  protected readonly movableLeftCount = computed(() => {
    let n = 0;
    for (const id of this.leftSelected()) {
      const item = this.itemById(id);
      if (item && !this.isLockedWithoutAccess(item)) n += 1;
    }
    return n;
  });

  protected toggleLeft(id: string): void {
    const item = this.itemById(id);
    if (item && this.isLockedWithoutAccess(item)) return;
    const next = new Set(this.leftSelected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.leftSelected.set(next);
  }

  protected toggleRight(id: string): void {
    const next = new Set(this.rightSelected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.rightSelected.set(next);
  }

  protected moveRight(): void {
    const add = [...this.leftSelected()].filter((id) => {
      const item = this.itemById(id);
      return item && !this.isLockedWithoutAccess(item);
    });
    this.selectedIds.update((ids) => [...new Set([...ids, ...add])]);
    this.leftSelected.set(new Set());
  }

  protected moveLeft(): void {
    if (!this.enforceAccessPrerequisite()) {
      const remove = this.rightSelected();
      this.selectedIds.update((ids) => ids.filter((id) => !remove.has(id)));
      this.rightSelected.set(new Set());
      return;
    }

    const remove = new Set(this.rightSelected());
    const cascadeResources = new Set<string>();
    for (const id of remove) {
      const item = this.itemById(id);
      if (item?.resource && isAccessAction(item.action)) {
        cascadeResources.add(item.resource);
      }
    }

    this.selectedIds.update((ids) =>
      ids.filter((id) => {
        if (remove.has(id)) return false;
        const item = this.itemById(id);
        if (item?.resource && cascadeResources.has(item.resource)) {
          return false;
        }
        return true;
      })
    );
    this.rightSelected.set(new Set());
  }

  protected onConfirm(): void {
    let ids = [...this.selectedIds()];
    if (this.enforceAccessPrerequisite()) {
      const selected = new Set(ids);
      ids = ids.filter((id) => {
        const item = this.itemById(id);
        if (!item?.resource || isAccessAction(item.action)) return true;
        return this.hasAccessForResource(item.resource, selected);
      });
    }
    this.assigned.emit(ids);
    this.closed.emit();
  }
}
