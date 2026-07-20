import {
  Component,
  Directive,
  Input,
  TemplateRef,
  computed,
  contentChildren,
  input,
  output
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { SortSpec } from '../data/list.types';

export interface KkhColumnDef {
  id: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  field?: string;
}

@Directive({
  selector: 'ng-template[kkhCell]',
  standalone: true
})
export class KkhCellDefDirective {
  @Input('kkhCell') columnId!: string;
  constructor(public template: TemplateRef<any>) {}
}

@Component({
  selector: 'kkh-data-table',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div class="space-y-4">
      <div class="kkh-panel p-4 space-y-3">
        <ng-content select="[filters]" />
      </div>

      @if (loading()) {
        <div class="kkh-panel overflow-hidden">
          <div class="bg-[var(--kkh-raised)] border-b border-[var(--kkh-border)] px-4 py-3 flex gap-6">
            @for (col of columns(); track col.id) {
              <div class="h-3 w-20 bg-[var(--kkh-border)] animate-pulse"></div>
            }
          </div>
          @for (r of skeletonRows(); track r) {
            <div class="px-4 py-3.5 border-b border-[var(--kkh-border)] flex gap-6">
              @for (col of columns(); track col.id) {
                <div class="h-3 flex-1 max-w-[140px] bg-[var(--kkh-border)]/60 animate-pulse"></div>
              }
            </div>
          }
        </div>
      } @else {
        <div class="kkh-panel overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-[var(--kkh-raised)] border-b border-[var(--kkh-border)]">
                  @for (col of columns(); track col.id) {
                    <th
                      class="px-4 py-3 text-xs font-semibold text-[var(--kkh-muted)]"
                      [class.text-right]="col.align === 'right'"
                      [class.text-center]="col.align === 'center'"
                      [class.cursor-pointer]="col.sortable"
                      [class.select-none]="col.sortable"
                      (click)="col.sortable && onSort(col.id, $event)"
                    >
                      <span class="inline-flex items-center gap-1.5">
                        {{ col.header }}
                        @if (col.sortable) {
                          <span class="text-[var(--kkh-accent)] font-mono text-[10px]">{{ sortIndicator(col.id) }}</span>
                        }
                      </span>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track trackRow(row, $index)) {
                  <tr class="border-b border-[var(--kkh-border)] hover:bg-[var(--kkh-hover)] transition-colors">
                    @for (col of columns(); track col.id) {
                      <td
                        class="px-4 py-3 text-sm text-[var(--kkh-text)]"
                        [class.text-right]="col.align === 'right'"
                        [class.text-center]="col.align === 'center'"
                      >
                        @if (cellTemplate(col.id); as tpl) {
                          <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: row, row: row }" />
                        } @else {
                          {{ cellValue(row, col) }}
                        }
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="columns().length" class="px-4 py-12 text-center">
                      <p class="text-sm font-medium text-[var(--kkh-text)]">{{ emptyTitle() }}</p>
                      <p class="mt-1 text-xs text-[var(--kkh-muted)]">{{ emptyDescription() }}</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-[var(--kkh-border)] bg-[var(--kkh-raised)]/40">
            <div class="flex items-center gap-2 text-xs text-[var(--kkh-muted)]">
              <span>Rows per page</span>
              <select
                class="kkh-input !w-auto !min-h-0 !py-1.5 !px-2 text-xs"
                [value]="pageSize()"
                (change)="onPageSizeChange($event)"
              >
                @for (size of pageSizeOptions(); track size) {
                  <option [value]="size">{{ size }}</option>
                }
              </select>
            </div>

            <div class="flex items-center gap-3 text-xs text-[var(--kkh-muted)]">
              <span>{{ rangeLabel() }}</span>
              <div class="flex items-center gap-1">
                <button type="button" class="kkh-btn !min-h-8 !px-2.5 text-xs" [disabled]="pageIndex() <= 0" (click)="goTo(pageIndex() - 1)">Prev</button>
                <button type="button" class="kkh-btn !min-h-8 !px-2.5 text-xs" [disabled]="pageIndex() >= lastPage()" (click)="goTo(pageIndex() + 1)">Next</button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class KkhDataTableComponent<T extends Record<string, any> = Record<string, any>> {
  readonly columns = input.required<KkhColumnDef[]>();
  readonly rows = input.required<T[]>();
  readonly totalCount = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly pageSizeOptions = input<number[]>([5, 10, 20, 50]);
  readonly sorts = input<SortSpec[]>([]);
  readonly loading = input(false);
  readonly trackBy = input<keyof T | ((row: T) => string | number)>('id' as keyof T);
  readonly emptyTitle = input('No records found');
  readonly emptyDescription = input('Try adjusting filters or search terms.');

  readonly pageChange = output<{ pageIndex: number; pageSize: number }>();
  readonly sortChange = output<{ field: string; multi: boolean }>();

  private readonly cellDefs = contentChildren(KkhCellDefDirective);

  protected readonly lastPage = computed(() => {
    const size = Math.max(this.pageSize(), 1);
    const total = this.totalCount();
    return Math.max(Math.ceil(total / size) - 1, 0);
  });

  protected rangeLabel(): string {
    const total = this.totalCount();
    if (total === 0) return '0 of 0';
    const size = this.pageSize();
    const start = this.pageIndex() * size + 1;
    const end = Math.min(start + size - 1, total);
    return `${start}–${end} of ${total}`;
  }

  protected skeletonRows(): number[] {
    return Array.from({ length: Math.min(this.pageSize(), 8) }, (_, i) => i);
  }

  protected cellTemplate(columnId: string): TemplateRef<any> | null {
    return this.cellDefs().find((d) => d.columnId === columnId)?.template ?? null;
  }

  protected cellValue(row: T, col: KkhColumnDef): unknown {
    const key = (col.field ?? col.id) as keyof T;
    return row[key] ?? '';
  }

  protected trackRow(row: T, index: number): string | number {
    const tb = this.trackBy();
    if (typeof tb === 'function') return tb(row);
    const val = row[tb];
    return (val as string | number) ?? index;
  }

  protected sortIndicator(field: string): string {
    const sorts = this.sorts();
    const index = sorts.findIndex((s) => s.field === field);
    if (index === -1) return '';
    const arrow = sorts[index].direction === 'asc' ? '↑' : '↓';
    if (sorts.length > 1) {
      const marks = ['¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
      return `${arrow}${marks[index] ?? `(${index + 1})`}`;
    }
    return arrow;
  }

  protected onSort(field: string, event: MouseEvent): void {
    this.sortChange.emit({ field, multi: event.shiftKey });
  }

  protected goTo(pageIndex: number): void {
    this.pageChange.emit({ pageIndex, pageSize: this.pageSize() });
  }

  protected onPageSizeChange(event: Event): void {
    const pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageChange.emit({ pageIndex: 0, pageSize });
  }
}
