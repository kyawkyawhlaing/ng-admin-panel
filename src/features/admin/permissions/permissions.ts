import { Component, inject, signal, computed, ElementRef, viewChild, effect, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { SkeletonTableComponent } from '../../../shared/components/skeleton-table';
import { AdminStore, AdminStoreType } from '../admin-store';
import { PermissionsStore } from './permissions-store';
import { MenusStore } from '../menus/menus-store';
import { AssignmentDialogComponent } from '../../../shared/components/assignment-dialog';
import { Menu } from '../../../types/rbac';
import { PermissionsTable, ActionStatus } from '../../../types/database';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, Menu as MenuIcon, Edit } from 'lucide-angular';

@Component({
  selector: 'app-admin-permissions',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    AssignmentDialogComponent,
    SkeletonTableComponent,
    LucideAngularModule
  ],
  providers: [
    PermissionsStore, 
    MenusStore,
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Menu: MenuIcon, Edit })
    }
  ],
  template: `
    <div class="space-y-6">
      <!-- Header Section -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Permissions</h1>
          <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Database records matching the PermissionsTable model. Manage fine-grained access rights mapping to system actions.
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
          Create Permission
        </button>
      </div>

      <!-- Filters & Toolbar -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- Text Search Filter -->
          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Search Permissions</mat-label>
            <input 
              matInput 
              [value]="permissionsStore.filterText()" 
              (input)="onSearchInput($event)" 
              placeholder="Search by name, action, or resource..." 
            />
            @if (permissionsStore.filterText()) {
              <button 
                matSuffix 
                (click)="permissionsStore.setFilterText('')" 
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
          @if (permissionsStore.sorts().length > 0) {
            <button 
              type="button"
              (click)="permissionsStore.clearSorts()"
              class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold cursor-pointer"
            >
              Clear active sorts ({{ permissionsStore.sorts().length }})
            </button>
          }
        </div>
      </div>

      <!-- Loading State -->
      @if (permissionsStore.isLoading()) {
        <app-skeleton-table 
          [columns]="['ID', 'Name', 'Action', 'Resource', 'Description', 'Visible Menus', 'Actions']"
          [rows]="permissionsStore.pageSize()" 
        />
      } @else if (permissionsStore.error()) {
        <div class="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
          {{ permissionsStore.error() }}
        </div>
      } @else {
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-700 sm:rounded-xl shadow-xs">
          <table mat-table [dataSource]="permissionsStore.pagedPermissions()" class="w-full !bg-white dark:!bg-slate-800">
          
          <!-- ID Column -->
          <ng-container matColumnDef="id">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('id', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !pl-6 !text-left !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>ID</span>
                {{ getSortIndicator('id') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let permission" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !pl-6 !text-sm !font-semibold !text-slate-900 dark:!text-slate-100">{{ permission.id }}</td>
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
            <td mat-cell *matCellDef="let permission" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !font-semibold !text-slate-900 dark:!text-slate-100">{{ permission.name }}</td>
          </ng-container>

          <!-- Action Column -->
          <ng-container matColumnDef="action">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('action', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>Action</span>
                {{ getSortIndicator('action') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let permission" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-500 dark:!text-slate-400">
              <span class="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/40 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-900/40 uppercase">
                {{ permission.action }}
              </span>
            </td>
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
            <td mat-cell *matCellDef="let permission" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-500 dark:!text-slate-400">{{ permission.description || '-' }}</td>
          </ng-container>

          <!-- Resource Column -->
          <ng-container matColumnDef="resource">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('resource', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>Resource</span>
                {{ getSortIndicator('resource') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let permission" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-500 dark:!text-slate-400">{{ permission.resource || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="menus">
            <th mat-header-cell *matHeaderCellDef class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400">Visible Menus</th>
            <td mat-cell *matCellDef="let permission" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-500">
              <div class="flex flex-wrap gap-1.5 max-w-xs">
                @for (menu of getPermissionMenus(permission.id.toString()); track menu.id) {
                  <span class="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-600/10 dark:ring-slate-600/40">
                    {{ menu.api_path || menu.name }}
                  </span>
                } @empty {
                  <span class="text-xs text-slate-400 dark:text-slate-500 italic">Visible to all</span>
                }
              </div>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !pr-6 !text-right !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400">Actions</th>
            <td mat-cell *matCellDef="let permission" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !pr-6 !text-right !text-sm !font-medium">
              <div class="flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  (click)="openAssignDialog(permission.id.toString())"
                  class="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors font-semibold cursor-pointer"
                  title="Assign Menus"
                >
                  <lucide-icon name="menu" class="h-4.5 w-4.5" [strokeWidth]="2"></lucide-icon>
                </button>
                <button 
                  type="button" 
                  (click)="openCreateModal(permission)"
                  class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-semibold cursor-pointer"
                  title="Edit Permission"
                >
                  <lucide-icon name="edit" class="h-4.5 w-4.5" [strokeWidth]="2"></lucide-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns" class="!bg-slate-50 dark:!bg-slate-900/60"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns" class="hover:!bg-slate-50 dark:hover:!bg-slate-700/50 transition-colors"></tr>
        </table>

        <!-- Empty State -->
        @if (permissionsStore.pagedPermissions().length === 0) {
          <div class="text-center py-10 px-4">
            <svg class="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">No permissions found</h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Try adjusting your filters or search terms.</p>
          </div>
        }

        <!-- Paginator -->
        <mat-paginator 
          [length]="permissionsStore.totalPermissionsCount()"
          [pageIndex]="permissionsStore.pageIndex()"
          [pageSize]="permissionsStore.pageSize()"
          [pageSizeOptions]="[5, 10, 20]"
          (page)="onPageEvent($event)"
          class="!bg-transparent border-t border-slate-100 dark:border-slate-700"
        />
      </div>
      }
    </div>

    <!-- Menu Assignment Dialog -->
    @if (isDialogOpen()) {
      <app-assignment-dialog
        [title]="dialogTitle()"
        [subtitle]="'Bind side menus that require permission ' + activePermission()?.name"
        [allItems]="dialogOptions()"
        [assignedItemIds]="assignedMenuIds()"
        (assigned)="onMenusAssigned($event)"
        (closed)="closeAssignDialog()"
      />
    }

    <!-- Permission Creation Modal Dialog -->
    <dialog #createDialogRef class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xl max-w-lg w-full backdrop:bg-slate-900/40 dark:backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs focus:outline-none" (close)="onModalClose()">
      <div class="space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ editingPermissionId() ? 'Edit Permission' : 'Create New Permission' }}</h3>
          <button (click)="closeCreateModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold text-lg cursor-pointer">✕</button>
        </div>

        <form [formGroup]="permissionForm" (ngSubmit)="onCreateSubmit()" class="space-y-4">
          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Permission Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. users_access" />
            @if (permissionForm.get('name')?.hasError('required') && permissionForm.get('name')?.touched) {
              <mat-error>Permission name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Action Type</mat-label>
            <mat-select formControlName="action">
              <mat-option value="access">Access</mat-option>
              <mat-option value="create">Create</mat-option>
              <mat-option value="edit">Edit</mat-option>
              <mat-option value="delete">Delete</mat-option>
              <mat-option value="view">View</mat-option>
            </mat-select>
            @if (permissionForm.get('action')?.hasError('required') && permissionForm.get('action')?.touched) {
              <mat-error>Action type is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Resource</mat-label>
            <mat-select formControlName="resource" placeholder="Select a resource..." (opened)="searchInput.focus()">
              <div class="px-3 py-2 sticky top-0 bg-white dark:bg-slate-800 z-10 border-b border-slate-100 dark:border-slate-700 mb-1">
                <input 
                  #searchInput
                  matInput 
                  placeholder="Search resource..." 
                  [value]="resourceSearch()"
                  (input)="onResourceInput($event)"
                  (keydown)="$event.stopPropagation()"
                  class="w-full text-sm outline-none bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
              @for (menu of filteredResourceMenus(); track menu.status) {
                <mat-option [value]="menu.status">{{ menu.status }}</mat-option>
              }
              @if (filteredResourceMenus().length === 0) {
                <div class="px-4 py-3 text-sm text-slate-500 text-center">No matching resources</div>
              }
            </mat-select>
            @if (permissionForm.get('resource')?.hasError('required') && permissionForm.get('resource')?.touched) {
              <mat-error>Resource is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="2" placeholder="Describe the permission..."></textarea>
            @if (permissionForm.get('description')?.hasError('required') && permissionForm.get('description')?.touched) {
              <mat-error>Description is required</mat-error>
            }
          </mat-form-field>

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
              [disabled]="permissionForm.invalid"
              class="rounded-md bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 dark:hover:bg-blue-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {{ editingPermissionId() ? 'Save Changes' : 'Create Permission' }}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  `
})
export class PermissionsComponent implements OnInit {
  protected readonly adminStore = inject(AdminStore) as unknown as AdminStoreType;
  protected readonly permissionsStore = inject(PermissionsStore);
  protected readonly menusStore = inject(MenusStore);

