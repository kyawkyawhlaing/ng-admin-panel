import { Component, ElementRef, effect, input, output, viewChild, signal, computed } from '@angular/core';

@Component({
  selector: 'app-assignment-dialog',
  imports: [],
  template: `
    <dialog #dialogRef class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xl max-w-md w-full backdrop:bg-slate-900/40 dark:backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs focus:outline-none" (close)="onNativeClose()">
      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ title() }}</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ subtitle() }}</p>
        </div>
        
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
            placeholder="Search options..." 
            class="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
          />
          @if (searchTerm()) {
            <button 
              type="button" 
              (click)="clearSearch()"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              ✕
            </button>
          }
        </div>
        
        <div class="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 pr-1" role="group" aria-label="Items list">
          @for (item of filteredItems(); track item.id) {
            <label class="flex items-start py-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                [checked]="selectedIds().includes(item.id)" 
                (change)="toggleItem(item.id)"
                class="mt-1 h-4 w-4 rounded-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-blue-600 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-slate-800 cursor-pointer" 
              />
              <div class="ml-3">
                <span class="block text-sm font-medium text-slate-900 dark:text-slate-200">{{ item.name }}</span>
                @if (item.description) {
                  <span class="block text-xs text-slate-500 dark:text-slate-400">{{ item.description }}</span>
                }
              </div>
            </label>
          } @empty {
            <p class="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No options available</p>
          }
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <button 
            type="button" 
            (click)="closeDialog()"
            class="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button" 
            (click)="save()"
            class="rounded-md bg-blue-600 dark:bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 dark:hover:bg-blue-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </dialog>
  `
})
export class AssignmentDialogComponent {
  title = input.required<string>();
  subtitle = input.required<string>();
  allItems = input.required<Array<{ id: string; name: string; description?: string }>>();
  assignedItemIds = input.required<string[]>();
  
  assigned = output<string[]>();
  closed = output<void>();

  private dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogRef');
  protected selectedIds = signal<string[]>([]);
  protected searchTerm = signal<string>('');

  protected filteredItems = computed(() => {
    const text = this.searchTerm().toLowerCase().trim();
    const items = this.allItems();
    if (!text) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(text) || 
      (item.description && item.description.toLowerCase().includes(text))
    );
  });

  constructor() {
    // Sync initial assigned IDs when they change or component is rendered
    effect(() => {
      this.selectedIds.set([...this.assignedItemIds()]);
    });

    // Auto open native dialog when dialogRef is available
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      if (dialog && !dialog.open) {
        dialog.showModal();
        this.trapFocus(dialog);
      }
    });
  }

  protected toggleItem(itemId: string): void {
    this.selectedIds.update(ids => 
      ids.includes(itemId) ? ids.filter(id => id !== itemId) : [...ids, itemId]
    );
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
  }

  protected save(): void {
    this.assigned.emit(this.selectedIds());
    this.closeDialog();
  }

  protected closeDialog(): void {
    const dialog = this.dialogRef()?.nativeElement;
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  protected onNativeClose(): void {
    this.closed.emit();
  }

  private trapFocus(dialog: HTMLDialogElement): void {
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    
    // Initial focus on first element or dialog itself
    setTimeout(() => {
      const firstFocusable = dialog.querySelector(focusableElements) as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    });

    dialog.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const elements = Array.from(dialog.querySelectorAll(focusableElements)) as HTMLElement[];
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    });
  }
}
