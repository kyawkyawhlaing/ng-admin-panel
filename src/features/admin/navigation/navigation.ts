import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationStore } from './navigation-store';
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
  KkhColumnDef,
  KkhSystemDefaultBadgeComponent,
  SelectOption
} from '../../../shared/ui';
import { NavigationItemTable } from '../../../types/database';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import { isProtectedNavigation } from '../../../core/auth/system-defaults.util';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  Menu,
  Edit,
  Trash2,
  Home,
  Settings,
  Users,
  Key,
  Database,
  Shield,
  Layout,
  FileText,
  Smartphone,
  Mail,
  Fingerprint,
  Route,
  Component as ComponentIcon
} from 'lucide-angular';

@Component({
  selector: 'app-admin-navigation',
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
    KkhSystemDefaultBadgeComponent,
    LucideAngularModule
  ],
  providers: [
    NavigationStore,
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        Menu,
        Edit,
        Trash2,
        Home,
        Settings,
        Users,
        Key,
        Database,
        Shield,
        Layout,
        FileText,
        Smartphone,
        Mail,
        Fingerprint,
        Route,
        Component: ComponentIcon
      })
    }
  ],
  template: `
    <div class="space-y-6 kkh-page-enter">
      <kkh-page-header
        eyebrow="NAV"
        title="Navigation"
        description="Sidebar routes and visibility for the operator console."
      >
        @if (canCreate()) {
          <kkh-button variant="primary" (pressed)="openCreateModal()">+ Create Item</kkh-button>
        }
      </kkh-page-header>

      @if (navigationStore.error()) {
        <kkh-alert tone="danger">{{ navigationStore.error() }}</kkh-alert>
      }

      <kkh-data-table
        [columns]="columns"
        [rows]="navigationStore.pagedItems()"
        [totalCount]="navigationStore.totalCount()"
        [pageIndex]="navigationStore.pageIndex()"
        [pageSize]="navigationStore.pageSize()"
        [sorts]="navigationStore.sorts()"
        [loading]="navigationStore.isLoading()"
        emptyTitle="No navigation items found"
        emptyDescription="Try adjusting your filters or search terms."
        (pageChange)="onPage($event)"
        (sortChange)="onSort($event)"
      >
        <div filters class="space-y-3">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <kkh-input
              label="Search Navigation"
              placeholder="Search by title, route, or description..."
              [ngModel]="navigationStore.filterText()"
              (ngModelChange)="navigationStore.setFilterText($event)"
            />
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
            <p class="kkh-label text-[var(--kkh-muted)] normal-case tracking-normal">
              Tip: Click column headers to sort. <strong>Hold Shift</strong> while clicking to apply a <strong>multiple sort order</strong>.
            </p>
            @if (navigationStore.sorts().length > 0) {
              <button
                type="button"
                (click)="navigationStore.clearSorts()"
                class="text-[var(--kkh-accent)] font-mono text-xs uppercase tracking-wider cursor-pointer"
              >
                Clear active sorts ({{ navigationStore.sorts().length }})
              </button>
            }
          </div>
        </div>

        <ng-template kkhCell="icon" let-row>
          <div class="flex justify-center items-center">
            @if (row.icon) {
              <lucide-icon [name]="row.icon" class="w-5 h-5 text-[var(--kkh-accent)]" [strokeWidth]="2" />
            } @else {
              <lucide-icon name="layout" class="w-5 h-5 text-[var(--kkh-muted)]" [strokeWidth]="2" />
            }
          </div>
        </ng-template>

        <ng-template kkhCell="title" let-row>
          <span>{{ row.title || 'Untitled' }}</span>
        </ng-template>

        <ng-template kkhCell="route" let-row>
          <span class="text-[var(--kkh-muted)]">{{ row.route }}</span>
        </ng-template>

        <ng-template kkhCell="resource" let-row>
          <span class="text-[var(--kkh-muted)]">{{ row.resource || '-' }}</span>
        </ng-template>

        <ng-template kkhCell="description" let-row>
          <span class="text-[var(--kkh-muted)] max-w-xs truncate block" [title]="row.description">{{ row.description }}</span>
        </ng-template>

        <ng-template kkhCell="parent_id" let-row>
          <span class="text-[var(--kkh-muted)]">{{ row.parent_id === 0 ? 'Root (0)' : row.parent_id }}</span>
        </ng-template>

        <ng-template kkhCell="sort_order" let-row>
          <span class="text-[var(--kkh-muted)]">{{ row.sort_order }}</span>
        </ng-template>

        <ng-template kkhCell="status" let-row>
          @if (isProtectedNavItem(row) || !canEdit()) {
            <div class="flex flex-col gap-1.5 min-w-[9rem]">
              <span class="kkh-chip w-fit" [class.kkh-chip-ok]="row.is_active" [class.kkh-chip-muted]="!row.is_active">
                {{ row.is_active ? 'Active' : 'Inactive' }}
              </span>
              <span class="kkh-chip w-fit" [class.kkh-chip-accent]="row.is_visible" [class.kkh-chip-muted]="!row.is_visible"
                [title]="isProtectedNavItem(row) ? 'Built-in navigation cannot be changed' : null">
                {{ row.is_visible ? 'Visible' : 'Hidden' }}
              </span>
            </div>
          } @else {
            <div class="flex flex-col gap-1.5 min-w-[9rem]">
              <button
                type="button"
                class="kkh-relation-summary"
                [class.kkh-relation-summary--empty]="!row.is_active"
                (click)="navigationStore.toggleActive(row.id)"
                [attr.aria-label]="row.is_active ? 'Deactivate item' : 'Activate item'"
                [title]="row.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'"
              >
                <span class="kkh-relation-summary__count">
                  <span class="kkh-relation-summary__label">
                    {{ row.is_active ? 'Active' : 'Inactive' }}
                  </span>
                  <span class="kkh-relation-summary__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </span>
                </span>
              </button>
              <button
                type="button"
                class="kkh-relation-summary"
                [class.kkh-relation-summary--empty]="!row.is_visible"
                (click)="navigationStore.toggleVisible(row.id)"
                [attr.aria-label]="row.is_visible ? 'Hide from sidebar' : 'Show in sidebar'"
                [title]="row.is_visible ? 'Visible in sidebar — click to hide' : 'Hidden from sidebar — click to show'"
              >
                <span class="kkh-relation-summary__count">
                  <span class="kkh-relation-summary__label">
                    {{ row.is_visible ? 'Visible' : 'Hidden' }}
                  </span>
                  <span class="kkh-relation-summary__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </span>
                </span>
              </button>
            </div>
          }
        </ng-template>

        <ng-template kkhCell="actions" let-row>
          <div class="flex items-center justify-end gap-3">
            @if (isProtectedNavItem(row)) {
              <kkh-system-default-badge />
            }
            @if (canEdit() && !isProtectedNavItem(row)) {
            <button
              type="button"
              (click)="openCreateModal(row)"
              class="text-[var(--kkh-accent)] hover:opacity-80 transition-opacity cursor-pointer"
              title="Edit Navigation Item"
            >
              <lucide-icon name="edit" class="w-4.5 h-4.5" [strokeWidth]="2" />
            </button>
            }
            @if (canDelete() && !isProtectedNavItem(row)) {
              <button
                type="button"
                (click)="openDeleteDialog(row)"
                class="text-[var(--kkh-danger)] hover:opacity-80 transition-opacity cursor-pointer"
                title="Delete Navigation Item"
              >
                <lucide-icon name="trash-2" class="w-4.5 h-4.5" [strokeWidth]="2" />
              </button>
            }
          </div>
        </ng-template>
      </kkh-data-table>
    </div>

    <kkh-dialog
      [open]="isCreateOpen()"
      [title]="editingItemId() ? 'Edit Navigation Item' : 'Create Navigation Item'"
      [wide]="true"
      [showDefaultActions]="false"
      (closed)="onModalClose()"
    >
      <form id="navigation-form" [formGroup]="navForm" (ngSubmit)="onCreateSubmit()" class="kkh-dialog__form">
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <kkh-input
            label="Title"
            formControlName="title"
            placeholder="e.g. Users"
            [error]="navForm.get('title')?.hasError('required') && navForm.get('title')?.touched ? 'Title is required' : null"
          />

          <kkh-input
            label="Route (SPA)"
            formControlName="route"
            placeholder="e.g. /admin/dashboard"
            [error]="navForm.get('route')?.hasError('required') && navForm.get('route')?.touched ? 'Route is required' : null"
          />
        </div>

        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <kkh-combo-box
            label="Access resource"
            formControlName="resource"
            placeholder="Select a custom resource..."
            endpoint="/navigation/resources/assignable/list"
            [mapItem]="resourceMapItem"
            [error]="navForm.get('resource')?.hasError('required') && navForm.get('resource')?.touched ? 'Resource is required' : null"
          />

          <kkh-input
            label="Icon"
            formControlName="icon"
            placeholder="e.g. users, shield, key, layout"
          />
        </div>

        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <kkh-combo-box
            label="Parent"
            formControlName="parent_id"
            placeholder="Search parent item..."
            endpoint="/navigation/list"
            [extraOptions]="rootParentOption"
            [mapItem]="parentMapItem"
            [error]="navForm.get('parent_id')?.hasError('required') && navForm.get('parent_id')?.touched ? 'Parent is required' : null"
          />

          <kkh-input
            label="Sort"
            type="number"
            formControlName="sort_order"
          />
        </div>

        <kkh-textarea
          label="Description"
          formControlName="description"
          [rows]="2"
          placeholder="Brief description of this navigation item..."
          [error]="navForm.get('description')?.hasError('required') && navForm.get('description')?.touched ? 'Description is required' : null"
        />
      </form>
      <div footer class="contents">
        <kkh-button variant="ghost" type="button" (pressed)="closeCreateModal()">Cancel</kkh-button>
        <kkh-button variant="primary" type="submit" form="navigation-form" [disabled]="navForm.invalid">
          {{ editingItemId() ? 'Save Changes' : 'Create Item' }}
        </kkh-button>
      </div>
    </kkh-dialog>

    <kkh-dialog
      [open]="isDeleteOpen()"
      title="Delete Navigation Item"
      [subtitle]="deleteTarget() ? 'Permanently remove ' + deleteTarget()!.title + '. Child items will be moved to root. This cannot be undone.' : null"
      confirmLabel="Delete"
      confirmVariant="danger"
      [confirmLoading]="isDeleting()"
      (closed)="closeDeleteDialog()"
      (confirmed)="confirmDelete()"
    />
  `
})
export class NavigationComponent implements OnInit {
  protected readonly navigationStore = inject(NavigationStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly canView = computed(() => this.authStore.hasPermission('navigation_view'));
  protected readonly canCreate = computed(() => this.authStore.hasPermission('navigation_create'));
  protected readonly canEdit = computed(() => this.authStore.hasPermission('navigation_edit'));
  protected readonly canDelete = computed(() => this.authStore.hasPermission('navigation_delete'));

  protected readonly isCreateOpen = signal(false);
  protected readonly isDeleteOpen = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly deleteTarget = signal<NavigationItemTable | null>(null);

  protected readonly columns: KkhColumnDef[] = [
    { id: 'icon', header: 'Icon', align: 'center' },
    { id: 'title', header: 'Title', sortable: true },
    { id: 'route', header: 'Route', sortable: true },
    { id: 'resource', header: 'Resource', sortable: true },
    { id: 'description', header: 'Description', sortable: true },
    { id: 'parent_id', header: 'Parent ID', sortable: true },
    { id: 'sort_order', header: 'Order', sortable: true, align: 'center' },
    { id: 'status', header: 'Status' },
    { id: 'actions', header: 'Actions', align: 'right' }
  ];

  protected readonly editingItemId = signal<number | null>(null);

  protected readonly rootParentOption: SelectOption[] = [
    { value: '0', label: 'Root (no parent)', description: 'Top-level navigation item' }
  ];

  protected readonly resourceMapItem = (item: { name?: string }) => ({
    value: String(item.name ?? ''),
    label: String(item.name ?? '')
  });

  protected readonly parentMapItem = (item: {
    id?: number;
    title?: string | null;
    route?: string;
  }) => ({
    value: String(item.id ?? ''),
    label: item.title || `Item #${item.id}`,
    description: item.route
  });

  protected readonly navForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    route: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    resource: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    icon: new FormControl<string>('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    parent_id: new FormControl('0', { nonNullable: true, validators: [Validators.required] }),
    sort_order: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required] }),
    is_active: new FormControl<boolean>(true, { nonNullable: true }),
    is_visible: new FormControl<boolean>(true, { nonNullable: true })
  });

  ngOnInit() {
    if (this.canView()) {
      this.navigationStore.loadItems();
    }
  }

  protected onPage(event: { pageIndex: number; pageSize: number }): void {
    this.navigationStore.setPage(event.pageIndex, event.pageSize);
  }

  protected onSort(event: { field: string; multi: boolean }): void {
    this.navigationStore.toggleSort(event.field as keyof NavigationItemTable, event.multi);
  }

  protected openCreateModal(item?: NavigationItemTable): void {
    if (item && this.isProtectedNavItem(item)) {
      return;
    }
    if (item) {
      this.editingItemId.set(item.id);
      this.navForm.reset({
        title: item.title || '',
        route: item.route,
        resource: item.resource || '',
        icon: item.icon || '',
        description: item.description,
        parent_id: String(item.parent_id ?? 0),
        sort_order: item.sort_order,
        is_active: item.is_active,
        is_visible: item.is_visible
      });
    } else {
      this.editingItemId.set(null);
      this.navForm.reset({
        title: '',
        route: '',
        resource: '',
        icon: '',
        description: '',
        parent_id: '0',
        sort_order: 0,
        is_active: true,
        is_visible: true
      });
    }
    this.isCreateOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.onModalClose();
  }

  protected onModalClose(): void {
    this.navForm.reset();
    this.isCreateOpen.set(false);
  }

  protected onCreateSubmit(): void {
    if (this.navForm.invalid) {
      this.navForm.markAllAsTouched();
      return;
    }

    const formVal = this.navForm.getRawValue();
    const editId = this.editingItemId();

    const payload = {
      title: formVal.title,
      route: formVal.route,
      resource: formVal.resource || null,
      icon: formVal.icon || null,
      description: formVal.description,
      parent_id: Number(formVal.parent_id),
      sort_order: Number(formVal.sort_order),
      is_active: formVal.is_active,
      is_visible: formVal.is_visible
    };

    if (editId) {
      this.navigationStore.editItem(editId, payload);
    } else {
      this.navigationStore.addItem(payload);
    }

    this.closeCreateModal();
  }

  protected openDeleteDialog(item: NavigationItemTable): void {
    this.deleteTarget.set(item);
    this.isDeleteOpen.set(true);
  }

  protected isProtectedNavItem(item: NavigationItemTable): boolean {
    return isProtectedNavigation(item.resource, item.route);
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
    const ok = await this.navigationStore.deleteItem(target.id);
    this.isDeleting.set(false);
    if (ok) {
      this.closeDeleteDialog();
    }
  }
}