  private createDialogRef = viewChild<ElementRef<HTMLDialogElement>>('createDialogRef');

  protected readonly displayedColumns = ['id', 'name', 'action', 'resource', 'description', 'menus', 'actions'];

  protected readonly activePermissionId = signal<string | null>(null);
  protected readonly isDialogOpen = signal(false);
  protected readonly editingPermissionId = signal<number | null>(null);

  protected readonly activePermission = computed(() => {
    const permId = this.activePermissionId();
    if (!permId) return null;
    return this.permissionsStore.permissions().find(p => p.id.toString() === permId) || null;
  });

  protected readonly dialogTitle = computed(() => 
    this.activePermission() ? `Assign Menus for ${this.activePermission()!.name}` : 'Assign Menus'
  );

  protected readonly dialogOptions = computed(() => {
    const perm = this.activePermission();
    if (!perm || !perm.resource) return [];
    
    return this.menusStore.menus()
      .filter(m => m.name === perm.resource)
      .map(m => ({ 
        id: m.id.toString(), 
        name: m.name || 'Unnamed', 
        description: m.api_path 
      }));
  });

  protected readonly assignedMenuIds = computed(() => {
    const permissionId = this.activePermissionId();
    if (!permissionId) return [];
    return this.adminStore.permissionMenus()
      .filter(pm => pm.permissionId === permissionId)
      .map(pm => pm.menuId.toString());
  });

