import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminStore, AdminStoreType } from '../admin-store';
import { RolesStore } from './roles-store';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import { isAccessAction, normalizeRolePermissionIds } from '../../../core/auth/permission.util';
import { isSysAdminRole } from '../../../core/auth/system-defaults.util';
import {
  KkhPageHeaderComponent,
  KkhButtonComponent,
  KkhInputComponent,
  KkhAlertComponent,
  KkhDataTableComponent,
  KkhCellDefDirective,
  KkhTransferComponent,
  KkhDialogComponent,
  KkhColumnDef
} from '../../../shared/ui';
import { RolesTable } from '../../../types/database';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, Edit, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-admin-roles',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    KkhPageHeaderComponent,
    KkhButtonComponent,
    KkhInputComponent,
    KkhAlertComponent,
    KkhDataTableComponent,
    KkhCellDefDirective,
    KkhTransferComponent,
    KkhDialogComponent,
    LucideAngularModule
  ],
  providers: [
    RolesStore,
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Edit, Trash2 })
    }
  ],
  template: `
    <div class="space-y-6 kkh-page-enter">
      <kkh-page-header
        eyebrow="ACCESS"
        title="Roles"
        description="Define RBAC roles and bind permissions. access = page; view/create/edit/delete = APIs."
      >
        @if (canCreate()) {
          <kkh-button variant="primary" (pressed)="openCreateModal()">+ Create Role</kkh-button>
        }
      </kkh-page-header>

      @if (!canView()) {
        <kkh-alert tone="danger">You need roles_view to load role data.</kkh-alert>
      } @else if (rolesStore.error()) {
        <kkh-alert tone="danger">{{ rolesStore.error() }}</kkh-alert>
      }

      @if (canView()) {
      <kkh-data-table
        [columns]="columns"
        [rows]="rolesStore.pagedRoles()"
        [totalCount]="rolesStore.totalRolesCount()"
        [pageIndex]="rolesStore.pageIndex()"
        [pageSize]="rolesStore.pageSize()"
        [sorts]="rolesStore.sorts()"
        [loading]="rolesStore.isLoading()"
        emptyTitle="No roles found"
        emptyDescription="Try adjusting your filters or search terms."
        (pageChange)="onPage($event)"
        (sortChange)="onSort($event)"
      >
        <div filters class="space-y-3">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <kkh-input
              label="Search Roles"
              placeholder="Search by name or normalized name..."
              [ngModel]="rolesStore.filterText()"
              (ngModelChange)="rolesStore.setFilterText($event)"
            />
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
            <p class="kkh-label text-[var(--kkh-muted)] normal-case tracking-normal">
              Tip: Click column headers to sort. <strong>Hold Shift</strong> while clicking to apply a <strong>multiple sort order</strong>.
            </p>
            @if (rolesStore.sorts().length > 0) {
              <button
                type="button"
                (click)="rolesStore.clearSorts()"
                class="text-[var(--kkh-accent)] font-mono text-xs uppercase tracking-wider cursor-pointer"
              >
                Clear active sorts ({{ rolesStore.sorts().length }})
              </button>
            }
          </div>
        </div>

        <ng-template kkhCell="permissions" let-row>
          @let count = getRolePermissionCount(row.id.toString());
          <button
            type="button"
            class="kkh-relation-summary"
            [class.kkh-relation-summary--empty]="count === 0"
            [disabled]="!canEdit()"
            (click)="canEdit() && openAssignDialog(row.id.toString())"
            [attr.aria-label]="count === 0 ? 'Assign permissions' : 'Manage ' + count + ' permissions'"
            [title]="count === 0 ? 'Assign permissions' : count + ' permissions mapped — click to manage'"
          >
            <span class="kkh-relation-summary__count">
              <span class="kkh-relation-summary__label">
                {{ count === 0 ? 'None mapped' : count + (count === 1 ? ' permission' : ' permissions') }}
              </span>
              @if (canEdit()) {
                <span class="kkh-relation-summary__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </span>
              }
            </span>
          </button>
        </ng-template>

        <ng-template kkhCell="actions" let-row>
          <div class="flex items-center justify-end gap-3">
            @if (canEdit()) {
              <button
                type="button"
                (click)="openCreateModal(row)"
                class="text-[var(--kkh-accent)] hover:opacity-80 transition-opacity cursor-pointer"
                title="Edit Role"
              >
                <lucide-icon name="edit" class="h-4.5 w-4.5" [strokeWidth]="2"></lucide-icon>
              </button>
            }
            @if (canDelete() && !isProtectedRole(row)) {
              <button
                type="button"
                (click)="openDeleteDialog(row)"
                class="text-[var(--kkh-danger)] hover:opacity-80 transition-opacity cursor-pointer"
                title="Delete Role"
              >
                <lucide-icon name="trash-2" class="h-4.5 w-4.5" [strokeWidth]="2"></lucide-icon>
              </button>
            }
          </div>
        </ng-template>
      </kkh-data-table>
      }
    </div>

    <kkh-transfer
      [open]="isDialogOpen()"
      [title]="dialogTitle()"
      [subtitle]="'Select permissions to bind to role ' + activeRole()?.name"
      [allItems]="dialogOptions()"
      [assignedItemIds]="assignedPermissionIds()"
      [enforceAccessPrerequisite]="true"
      (assigned)="onPermissionsAssigned($event)"
      (closed)="closeAssignDialog()"
    />

    <kkh-dialog
      [open]="isCreateOpen()"
      [title]="editingRoleId() ? 'Edit Role' : 'Create New Role'"
      [showDefaultActions]="false"
      (closed)="onModalClose()"
    >
      <form id="role-form" [formGroup]="roleForm" (ngSubmit)="onCreateSubmit()" class="kkh-dialog__form">
        <kkh-input
          label="Role Name"
          formControlName="name"
          placeholder="e.g. Admin"
          [error]="roleForm.get('name')?.hasError('required') && roleForm.get('name')?.touched ? 'Role name is required' : null"
        />

        <kkh-input
          label="Normalized Name"
          formControlName="normalized_name"
          placeholder="e.g. ADMIN"
          [error]="roleForm.get('normalized_name')?.hasError('required') && roleForm.get('normalized_name')?.touched ? 'Normalized name is required' : null"
        />
      </form>
      <div footer class="contents">
        <kkh-button variant="ghost" type="button" (pressed)="closeCreateModal()">Cancel</kkh-button>
        <kkh-button variant="primary" type="submit" form="role-form" [disabled]="roleForm.invalid">
          {{ editingRoleId() ? 'Save Changes' : 'Create Role' }}
        </kkh-button>
      </div>
    </kkh-dialog>

    <kkh-dialog
      [open]="isDeleteOpen()"
      title="Delete Role"
      [subtitle]="deleteTarget() ? 'Permanently remove role ' + deleteTarget()!.name + '. Assigned users and permissions will be unbound. This cannot be undone.' : null"
      confirmLabel="Delete"
      confirmVariant="danger"
      [confirmLoading]="isDeleting()"
      (closed)="closeDeleteDialog()"
      (confirmed)="confirmDelete()"
    />
  `
})
export class RolesComponent implements OnInit {
  protected readonly adminStore = inject(AdminStore) as unknown as AdminStoreType;
  protected readonly rolesStore = inject(RolesStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly canView = computed(() => this.authStore.hasPermission('roles_view'));
  protected readonly canCreate = computed(() => this.authStore.hasPermission('roles_create'));
  protected readonly canEdit = computed(() => this.authStore.hasPermission('roles_edit'));
  protected readonly canDelete = computed(() => this.authStore.hasPermission('roles_delete'));

  protected readonly isCreateOpen = signal(false);
  protected readonly isDeleteOpen = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly deleteTarget = signal<RolesTable | null>(null);

  protected readonly columns: KkhColumnDef[] = [
    { id: 'id', header: 'ID', sortable: true },
    { id: 'name', header: 'Name', sortable: true },
    { id: 'normalized_name', header: 'Normalized Name', sortable: true },
    { id: 'permissions', header: 'Assigned' },
    { id: 'actions', header: 'Actions', align: 'right' }
  ];

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
      id: String(p.id),
      name: p.name,
      description: `${p.code} — ${p.description || p.action || 'permission'}`,
      resource: p.resource,
      action: p.action
    }))
  );

  protected readonly assignedPermissionIds = computed(() => {
    const roleId = this.activeRoleId();
    if (!roleId) return [];
    return this.adminStore.rolePermissions()
      .filter(rp => rp.roleId.toString() === roleId)
      .map(rp => String(rp.permissionId));
  });

  protected readonly roleForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    normalized_name: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  constructor() {
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
    if (this.canView()) {
      this.rolesStore.loadRoles();
    }
    this.adminStore.loadRealData();
  }

  protected onPage(event: { pageIndex: number; pageSize: number }): void {
    this.rolesStore.setPage(event.pageIndex, event.pageSize);
  }

  protected onSort(event: { field: string; multi: boolean }): void {
    this.rolesStore.toggleSort(event.field as keyof RolesTable, event.multi);
  }

  protected getRolePermissionCount(roleId: string): number {
    return this.adminStore.getPermissionsForRole(roleId).length;
  }

  protected isProtectedRole(role: RolesTable): boolean {
    return isSysAdminRole(role.normalized_name) || isSysAdminRole(role.name);
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

    const role = this.rolesStore.roles().find((r) => String(r.id) === roleId);
    if (role && this.isProtectedRole(role)) {
      // sysadmin always keeps full privilege — only allow adding missing permissions.
      const currentPermissionIds = this.assignedPermissionIds();
      const permissions = this.adminStore.permissions();
      const normalized = normalizeRolePermissionIds(
        newPermissionIds.map((id) => id.toString()),
        permissions.map((p) => ({
          id: String(p.id),
          resource: p.resource ?? undefined,
          action: p.action,
          code: p.name
        }))
      );
      const permsToAdd = normalized.filter((id) => !currentPermissionIds.includes(id));
      try {
        for (const permissionId of permsToAdd) {
          await this.adminStore.assignPermissionToRole(roleId, permissionId);
        }
        await this.adminStore.loadRealData();
        const userId = this.authStore.user()?.id;
        if (userId && this.adminStore.userRoles().some((ur) => ur.userId === userId && ur.roleId === roleId)) {
          await this.authStore.refreshSession();
        }
      } catch (err) {
        console.error('Error configuring permissions:', err);
        await this.adminStore.loadRealData();
      }
      return;
    }

    const permissions = this.adminStore.permissions();
    const normalized = normalizeRolePermissionIds(
      newPermissionIds.map((id) => id.toString()),
      permissions.map((p) => ({
        id: String(p.id),
        resource: p.resource ?? undefined,
        action: p.action,
        code: p.name
      }))
    );

    const currentPermissionIds = this.assignedPermissionIds();
    const permsToAdd = normalized.filter((id) => !currentPermissionIds.includes(id));
    const permsToRemove = currentPermissionIds.filter((id) => !normalized.includes(id));

    const actionRank = (id: string) => {
      const p = permissions.find((x) => String(x.id) === id);
      return isAccessAction(p?.action) ? 0 : 1;
    };

    permsToAdd.sort((a, b) => actionRank(a) - actionRank(b));
    permsToRemove.sort((a, b) => actionRank(b) - actionRank(a));

    try {
      for (const permissionId of permsToAdd) {
        await this.adminStore.assignPermissionToRole(roleId, permissionId);
      }
      for (const permissionId of permsToRemove) {
        await this.adminStore.removePermissionFromRole(roleId, permissionId);
      }

      await this.adminStore.loadRealData();

      const userId = this.authStore.user()?.id;
      if (userId && this.adminStore.userRoles().some((ur) => ur.userId === userId && ur.roleId === roleId)) {
        await this.authStore.refreshSession();
      }
    } catch (err) {
      console.error('Error configuring permissions:', err);
      await this.adminStore.loadRealData();
    }
  }

  protected openCreateModal(role?: RolesTable): void {
    if (role) {
      this.editingRoleId.set(role.id);
      this.roleForm.reset({ name: role.name, normalized_name: role.normalized_name });
    } else {
      this.editingRoleId.set(null);
      this.roleForm.reset({ name: '', normalized_name: '' });
    }
    this.isCreateOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.onModalClose();
  }

  protected onModalClose(): void {
    this.roleForm.reset();
    this.isCreateOpen.set(false);
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

  protected openDeleteDialog(role: RolesTable): void {
    this.deleteTarget.set(role);
    this.isDeleteOpen.set(true);
  }

  protected closeDeleteDialog(): void {
    this.isDeleteOpen.set(false);
    this.deleteTarget.set(null);
    this.isDeleting.set(false);
  }

  protected async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;

    this.isDeleting.set(true);
    const ok = await this.rolesStore.deleteRole(target.id);
    this.isDeleting.set(false);
    if (ok) {
      this.closeDeleteDialog();
      await this.adminStore.loadRealData();
    }
  }
}
