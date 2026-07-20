import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { AdminStore, AdminStoreType } from '../admin-store';
import { PermissionsStore } from './permissions-store';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import {
  KkhPageHeaderComponent,
  KkhButtonComponent,
  KkhInputComponent,
  KkhTextareaComponent,
  KkhAlertComponent,
  KkhComboBoxComponent,
  KkhDataTableComponent,
  KkhCellDefDirective,
  KkhDialogComponent,
  KkhColumnDef
} from '../../../shared/ui';
import { PermissionsTable, ActionStatus } from '../../../types/database';
import { isProtectedPermission } from '../../../core/auth/system-defaults.util';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, Edit, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-admin-permissions',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    KkhPageHeaderComponent,
    KkhButtonComponent,
    KkhInputComponent,
    KkhTextareaComponent,
    KkhAlertComponent,
    KkhComboBoxComponent,
    KkhDataTableComponent,
    KkhCellDefDirective,
    KkhDialogComponent,
    LucideAngularModule
  ],
  providers: [
    PermissionsStore,
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
        title="Permissions"
        description="Fine-grained action grants. Page visibility uses {resource}_access; APIs use view/create/edit/delete."
      >
        @if (canCreate()) {
          <kkh-button variant="primary" (pressed)="openCreateModal()">+ Create Permission</kkh-button>
        }
      </kkh-page-header>

      @if (permissionsStore.error()) {
        <kkh-alert tone="danger">{{ permissionsStore.error() }}</kkh-alert>
      }

      <kkh-data-table
        [columns]="columns"
        [rows]="permissionsStore.pagedPermissions()"
        [totalCount]="permissionsStore.totalPermissionsCount()"
        [pageIndex]="permissionsStore.pageIndex()"
        [pageSize]="permissionsStore.pageSize()"
        [sorts]="permissionsStore.sorts()"
        [loading]="permissionsStore.isLoading()"
        emptyTitle="No permissions found"
        emptyDescription="Try adjusting your filters or search terms."
        (pageChange)="onPage($event)"
        (sortChange)="onSort($event)"
      >
        <div filters class="space-y-3">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <kkh-input
              label="Search Permissions"
              placeholder="Search by name, action, or resource..."
              [ngModel]="permissionsStore.filterText()"
              (ngModelChange)="permissionsStore.setFilterText($event)"
            />
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
            <p class="kkh-label text-[var(--kkh-muted)] normal-case tracking-normal">
              Tip: Click column headers to sort. <strong>Hold Shift</strong> while clicking to apply a <strong>multiple sort order</strong>.
            </p>
            @if (permissionsStore.sorts().length > 0) {
              <button
                type="button"
                (click)="permissionsStore.clearSorts()"
                class="text-[var(--kkh-accent)] font-mono text-xs uppercase tracking-wider cursor-pointer"
              >
                Clear active sorts ({{ permissionsStore.sorts().length }})
              </button>
            }
          </div>
        </div>

        <ng-template kkhCell="action" let-row>
          <span class="kkh-chip kkh-chip-accent uppercase">{{ row.action }}</span>
        </ng-template>

        <ng-template kkhCell="description" let-row>
          <span class="text-[var(--kkh-muted)]">{{ row.description || '-' }}</span>
        </ng-template>

        <ng-template kkhCell="resource" let-row>
          <span class="text-[var(--kkh-muted)]">{{ row.resource || '-' }}</span>
        </ng-template>

        <ng-template kkhCell="actions" let-row>
          <div class="flex items-center justify-end gap-3">
            @if (canEdit()) {
              <button
                type="button"
                (click)="openCreateModal(row)"
                class="text-[var(--kkh-accent)] hover:opacity-80 transition-opacity cursor-pointer"
                title="Edit Permission"
              >
                <lucide-icon name="edit" class="h-4.5 w-4.5" [strokeWidth]="2"></lucide-icon>
              </button>
            }
            @if (canDelete() && !isProtectedPermissionRow(row)) {
              <button
                type="button"
                (click)="openDeleteDialog(row)"
                class="text-[var(--kkh-danger)] hover:opacity-80 transition-opacity cursor-pointer"
                title="Delete Permission"
              >
                <lucide-icon name="trash-2" class="h-4.5 w-4.5" [strokeWidth]="2"></lucide-icon>
              </button>
            }
          </div>
        </ng-template>
      </kkh-data-table>
    </div>

    <kkh-dialog
      [open]="isCreateOpen()"
      [title]="editingPermissionId() ? 'Edit Permission' : 'Create New Permission'"
      [showDefaultActions]="false"
      (closed)="onModalClose()"
    >
      <form id="permission-form" [formGroup]="permissionForm" (ngSubmit)="onCreateSubmit()" class="kkh-dialog__form">
        <kkh-input
          label="Permission Name"
          formControlName="name"
          placeholder="e.g. users_access"
          [error]="permissionForm.get('name')?.hasError('required') && permissionForm.get('name')?.touched ? 'Permission name is required' : null"
        />

        <kkh-combo-box
          label="Action Type"
          formControlName="action"
          placeholder="Select an action..."
          endpoint="/permissions/actions/list"
          [mapItem]="actionMapItem"
          [error]="permissionForm.get('action')?.hasError('required') && permissionForm.get('action')?.touched ? 'Action type is required' : null"
        />

        <kkh-combo-box
          label="Resource"
          formControlName="resource"
          placeholder="Select a resource..."
          endpoint="/navigation/resources/list"
          [mapItem]="resourceMapItem"
          [error]="permissionForm.get('resource')?.hasError('required') && permissionForm.get('resource')?.touched ? 'Resource is required' : null"
        />

        <kkh-textarea
          label="Description"
          formControlName="description"
          [rows]="2"
          placeholder="Describe the permission..."
          [error]="permissionForm.get('description')?.hasError('required') && permissionForm.get('description')?.touched ? 'Description is required' : null"
        />
      </form>
      <div footer class="contents">
        <kkh-button variant="ghost" type="button" (pressed)="closeCreateModal()">Cancel</kkh-button>
        <kkh-button variant="primary" type="submit" form="permission-form" [disabled]="permissionForm.invalid">
          {{ editingPermissionId() ? 'Save Changes' : 'Create Permission' }}
        </kkh-button>
      </div>
    </kkh-dialog>

    <kkh-dialog
      [open]="isDeleteOpen()"
      title="Delete Permission"
      [subtitle]="deleteTarget() ? 'Permanently remove permission ' + deleteTarget()!.name + '. Role bindings will be removed. This cannot be undone.' : null"
      confirmLabel="Delete"
      confirmVariant="danger"
      [confirmLoading]="isDeleting()"
      (closed)="closeDeleteDialog()"
      (confirmed)="confirmDelete()"
    />
  `
})
export class PermissionsComponent implements OnInit {
  protected readonly adminStore = inject(AdminStore) as unknown as AdminStoreType;
  protected readonly permissionsStore = inject(PermissionsStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly canView = computed(() => this.authStore.hasPermission('permissions_view'));
  protected readonly canCreate = computed(() => this.authStore.hasPermission('permissions_create'));
  protected readonly canEdit = computed(() => this.authStore.hasPermission('permissions_edit'));
  protected readonly canDelete = computed(() => this.authStore.hasPermission('permissions_delete'));

  protected readonly isCreateOpen = signal(false);
  protected readonly isDeleteOpen = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly deleteTarget = signal<PermissionsTable | null>(null);
  protected readonly editingPermissionId = signal<number | null>(null);

  protected readonly columns: KkhColumnDef[] = [
    { id: 'id', header: 'ID', sortable: true },
    { id: 'name', header: 'Name', sortable: true },
    { id: 'action', header: 'Action', sortable: true },
    { id: 'resource', header: 'Resource', sortable: true },
    { id: 'description', header: 'Description', sortable: true },
    { id: 'actions', header: 'Actions', align: 'right' }
  ];

  protected readonly resourceMapItem = (item: { name?: string }) => ({
    value: String(item.name ?? ''),
    label: String(item.name ?? '')
  });

  protected readonly actionMapItem = (item: { value?: string; label?: string }) => ({
    value: String(item.value ?? ''),
    label: String(item.label ?? item.value ?? '')
  });

  protected readonly permissionForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    action: new FormControl<ActionStatus>('access', { nonNullable: true, validators: [Validators.required] }),
    resource: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
  });

  constructor() {
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
    if (this.canView()) {
      this.permissionsStore.loadPermissions();
    }
  }

  protected onPage(event: { pageIndex: number; pageSize: number }): void {
    this.permissionsStore.setPage(event.pageIndex, event.pageSize);
  }

  protected onSort(event: { field: string; multi: boolean }): void {
    this.permissionsStore.toggleSort(event.field as keyof PermissionsTable, event.multi);
  }

  protected isProtectedPermissionRow(permission: PermissionsTable): boolean {
    return isProtectedPermission(permission.name, permission.resource);
  }

  protected openCreateModal(permission?: PermissionsTable): void {
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
    this.isCreateOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.onModalClose();
  }

  protected onModalClose(): void {
    this.permissionForm.reset();
    this.isCreateOpen.set(false);
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

  protected openDeleteDialog(permission: PermissionsTable): void {
    this.deleteTarget.set(permission);
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
    const ok = await this.permissionsStore.deletePermission(target.id);
    this.isDeleting.set(false);
    if (ok) {
      this.closeDeleteDialog();
      await this.adminStore.loadRealData();
    }
  }
}