  protected readonly permissionForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    action: new FormControl<ActionStatus>('access', { nonNullable: true, validators: [Validators.required] }),
    resource: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
  });

  protected readonly resourceSearch = signal('');

  protected readonly filteredResourceMenus = computed(() => {
    const search = this.resourceSearch().toLowerCase();
    const allStatuses = this.permissionsStore.menuStatuses();
    if (!search) return allStatuses;
    return allStatuses.filter(m => m.status.toLowerCase().includes(search));
  });

  constructor() {
    effect(() => {
      const modal = this.createDialogRef()?.nativeElement;
      if (modal) {
        modal.addEventListener('keydown', this.trapModalFocus);
      }
    });

    // Auto-fill permission name based on action and resource
    merge(
      this.permissionForm.controls.action.valueChanges,
      this.permissionForm.controls.resource.valueChanges
    )
    .pipe(takeUntilDestroyed())
    .subscribe(() => {
      const action = this.permissionForm.controls.action.value;
      const resource = this.permissionForm.controls.resource.value;
      if (action && resource) {
        const expectedName = `${resource}_${action}`;
        if (this.permissionForm.controls.name.value !== expectedName) {
          this.permissionForm.controls.name.setValue(expectedName);
        }
      }
    });
  }

  ngOnInit() {
    this.permissionsStore.loadPermissions();
    this.permissionsStore.loadMenuStatuses();
    this.menusStore.loadMenus();
  }

  protected onHeaderClick(field: keyof PermissionsTable, event: MouseEvent): void {
    this.permissionsStore.toggleSort(field, event.shiftKey);
  }

  protected getSortIndicator(field: keyof PermissionsTable): string {
    const sorts = this.permissionsStore.sorts();
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
    this.permissionsStore.setFilterText(input.value);
  }

  protected onResourceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.resourceSearch.set(input.value);
  }

  protected onPageEvent(event: PageEvent): void {
    this.permissionsStore.setPage(event.pageIndex, event.pageSize);
  }

  protected getPermissionMenus(permissionId: string) {
    const mappings = this.adminStore.permissionMenus().filter(pm => pm.permissionId === permissionId);
    const menuIds = mappings.map(pm => Number(pm.menuId));
    return this.menusStore.menus().filter(m => menuIds.includes(m.id));
  }

  protected openAssignDialog(permissionId: string): void {
    this.activePermissionId.set(permissionId);
    this.isDialogOpen.set(true);
  }

  protected closeAssignDialog(): void {
    this.isDialogOpen.set(false);
    this.activePermissionId.set(null);
  }

  protected async onMenusAssigned(newMenuIds: (string | number)[]): Promise<void> {
    const permissionId = this.activePermissionId();
    if (!permissionId) return;

    const currentMenuIds = this.assignedMenuIds();
    const newMenuIdsStr = newMenuIds.map(id => id.toString());
    const currentMenuIdsStr = currentMenuIds.map(id => id.toString());

    const menusToAdd = newMenuIdsStr.filter(id => !currentMenuIdsStr.includes(id));
    const menusToRemove = currentMenuIdsStr.filter(id => !newMenuIdsStr.includes(id));

    try {
      for (const menuId of menusToAdd) {
        await this.adminStore.assignMenuToPermission(permissionId, menuId);
      }
      for (const menuId of menusToRemove) {
        await this.adminStore.removeMenuFromPermission(permissionId, menuId);
      }
    } catch (err) {
      console.error('Error configuration menus:', err);
    }
  }

  protected openCreateModal(permission?: PermissionsTable): void {
    const modal = this.createDialogRef()?.nativeElement;
    if (modal && !modal.open) {
      if (permission) {
        this.editingPermissionId.set(permission.id);
        this.permissionForm.reset({ 
          name: permission.name, 
          action: permission.action,
          resource: permission.resource || '',
          description: permission.description || ''
        });
      } else {
        this.editingPermissionId.set(null);
        this.permissionForm.reset({ name: '', action: 'access', resource: '', description: '' });
      }
      this.resourceSearch.set('');
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
    this.permissionForm.reset();
  }

  protected onCreateSubmit(): void {
    if (this.permissionForm.invalid) {
      this.permissionForm.markAllAsTouched();
      return;
    }

    const formVal = this.permissionForm.getRawValue();
    const editId = this.editingPermissionId();

    if (editId) {
      this.permissionsStore.editPermission(editId, {
        name: formVal.name,
        action: formVal.action,
        resource: formVal.resource || null,
        description: formVal.description
      });
    } else {
      this.permissionsStore.addPermission({
        name: formVal.name,
        action: formVal.action,
        resource: formVal.resource || null,
        description: formVal.description
      });
    }

    this.closeCreateModal();
  }

  private trapModalFocus = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;
    const modal = this.createDialogRef()?.nativeElement;
    if (!modal) return;

    const focusableSelector = 'button, input, select, [tabindex]:not([tabindex="-1"])';
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
