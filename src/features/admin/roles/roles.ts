import { Component, inject, signal, computed, ElementRef, viewChild, effect, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { SkeletonTableComponent } from '../../../shared/components/skeleton-table';
import { AdminStore, AdminStoreType } from '../admin-store';
import { RolesStore } from './roles-store';
import { AssignmentDialogComponent } from '../../../shared/components/assignment-dialog';
import { Permission } from '../../../types/rbac';
import { RolesTable } from '../../../types/database';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, ShieldCheck, Edit } from 'lucide-angular';

@Component({
  selector: 'app-admin-roles',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AssignmentDialogComponent,
    SkeletonTableComponent,
    LucideAngularModule
  ],
  providers: [
    RolesStore,
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ ShieldCheck, Edit })
    }
  ],
  template: `
    <div class="space-y-6">
      <!-- Header Section -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Roles</h1>
          <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Database records matching the RolesTable model. Configure role-based access control.
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
          Create Role
        </button>
      </div>

      <!-- Filters & Toolbar -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- Text Search Filter -->
          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Search Roles</mat-label>
            <input 
              matInput 
              [value]="rolesStore.filterText()" 
              (input)="onSearchInput($event)" 
              placeholder="Search by name or normalized name..." 
            />
            @if (rolesStore.filterText()) {
              <button 
                matSuffix 
                (click)="rolesStore.setFilterText('')" 
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
          @if (rolesStore.sorts().length > 0) {
            <button 
              type="button"
              (click)="rolesStore.clearSorts()"
              class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold cursor-pointer"
            >
              Clear active sorts ({{ rolesStore.sorts().length }})
            </button>
          }
        </div>
      </div>

      <!-- Loading State -->
      @if (rolesStore.isLoading()) {
        <app-skeleton-table 
          [columns]="['ID', 'Name', 'Normalized Name', 'Permissions', 'Actions']"
          [rows]="rolesStore.pageSize()" 
        />
      } @else if (rolesStore.error()) {
        <div class="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
          {{ rolesStore.error() }}
        </div>
      } @else {
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-700 sm:rounded-xl shadow-xs">
          <table mat-table [dataSource]="rolesStore.pagedRoles()" class="w-full !bg-white dark:!bg-slate-800">
          
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
            <td mat-cell *matCellDef="let role" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !pl-6 !text-sm !font-semibold !text-slate-900 dark:!text-slate-100">{{ role.id }}</td>
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
            <td mat-cell *matCellDef="let role" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !font-semibold !text-slate-900 dark:!text-slate-100">{{ role.name }}</td>
          </ng-container>

          <!-- Normalized Name Column -->
          <ng-container matColumnDef="normalized_name">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('normalized_name', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>Normalized Name</span>
                {{ getSortIndicator('normalized_name') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let role" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-500 dark:!text-slate-400">{{ role.normalized_name }}</td>
          </ng-container>

          <!-- Permissions Column -->
          <ng-container matColumnDef="permissions">
            <th mat-header-cell *matHeaderCellDef class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400">Permissions</th>
            <td mat-cell *matCellDef="let role" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-500">
              <div class="flex flex-wrap gap-1.5 max-w-lg">
                @for (perm of getRolePermissions(role.id.toString()); track perm.id) {
                  <span class="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/10 dark:ring-emerald-900/40">
                    {{ perm.name }}
                  </span>
                } @empty {
                  <span class="text-xs text-slate-400 dark:text-slate-500 italic">No permissions mapped</span>
                }
              </div>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !pr-6 !text-right !text-xs !font-semibold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400">Actions</th>
            <td mat-cell *matCellDef="let role" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !pr-6 !text-right !text-sm !font-medium">
              <div class="flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  (click)="openAssignDialog(role.id.toString())"
                  class="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors font-semibold cursor-pointer"
                  title="Assign Permissions"
                >
                  <lucide-icon name="shield-check" class="h-4.5 w-4.5" [strokeWidth]="2"></lucide-icon>
                </button>
                <button 
                  type="button" 
                  (click)="openCreateModal(role)"
                  class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-semibold cursor-pointer"
                  title="Edit Role"
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
        @if (rolesStore.pagedRoles().length === 0) {
          <div class="text-center py-10 px-4">
            <svg class="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">No roles found</h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Try adjusting your filters or search terms.</p>
          </div>
        }

        <!-- Paginator -->
        <mat-paginator 
          [length]="rolesStore.totalRolesCount()"
          [pageIndex]="rolesStore.pageIndex()"
          [pageSize]="rolesStore.pageSize()"
          [pageSizeOptions]="[5, 10, 20]"
          (page)="onPageEvent($event)"
          class="!bg-transparent border-t border-slate-100 dark:border-slate-700"
        />
      </div>
      }
    </div>

    <!-- Permission Assignment Dialog -->
    @if (isDialogOpen()) {
      <app-assignment-dialog
        [title]="dialogTitle()"
        [subtitle]="'Select permissions to bind to role ' + activeRole()?.name"
        [allItems]="dialogOptions()"
        [assignedItemIds]="assignedPermissionIds()"
        (assigned)="onPermissionsAssigned($event)"
        (closed)="closeAssignDialog()"
      />
    }

    <!-- Role Creation Modal Dialog -->
    <dialog #createDialogRef class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xl max-w-lg w-full backdrop:bg-slate-900/40 dark:backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs focus:outline-none" (close)="onModalClose()">
      <div class="space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ editingRoleId() ? 'Edit Role' : 'Create New Role' }}</h3>
          <button (click)="closeCreateModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold text-lg cursor-pointer">✕</button>
        </div>

        <form [formGroup]="roleForm" (ngSubmit)="onCreateSubmit()" class="space-y-4">
          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Role Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. Admin" />
            @if (roleForm.get('name')?.hasError('required') && roleForm.get('name')?.touched) {
              <mat-error>Role name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Normalized Name</mat-label>
            <input matInput formControlName="normalized_name" placeholder="e.g. ADMIN" />
            @if (roleForm.get('normalized_name')?.hasError('required') && roleForm.get('normalized_name')?.touched) {
              <mat-error>Normalized name is required</mat-error>
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
              [disabled]="roleForm.invalid"
              class="rounded-md bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 dark:hover:bg-blue-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {{ editingRoleId() ? 'Save Changes' : 'Create Role' }}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  `
})
export class RolesComponent implements OnInit {
  protected readonly adminStore = inject(AdminStore) as unknown as AdminStoreType;
  protected readonly rolesStore = inject(RolesStore);

