import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-table',
  standalone: true,
  template: `
    <div class="overflow-x-auto border border-slate-200 dark:border-slate-700 sm:rounded-xl shadow-xs w-full bg-white dark:bg-slate-800">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            @for (col of columns; track col) {
              <th class="py-4 px-6">
                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-24 animate-pulse"></div>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of getRowsArray(); track row) {
            <tr class="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50">
              @for (col of columns; track col) {
                <td class="py-4 px-6">
                  <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-full max-w-[200px] animate-pulse"></div>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class SkeletonTableComponent {
  @Input() columns: string[] = [];
  @Input() rows: number = 5;

  getRowsArray(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
}
