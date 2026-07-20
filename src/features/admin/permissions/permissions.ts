import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { AdminStore, AdminStoreType } from '../admin-store';
import { PermissionsStore } from './permissions-store';
import { NavigationStore } from '../navigation/navigation-store';
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
  KkhTransferComponent,
  KkhDialogComponent,
  KkhColumnDef
} from '../../../shared/ui';
import { PermissionsTable, ActionStatus } from '../../../types/database';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, Menu as MenuIcon, Edit, Layout } from 'lucide-angular';

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
    KkhTransferComponent,
    KkhDialogComponent,
    LucideAngularModule
  ],
  providers: [
    PermissionsStore,
    NavigationStore,
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Menu: MenuIcon, Edit, Layout })
    }
  ],
  template: `
    <div class="space-y-6 kkh-page-enter">
      <kkh-page-header
        eyebrow="ACCESS"
        title="Permissions"
        description="Fine-grained action grants mapped to resources."
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

        <ng-template kkhCell="menus" let-row>
          @let count = getPermissionMenuCount(row.id.toString());
          <button
            type="button"
            class="kkh-relation-summary"
            [class.kkh-relation-summary--empty]="count === 0"
            [disabled]="!canEdit()"
            (click)="canEdit() && openAssignDialog(row.id.toString())"
            [attr.aria-label]="count === 0 ? 'Assign navigation' : 'Manage ' + count + ' navigation items'"
            [title]="count === 0 ? 'Visible to all — click to restrict navigation' : count + ' navigation items linked — click to manage'"
          >
            <span class="kkh-relation-summary__count">
              <span class="kkh-relation-summary__label">
                {{ count === 0 ? 'All navigation' : count + (count === 1 ? ' item' : ' items') }}
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
              (click)="openAssignDialog(row.id.toString())"
              class="text-[var(--kkh-accent)] hover:opacity-80 transition-opacity cursor-pointer"
              title="Assign Navigation"
            >
              <lucide-icon name="layout" class="h-4.5 w-4.5" [strokeWidth]="2"></lucide-icon>
            </button>
            <button
              type="button"
              (click)="openCreateModal(row)"
              class="text-[var(--kkh-accent)] hover:opacity-80 transition-opacity cursor-pointer"
              title="Edit Permission"
            >
              <lucide-icon name="edit" class="h-4.5 w-4.5" [strokeWidth]="2"></lucide-icon>
            </button>
            }
          </div>
        </ng-template>
      </kkh-data-table>
    </div>

    <kkh-transfer
      [open]="isDialogOpen()"
      [title]="dialogTitle()"
      [subtitle]="'Bind navigation items that require permission ' + activePermission()?.name"
      [allItems]="dialogOptions()"
      [assignedItemIds]="assignedMenuIds()"
      (assigned)="onMenusAssigned($event)"
      (closed)="closeAssignDialog()"
    />

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
          [mapItem]="statusMapItem"
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
  `
})
export class PermissionsComponent implements OnInit {
  protected readonly adminStore = inject(AdminStore) as unknown as AdminStoreType;
  protected readonly permissionsStore = inject(PermissionsStore);
  protected readonly navigationStore = inject(NavigationStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly canView = computed(() => this.authStore.hasPermission('permissions_view'));
  protected readonly canCreate = computed(() => this.authStore.hasPermission('permissions_create'));
  protected readonly canEdit = computed(() => this.authStore.hasPermission('permissions_edit'));

  protected readonly isCreateOpen = signal(false);

  protected readonly columns: KkhColumnDef[] = [
    { id: 'id', header: 'ID', sortable: true },
    { id: 'name', header: 'Name', sortable: true },
    { id: 'action', header: 'Action', sortable: true },
    { id: 'resource', header: 'Resource', sortable: true },
    { id: 'description', header: 'Description', sortable: true },
    { id: 'menus', header: 'Navigation' },
    { id: 'actions', header: 'Actions', align: 'right' }
  ];

  protected readonly activePermissionId = signal<string | null>(null);
  protected readonly isDialogOpen = signal(false);
  protected readonly editingPermissionId = signal<number | null>(null);

  protected readonly activePermission = computed(() => {
    const permId = this.activePermissionId();
    if (!permId) return null;
    return this.permissionsStore.permissions().find(p => p.id.toString() === permId) || null;
  });

  protected readonly dialogTitle = computed(() =>
    this.activePermission() ? `Assign Navigation for ${this.activePermission()!.name}` : 'Assign Navigation'
  );

  protected readonly dialogOptions = computed(() => {
    const perm = this.activePermission();
    if (!perm || !perm.resource) return [];

    return this.navigationStore.items()
      .filter(m => m.resource === perm.resource)
      .map(m => ({
        id: m.id.toString(),
        name: m.title || 'Untitled',
        description: m.route
      }));
  });

  protected readonly assignedMenuIds = computed(() => {
    const permissionId = this.activePermissionId();
    if (!permissionId) return [];
    return this.adminStore.permissionMenus()
      .filter(pm => pm.permissionId === permissionId)
      .map(pm => pm.menuId.toString());
  });

  protected readonly statusMapItem = (item: { status?: string }) => ({
    value: String(item.status ?? ''),
    label: String(item.status ?? '')
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
    this.navigationStore.loadItems();
  }

  protected onPage(event: { pageIndex: number; pageSize: number }): void {
    this.permissionsStore.setPage(event.pageIndex, event.pageSize);
  }

  protected onSort(event: { field: string; multi: boolean }): void {
    this.permissionsStore.toggleSort(event.field as keyof PermissionsTable, event.multi);
  }

  protected getPermissionMenuCount(permissionId: string): number {
    return this.adminStore.permissionMenus().filter(pm => pm.permissionId === permissionId).length;
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
}