  private createDialogRef = viewChild<ElementRef<HTMLDialogElement>>('createDialogRef');

  protected readonly displayedColumns = ['id', 'name', 'normalized_name', 'permissions', 'actions'];

  protected readonly activeRoleId = signal<string | null>(null);
  protected readonly isDialogOpen = signal(false);
  protected readonly editingRoleId = signal<number | null>(null);

  protected readonly activeRole = computed(() => {
    const roleId = this.activeRoleId();
    if (!roleId) return null;
    return this.rolesStore.roles().find(r => r.id.toString() === roleId) || null;
  });

  protected readonly dialogTitle = computed(() => 
    this.activeRole() ? `Configure Permissions for ${this.activeRole()!.name}` : 'Configure Permissions'
  );

  protected readonly dialogOptions = computed(() => 
    this.adminStore.permissions().map(p => ({ 
      id: p.id, 
      name: p.name, 
      description: `Code: ${p.code} - ${p.description}` 
    }))
  );

  protected readonly assignedPermissionIds = computed(() => {
    const roleId = this.activeRoleId();
    if (!roleId) return [];
    return this.adminStore.rolePermissions()
      .filter(rp => rp.roleId.toString() === roleId)
      .map(rp => rp.permissionId);
  });

  protected readonly roleForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    normalized_name: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  constructor() {
    effect(() => {
      const modal = this.createDialogRef()?.nativeElement;
      if (modal) {
        modal.addEventListener('keydown', this.trapModalFocus);
      }
    });

    // Auto-fill normalized_name based on name input
    this.roleForm.controls.name.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(nameValue => {
        const uppercaseName = (nameValue || '').toUpperCase();
        if (this.roleForm.controls.normalized_name.value !== uppercaseName) {
          this.roleForm.controls.normalized_name.setValue(uppercaseName);
        }
      });
  }

  ngOnInit() {
    this.rolesStore.loadRoles();
    this.adminStore.loadRealData();
  }

  protected onHeaderClick(field: keyof RolesTable, event: MouseEvent): void {
    this.rolesStore.toggleSort(field, event.shiftKey);
  }

  protected getSortIndicator(field: keyof RolesTable): string {
    const sorts = this.rolesStore.sorts();
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
    this.rolesStore.setFilterText(input.value);
  }

  protected onPageEvent(event: PageEvent): void {
    this.rolesStore.setPage(event.pageIndex, event.pageSize);
  }

  protected getRolePermissions(roleId: string): Permission[] {
    return this.adminStore.getPermissionsForRole(roleId);
  }

  protected openAssignDialog(roleId: string): void {
    this.activeRoleId.set(roleId);
    this.isDialogOpen.set(true);
  }

  protected closeAssignDialog(): void {
    this.isDialogOpen.set(false);
    this.activeRoleId.set(null);
  }

  protected async onPermissionsAssigned(newPermissionIds: (string | number)[]): Promise<void> {
    const roleId = this.activeRoleId();
    if (!roleId) return;

    const currentPermissionIds = this.assignedPermissionIds();
    const newPermIdsStr = newPermissionIds.map(id => id.toString());
    const currentPermIdsStr = currentPermissionIds.map(id => id.toString());

    const permsToAdd = newPermIdsStr.filter(id => !currentPermIdsStr.includes(id));
    const permsToRemove = currentPermIdsStr.filter(id => !newPermIdsStr.includes(id));

    try {
      for (const permissionId of permsToAdd) {
        await this.adminStore.assignPermissionToRole(roleId, permissionId);
      }
      for (const permissionId of permsToRemove) {
        await this.adminStore.removePermissionFromRole(roleId, permissionId);
      }
    } catch (err) {
      console.error('Error configuration permissions:', err);
    }
  }

  protected openCreateModal(role?: RolesTable): void {
    const modal = this.createDialogRef()?.nativeElement;
    if (modal && !modal.open) {
      if (role) {
        this.editingRoleId.set(role.id);
        this.roleForm.reset({ name: role.name, normalized_name: role.normalized_name });
      } else {
        this.editingRoleId.set(null);
        this.roleForm.reset({ name: '', normalized_name: '' });
      }
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
    this.roleForm.reset();
  }

  protected onCreateSubmit(): void {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    const formVal = this.roleForm.getRawValue();
    const editId = this.editingRoleId();

    if (editId) {
      this.rolesStore.editRole(editId, {
        name: formVal.name,
        normalized_name: formVal.normalized_name
      });
    } else {
      this.rolesStore.addRole({
        name: formVal.name,
        normalized_name: formVal.normalized_name
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
