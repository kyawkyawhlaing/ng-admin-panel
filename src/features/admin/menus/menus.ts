import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenusStore } from './menus-store';
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
  SelectOption
} from '../../../shared/ui';
import { MenusTable } from '../../../types/database';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, Menu, Edit, Home, Settings, Users, Key, Database, Shield, Layout, FileText, Component as ComponentIcon } from 'lucide-angular';

@Component({
  selector: 'app-admin-menus',
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
    MenusStore,
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        Menu,
        Edit,
        Home,
        Settings,
        Users,
        Key,
        Database,
        Shield,
        Layout,
        FileText,
        Component: ComponentIcon
      })
    }
  ],
  template: `
    <div class="space-y-6 kkh-page-enter">
      <kkh-page-header
        eyebrow="NAV"
        title="Menus"
        description="Sidebar routes and visibility for the operator console."
      >
        @if (canCreate()) {
          <kkh-button variant="primary" (pressed)="openCreateModal()">+ Create Menu</kkh-button>
        }
      </kkh-page-header>

      @if (menusStore.error()) {
        <kkh-alert tone="danger">{{ menusStore.error() }}</kkh-alert>
      }

      <kkh-data-table
        [columns]="columns"
        [rows]="menusStore.pagedMenus()"
        [totalCount]="menusStore.totalMenusCount()"
        [pageIndex]="menusStore.pageIndex()"
        [pageSize]="menusStore.pageSize()"
        [sorts]="menusStore.sorts()"
        [loading]="menusStore.isLoading()"
        emptyTitle="No menus found"
        emptyDescription="Try adjusting your filters or search terms."
        (pageChange)="onPage($event)"
        (sortChange)="onSort($event)"
      >
        <div filters class="space-y-3">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <kkh-input
              label="Search Menus"
              placeholder="Search by name, path, or description..."
              [ngModel]="menusStore.filterText()"
              (ngModelChange)="menusStore.setFilterText($event)"
            />
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
            <p class="kkh-label text-[var(--kkh-muted)] normal-case tracking-normal">
              Tip: Click column headers to sort. <strong>Hold Shift</strong> while clicking to apply a <strong>multiple sort order</strong>.
            </p>
            @if (menusStore.sorts().length > 0) {
              <button
                type="button"
                (click)="menusStore.clearSorts()"
                class="text-[var(--kkh-accent)] font-mono text-xs uppercase tracking-wider cursor-pointer"
              >
                Clear active sorts ({{ menusStore.sorts().length }})
              </button>
            }
          </div>
        </div>

        <ng-template kkhCell="icon" let-row>
          <div class="flex justify-center items-center">
            @if (row.icon) {
              <lucide-icon [name]="row.icon" class="w-5 h-5 text-[var(--kkh-accent)]" [strokeWidth]="2" />
            } @else {
              <lucide-icon name="menu" class="w-5 h-5 text-[var(--kkh-muted)]" [strokeWidth]="2" />
            }
          </div>
        </ng-template>

        <ng-template kkhCell="name" let-row>
          <span>{{ row.name || 'Unnamed Menu' }}</span>
        </ng-template>

        <ng-template kkhCell="api_path" let-row>
          <span class="text-[var(--kkh-muted)]">{{ row.api_path }}</span>
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
          <div class="flex items-center gap-2">
            @if (row.is_active) {
              <span class="kkh-chip kkh-chip-ok">Active</span>
            } @else {
              <span class="kkh-chip kkh-chip-muted">Inactive</span>
            }
            @if (row.is_visible) {
              <span class="kkh-chip kkh-chip-accent">Visible</span>
            } @else {
              <span class="kkh-chip kkh-chip-muted">Hidden</span>
            }
          </div>
        </ng-template>

        <ng-template kkhCell="actions" let-row>
          <div class="flex items-center justify-end gap-3">
            @if (canEdit()) {
            <button
              type="button"
              (click)="openCreateModal(row)"
              class="text-[var(--kkh-accent)] hover:opacity-80 transition-opacity cursor-pointer"
              title="Edit Menu"
            >
              <lucide-icon name="edit" class="w-4.5 h-4.5" [strokeWidth]="2" />
            </button>
            }
          </div>
        </ng-template>
      </kkh-data-table>
    </div>

    <kkh-dialog
      [open]="isCreateOpen()"
      [title]="editingMenuId() ? 'Edit Menu' : 'Create New Menu'"
      [wide]="true"
      [showDefaultActions]="false"
      (closed)="onModalClose()"
    >
      <form id="menu-form" [formGroup]="menuForm" (ngSubmit)="onCreateSubmit()" class="kkh-dialog__form">
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <kkh-combo-box
            label="Menu Name (Resource Mapping)"
            formControlName="name"
            placeholder="Select a resource mapping..."
            endpoint="/menus/statuses/list"
            [mapItem]="statusMapItem"
            [error]="menuForm.get('name')?.hasError('required') && menuForm.get('name')?.touched ? 'Name is required' : null"
          />

          <kkh-input
            label="API Path / Route"
            formControlName="api_path"
            placeholder="e.g. /admin/dashboard"
            [error]="menuForm.get('api_path')?.hasError('required') && menuForm.get('api_path')?.touched ? 'Path is required' : null"
          />
        </div>

        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <kkh-input
            label="Icon (Optional)"
            formControlName="icon"
            placeholder="e.g. users, shield, key, menu"
          />

          <kkh-combo-box
            label="Parent Menu"
            formControlName="parent_id"
            placeholder="Search parent menu..."
            endpoint="/menus/list"
            [extraOptions]="rootParentOption"
            [mapItem]="menuParentMapItem"
            [error]="menuForm.get('parent_id')?.hasError('required') && menuForm.get('parent_id')?.touched ? 'Parent is required' : null"
          />
        </div>

        <kkh-input
          label="Sort Order"
          type="number"
          formControlName="sort_order"
        />

        <kkh-textarea
          label="Description"
          formControlName="description"
          [rows]="2"
          placeholder="Brief description of this menu..."
          [error]="menuForm.get('description')?.hasError('required') && menuForm.get('description')?.touched ? 'Description is required' : null"
        />

        <div class="kkh-dialog__section">
          <span class="kkh-field-label">Menu Configuration</span>

          <div class="flex flex-col gap-3">
            <label class="flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                formControlName="is_active"
                class="h-4 w-4 rounded-sm border-[var(--kkh-border)] bg-[var(--kkh-panel)] text-[var(--kkh-accent)] cursor-pointer"
              />
              <span class="ml-3 text-sm text-[var(--kkh-text)]">Is Active</span>
            </label>

            <label class="flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                formControlName="is_visible"
                class="h-4 w-4 rounded-sm border-[var(--kkh-border)] bg-[var(--kkh-panel)] text-[var(--kkh-accent)] cursor-pointer"
              />
              <span class="ml-3 text-sm text-[var(--kkh-text)]">Is Visible in Sidebar</span>
            </label>
          </div>
        </div>
      </form>
      <div footer class="contents">
        <kkh-button variant="ghost" type="button" (pressed)="closeCreateModal()">Cancel</kkh-button>
        <kkh-button variant="primary" type="submit" form="menu-form" [disabled]="menuForm.invalid">
          {{ editingMenuId() ? 'Save Changes' : 'Create Menu' }}
        </kkh-button>
      </div>
    </kkh-dialog>
  `
})
export class MenusComponent implements OnInit {
  protected readonly menusStore = inject(MenusStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly canView = computed(() => this.authStore.hasPermission('menus_view'));
  protected readonly canCreate = computed(() => this.authStore.hasPermission('menus_create'));
  protected readonly canEdit = computed(() => this.authStore.hasPermission('menus_edit'));

  protected readonly isCreateOpen = signal(false);

  protected readonly columns: KkhColumnDef[] = [
    { id: 'icon', header: 'Icon', align: 'center' },
    { id: 'name', header: 'Name', sortable: true },
    { id: 'api_path', header: 'API Path', sortable: true },
    { id: 'description', header: 'Description', sortable: true },
    { id: 'parent_id', header: 'Parent ID', sortable: true },
    { id: 'sort_order', header: 'Order', sortable: true, align: 'center' },
    { id: 'status', header: 'Status' },
    { id: 'actions', header: 'Actions', align: 'right' }
  ];

  protected readonly editingMenuId = signal<number | null>(null);

  protected readonly rootParentOption: SelectOption[] = [
    { value: '0', label: 'Root (no parent)', description: 'Top-level menu item' }
  ];

  protected readonly statusMapItem = (item: { status?: string }) => ({
    value: String(item.status ?? ''),
    label: String(item.status ?? '')
  });

  protected readonly menuParentMapItem = (item: {
    id?: number;
    name?: string | null;
    api_path?: string;
  }) => ({
    value: String(item.id ?? ''),
    label: item.name || `Menu #${item.id}`,
    description: item.api_path
  });

  protected readonly menuForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    api_path: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    icon: new FormControl<string>('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    parent_id: new FormControl('0', { nonNullable: true, validators: [Validators.required] }),
    sort_order: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required] }),
    is_active: new FormControl<boolean>(true, { nonNullable: true }),
    is_visible: new FormControl<boolean>(true, { nonNullable: true })
  });

  ngOnInit() {
    if (this.canView()) {
      this.menusStore.loadMenus();
    }
  }

  protected onPage(event: { pageIndex: number; pageSize: number }): void {
    this.menusStore.setPage(event.pageIndex, event.pageSize);
  }

  protected onSort(event: { field: string; multi: boolean }): void {
    this.menusStore.toggleSort(event.field as keyof MenusTable, event.multi);
  }

  protected openCreateModal(menu?: MenusTable): void {
    if (menu) {
      this.editingMenuId.set(menu.id);
      this.menuForm.reset({
        name: menu.name || '',
        api_path: menu.api_path,
        icon: menu.icon || '',
        description: menu.description,
        parent_id: String(menu.parent_id ?? 0),
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
    this.menuForm.reset();
    this.isCreateOpen.set(false);
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
        parent_id: Number(formVal.parent_id),
        sort_order: Number(formVal.sort_order),
        is_active: formVal.is_active,
        is_visible: formVal.is_visible
      });
    } else {
      this.menusStore.addMenu({
        name: formVal.name || null,
        api_path: formVal.api_path,
        icon: formVal.icon || null,
        description: formVal.description,
        parent_id: Number(formVal.parent_id),
        sort_order: Number(formVal.sort_order),
        is_active: formVal.is_active,
        is_visible: formVal.is_visible
      });
    }

    this.closeCreateModal();
  }
}
