import { Component, inject, signal, computed, ElementRef, viewChild, effect, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { SkeletonTableComponent } from '../../../shared/components/skeleton-table';
import { MenusStore } from './menus-store';
import { PermissionsStore } from '../permissions/permissions-store';
import { MenusTable } from '../../../types/database';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, Menu, Edit, Home, Settings, Users, Key, Database, Shield, Layout, FileText, Component as ComponentIcon } from 'lucide-angular';

@Component({
  selector: 'app-admin-menus',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatSelectModule,
    SkeletonTableComponent,
    LucideAngularModule
  ],
  providers: [
    MenusStore, 
    PermissionsStore,
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Menu, Edit, Home, Settings, Users, Key, Database, Shield, Layout, FileText, Component: ComponentIcon })
    }
  ],
  template: `
    <div class="space-y-6">
      <!-- Header Section -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Navigation Menus</h1>
          <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Database records matching the MenusTable model. Configure side navigation menus and routing structure.
          </p>
        </div>
        <button 
          type="button"
          (click)="openCreateModal()"
          class="inline-flex items-center rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 dark:hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors cursor-pointer"
        >
          <svg class="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Menu
        </button>
      </div>

      <!-- Filters & Toolbar -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- Text Search Filter -->
          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Search Menus</mat-label>
            <input 
              matInput 
              [value]="menusStore.filterText()" 
              (input)="onSearchInput($event)" 
              placeholder="Search by name, path, or description..." 
            />
            @if (menusStore.filterText()) {
              <button 
                matSuffix 
                (click)="menusStore.setFilterText('')" 
                class="mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                type="button"
                aria-label="Clear search"
              >
                ✕
              </button>
            }
          </mat-form-field>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1 text-xs">
          <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <svg class="h-4.5 w-4.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Tip: Click column headers to sort. <strong>Hold Shift</strong> while clicking to apply a <strong>multiple sort order</strong>.</span>
          </div>
          @if (menusStore.sorts().length > 0) {
            <button 
              type="button"
              (click)="menusStore.clearSorts()"
              class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold cursor-pointer"
            >
              Clear active sorts ({{ menusStore.sorts().length }})
            </button>
          }
        </div>
      </div>

      <!-- Loading State -->
      @if (menusStore.isLoading()) {
        <app-skeleton-table 
          [columns]="['Icon', 'Name', 'API Path', 'Description', 'Parent ID', 'Sort Order', 'Visibility Status', 'Actions']"
          [rows]="menusStore.pageSize()" 
        />
      } @else if (menusStore.error()) {
        <div class="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
          {{ menusStore.error() }}
        </div>
      } @else {
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-700 sm:rounded-xl shadow-xs">
          <table mat-table [dataSource]="menusStore.pagedMenus()" class="w-full !bg-white dark:!bg-slate-800">
          
          <!-- Icon Column -->
          <ng-container matColumnDef="icon">
            <th 
              mat-header-cell 
              *matHeaderCellDef
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !pl-6 !text-center !w-16 !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none"
            >
              Icon
            </th>
            <td mat-cell *matCellDef="let menu" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !pl-6 !text-center !text-slate-500 dark:!text-slate-400">
              <div class="flex justify-center items-center">
                @if (menu.icon) {
                  <lucide-icon [name]="menu.icon" class="w-5 h-5 text-slate-500" [strokeWidth]="2" />
                } @else {
                  <lucide-icon name="menu" class="w-5 h-5 text-slate-400" [strokeWidth]="2" />
                }
              </div>
            </td>
          </ng-container>

          <!-- Name Column -->
          <ng-container matColumnDef="name">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('name', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>Name</span>
                {{ getSortIndicator('name') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let menu" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !font-semibold !text-slate-900 dark:!text-slate-100">
              <span>{{ menu.name || 'Unnamed Menu' }}</span>
            </td>
          </ng-container>

          <!-- API Path Column -->
          <ng-container matColumnDef="api_path">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('api_path', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>API Path</span>
                {{ getSortIndicator('api_path') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let menu" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-500 dark:!text-slate-400">{{ menu.api_path }}</td>
          </ng-container>

          <!-- Description Column -->
          <ng-container matColumnDef="description">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('description', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>Description</span>
                {{ getSortIndicator('description') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let menu" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-500 dark:!text-slate-400 max-w-xs truncate" [title]="menu.description">
              {{ menu.description }}
            </td>
          </ng-container>

          <!-- Parent ID Column -->
          <ng-container matColumnDef="parent_id">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('parent_id', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>Parent ID</span>
                {{ getSortIndicator('parent_id') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let menu" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-500 dark:!text-slate-400">
              {{ menu.parent_id === 0 ? 'Root (0)' : menu.parent_id }}
            </td>
          </ng-container>

          <!-- Order Column -->
          <ng-container matColumnDef="sort_order">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('sort_order', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-center !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center justify-center gap-1.5">
                <span>Order</span>
                {{ getSortIndicator('sort_order') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let menu" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-center !text-sm !text-slate-500 dark:!text-slate-400">{{ menu.sort_order }}</td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th 
              mat-header-cell 
              *matHeaderCellDef
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400"
            >
              Status
            </th>
            <td mat-cell *matCellDef="let menu" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-500">
              <div class="flex items-center gap-2">
                @if (menu.is_active) {
                  <span class="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/10 dark:ring-emerald-900/40">Active</span>
                } @else {
                  <span class="inline-flex items-center rounded-md bg-slate-50 dark:bg-slate-900 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/10 dark:ring-slate-700/40">Inactive</span>
                }
                
                @if (menu.is_visible) {
                  <span class="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-900/40">Visible</span>
                } @else {
                  <span class="inline-flex items-center rounded-md bg-slate-50 dark:bg-slate-900 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/10 dark:ring-slate-700/40">Hidden</span>
                }
              </div>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !pr-6 !text-right !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400">Actions</th>
            <td mat-cell *matCellDef="let menu" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !pr-6 !text-right !text-sm !font-medium">
              <div class="flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  (click)="openCreateModal(menu)"
                  class="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors font-semibold cursor-pointer"
                  title="Edit Menu"
                >
                  <lucide-icon name="edit" class="w-4.5 h-4.5" [strokeWidth]="2" />
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns" class="!bg-slate-50 dark:!bg-slate-900/60"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns" class="hover:!bg-slate-50 dark:hover:!bg-slate-700/50 transition-colors"></tr>
        </table>

        <!-- Empty State -->
        @if (menusStore.pagedMenus().length === 0) {
          <div class="text-center py-10 px-4">
            <svg class="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <h3 class="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">No menus found</h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Try adjusting your filters or search terms.</p>
          </div>
        }

        <!-- Paginator -->
        <mat-paginator 
          [length]="menusStore.totalMenusCount()"
          [pageIndex]="menusStore.pageIndex()"
          [pageSize]="menusStore.pageSize()"
          [pageSizeOptions]="[5, 10, 20]"
          (page)="onPageEvent($event)"
          class="!bg-transparent border-t border-slate-100 dark:border-slate-700"
        />
      </div>
      }
    </div>

    <!-- Menu Creation Modal Dialog -->
    <dialog #createDialogRef class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xl max-w-lg w-full backdrop:bg-slate-900/40 dark:backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs focus:outline-none" (close)="onModalClose()">
      <div class="space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ editingMenuId() ? 'Edit Menu' : 'Create New Menu' }}</h3>
          <button (click)="closeCreateModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold text-lg cursor-pointer">✕</button>
        </div>

        <form [formGroup]="menuForm" (ngSubmit)="onCreateSubmit()" class="space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <mat-form-field appearance="outline" class="w-full !m-0">
              <mat-label>Menu Name (Resource Mapping)</mat-label>
              <mat-select formControlName="name" placeholder="Select a resource mapping..." (opened)="searchInput.focus()">
                <div class="px-3 py-2 sticky top-0 bg-white dark:bg-slate-800 z-10 border-b border-slate-100 dark:border-slate-700 mb-1">
                  <input 
                    #searchInput
                    matInput 
                    placeholder="Search resource..." 
                    [value]="menuNameSearch()"
                    (input)="onMenuNameInput($event)"
                    (keydown)="$event.stopPropagation()"
                    class="w-full text-sm outline-none bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>
                @for (menu of filteredMenuStatuses(); track menu.status) {
                  <mat-option [value]="menu.status">{{ menu.status }}</mat-option>
                }
                @if (filteredMenuStatuses().length === 0) {
                  <div class="px-4 py-3 text-sm text-slate-500 text-center">No matching resources</div>
                }
              </mat-select>
              @if (menuForm.get('name')?.hasError('required') && menuForm.get('name')?.touched) {
                <mat-error>Name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full !m-0">
              <mat-label>API Path / Route</mat-label>
              <input matInput formControlName="api_path" placeholder="e.g. /admin/dashboard" />
              @if (menuForm.get('api_path')?.hasError('required') && menuForm.get('api_path')?.touched) {
                <mat-error>Path is required</mat-error>
              }
            </mat-form-field>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <mat-form-field appearance="outline" class="w-full !m-0">
              <mat-label>Icon (Optional)</mat-label>
              <input matInput formControlName="icon" placeholder="e.g. 🏠" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full !m-0">
              <mat-label>Parent Menu ID</mat-label>
              <input matInput type="number" formControlName="parent_id" placeholder="0 for root" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Sort Order</mat-label>
            <input matInput type="number" formControlName="sort_order" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="2" placeholder="Brief description of this menu..."></textarea>
            @if (menuForm.get('description')?.hasError('required') && menuForm.get('description')?.touched) {
              <mat-error>Description is required</mat-error>
            }
          </mat-form-field>

          <!-- Status Switches -->
          <div class="bg-slate-50 dark:bg-slate-900 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400 select-none">Menu Configuration</span>
            
            <div class="flex flex-col gap-3">
              <label class="flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  formControlName="is_active" 
                  class="h-4 w-4 rounded-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-blue-600 focus:ring-blue-600 dark:focus:ring-offset-slate-800 cursor-pointer" 
                />
                <span class="ml-3 text-sm font-medium text-slate-800 dark:text-slate-200">Is Active</span>
              </label>

              <label class="flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  formControlName="is_visible" 
                  class="h-4 w-4 rounded-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-blue-600 focus:ring-blue-600 dark:focus:ring-offset-slate-800 cursor-pointer" 
                />
                <span class="ml-3 text-sm font-medium text-slate-800 dark:text-slate-200">Is Visible in Sidebar</span>
              </label>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button 
              type="button" 
              (click)="closeCreateModal()"
              class="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              [disabled]="menuForm.invalid"
              class="rounded-md bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 dark:hover:bg-blue-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {{ editingMenuId() ? 'Save Changes' : 'Create Menu' }}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  `
})
export class MenusComponent implements OnInit {
  protected readonly menusStore = inject(MenusStore);
  protected readonly permissionsStore = inject(PermissionsStore);

  private createDialogRef = viewChild<ElementRef<HTMLDialogElement>>('createDialogRef');

  protected readonly displayedColumns = ['icon', 'name', 'api_path', 'description', 'parent_id', 'sort_order', 'status', 'actions'];

  protected readonly editingMenuId = signal<number | null>(null);
  protected readonly menuNameSearch = signal('');

  protected readonly filteredMenuStatuses = computed(() => {
    const search = this.menuNameSearch().toLowerCase();
    const allStatuses = this.permissionsStore.menuStatuses();
    if (!search) return allStatuses;
    return allStatuses.filter(m => m.status.toLowerCase().includes(search));
  });

  protected readonly menuForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    api_path: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    icon: new FormControl<string>('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    parent_id: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required] }),
    sort_order: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required] }),
    is_active: new FormControl<boolean>(true, { nonNullable: true }),
    is_visible: new FormControl<boolean>(true, { nonNullable: true })
  });

  constructor() {
    effect(() => {
      const modal = this.createDialogRef()?.nativeElement;
      if (modal) {
        modal.addEventListener('keydown', this.trapModalFocus);
      }
    });
  }

  ngOnInit() {
    this.menusStore.loadMenus();
    this.permissionsStore.loadMenuStatuses();
  }

  protected onHeaderClick(field: keyof MenusTable, event: MouseEvent): void {
    this.menusStore.toggleSort(field, event.shiftKey);
  }

  protected getSortIndicator(field: keyof MenusTable): string {
    const sorts = this.menusStore.sorts();
    const index = sorts.findIndex(s => s.field === field);
    if (index === -1) return '';

    const arrow = sorts[index].direction === 'asc' ? '▲' : '▼';
    
    if (sorts.length > 1) {
      const superscriptMap: Record<number, string> = {
        0: '¹', 1: '²', 2: '³', 3: '⁴', 4: '⁵', 5: '⁶', 6: '⁷', 7: '⁸', 8: '⁹'
      };
      const priority = superscriptMap[index] || `(${index + 1})`;
      return `${arrow}${priority}`;
    }
    
    return arrow;
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.menusStore.setFilterText(input.value);
  }

  protected onPageEvent(event: PageEvent): void {
    this.menusStore.setPage(event.pageIndex, event.pageSize);
  }

  protected onMenuNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.menuNameSearch.set(input.value);
  }

  protected openCreateModal(menu?: MenusTable): void {
    const modal = this.createDialogRef()?.nativeElement;
    if (modal && !modal.open) {
      if (menu) {
        this.editingMenuId.set(menu.id);
        this.menuForm.reset({ 
          name: menu.name || '', 
          api_path: menu.api_path,
          icon: menu.icon || '',
          description: menu.description,
          parent_id: menu.parent_id,
          sort_order: menu.sort_order,
          is_active: menu.is_active,
          is_visible: menu.is_visible
        });
      } else {
        this.editingMenuId.set(null);
        this.menuForm.reset({ 
          name: '', 
          api_path: '', 
          icon: '', 
          description: '', 
          parent_id: 0, 
          sort_order: 0, 
          is_active: true, 
          is_visible: true 
        });
      }
      this.menuNameSearch.set('');
      modal.showModal();
      setTimeout(() => {
        const firstInput = modal.querySelector('input') as HTMLInputElement;
        firstInput?.focus();
      });
    }
  }

  protected closeCreateModal(): void {
    const modal = this.createDialogRef()?.nativeElement;
    if (modal && modal.open) {
      modal.close();
    }
  }

  protected onModalClose(): void {
    this.menuForm.reset();
  }

  protected onCreateSubmit(): void {
    if (this.menuForm.invalid) {
      this.menuForm.markAllAsTouched();
      return;
    }

    const formVal = this.menuForm.getRawValue();
    const editId = this.editingMenuId();

    if (editId) {
      this.menusStore.editMenu(editId, {
        name: formVal.name || null,
        api_path: formVal.api_path,
        icon: formVal.icon || null,
        description: formVal.description,
        parent_id: formVal.parent_id,
        sort_order: formVal.sort_order,
        is_active: formVal.is_active,
        is_visible: formVal.is_visible
      });
    } else {
      this.menusStore.addMenu({
        name: formVal.name || null,
        api_path: formVal.api_path,
        icon: formVal.icon || null,
        description: formVal.description,
        parent_id: formVal.parent_id,
        sort_order: formVal.sort_order,
        is_active: formVal.is_active,
        is_visible: formVal.is_visible
      });
    }

    this.closeCreateModal();
  }

  private trapModalFocus = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;
    const modal = this.createDialogRef()?.nativeElement;
    if (!modal) return;

    const focusableSelector = 'button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const elements = Array.from(modal.querySelectorAll(focusableSelector)) as HTMLElement[];
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
  };
}
