import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AdminStore, AdminStoreType } from '../admin-store';
import { ResourcesStore } from './resources-store';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import {
  isValidResourceName,
  normalizeResourceName,
  RESOURCE_NAME_FORMAT_HINT
} from '../../../core/auth/resource-naming.util';
import { isSystemDefaultResource } from '../../../core/auth/system-defaults.util';
import {
  KkhPageHeaderComponent,
  KkhButtonComponent,
  KkhInputComponent,
  KkhAlertComponent,
  KkhDataTableComponent,
  KkhCellDefDirective,
  KkhDialogComponent,
  KkhColumnDef,
  KkhSystemDefaultBadgeComponent
} from '../../../shared/ui';
import { ResourceTable } from '../../../types/database';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, Trash2 } from 'lucide-angular';

function resourceNameValidator(control: AbstractControl): ValidationErrors | null {
  const raw = (control.value ?? '').toString();
  if (!raw.trim()) {
    return null;
  }
  return isValidResourceName(raw) ? null : { resourceNameFormat: true };
}

@Component({
  selector: 'app-admin-resources',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    KkhPageHeaderComponent,
    KkhButtonComponent,
    KkhInputComponent,
    KkhAlertComponent,
    KkhDataTableComponent,
    KkhCellDefDirective,
    KkhDialogComponent,
    KkhSystemDefaultBadgeComponent,
    LucideAngularModule
  ],
  providers: [
    ResourcesStore,
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Trash2 })
    }
  ],
  template: `
    <div class="space-y-6 kkh-page-enter">
      <kkh-page-header
        eyebrow="ACCESS"
        title="Resources"
        description="IAM resource catalog. Each resource gets access, view, create, edit, and delete permissions."
      >
        @if (canCreate()) {
          <kkh-button variant="primary" (pressed)="openCreateModal()">+ Create Resource</kkh-button>
        }
      </kkh-page-header>

      @if (!canView()) {
        <kkh-alert tone="danger">You need resources_view to load resource data.</kkh-alert>
      } @else if (resourcesStore.error()) {
        <kkh-alert tone="danger">{{ resourcesStore.error() }}</kkh-alert>
      }

      @if (canView()) {
        <kkh-data-table
          [columns]="columns"
          [rows]="resourcesStore.pagedResources()"
          [totalCount]="resourcesStore.totalResourcesCount()"
          [pageIndex]="resourcesStore.pageIndex()"
          [pageSize]="resourcesStore.pageSize()"
          [loading]="resourcesStore.isLoading()"
          emptyTitle="No resources found"
          emptyDescription="Try adjusting your filters or search terms."
          (pageChange)="onPage($event)"
        >
          <div filters class="space-y-3">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <kkh-input
                label="Search Resources"
                placeholder="Search by name..."
                [ngModel]="resourcesStore.filterText()"
                (ngModelChange)="resourcesStore.setFilterText($event)"
              />
            </div>
          </div>

          <ng-template kkhCell="name" let-row>
            <span class="font-mono text-sm text-[var(--kkh-text)]">{{ row.name }}</span>
          </ng-template>

          <ng-template kkhCell="actions" let-row>
            <div class="flex items-center justify-end gap-3">
              @if (isProtectedResource(row)) {
                <kkh-system-default-badge />
              }
              @if (canDelete() && !isProtectedResource(row)) {
                <button
                  type="button"
                  (click)="openDeleteDialog(row)"
                  class="text-[var(--kkh-danger)] hover:opacity-80 transition-opacity cursor-pointer"
                  title="Delete Resource"
                >
                  <lucide-icon name="trash-2" class="h-4.5 w-4.5" [strokeWidth]="2"></lucide-icon>
                </button>
              }
            </div>
          </ng-template>
        </kkh-data-table>
      }
    </div>

    <kkh-dialog
      [open]="isCreateOpen()"
      title="Create Resource"
      [showDefaultActions]="false"
      (closed)="closeCreateModal()"
    >
      <form id="resource-form" [formGroup]="resourceForm" (ngSubmit)="onCreateSubmit()" class="kkh-dialog__form">
        <kkh-input
          label="Resource Name"
          formControlName="name"
          placeholder="e.g. help_desk"
          [hint]="formatHint"
          [error]="nameError()"
        />
      </form>
      <div footer class="contents">
        <kkh-button variant="ghost" type="button" (pressed)="closeCreateModal()">Cancel</kkh-button>
        <kkh-button variant="primary" type="submit" form="resource-form" [disabled]="resourceForm.invalid">
          Create Resource
        </kkh-button>
      </div>
    </kkh-dialog>

    <kkh-dialog
      [open]="isDeleteOpen()"
      title="Delete Resource"
      [subtitle]="deleteTarget() ? 'Permanently remove resource ' + deleteTarget()!.name + ' and its permissions. This cannot be undone.' : null"
      confirmLabel="Delete"
      confirmVariant="danger"
      [confirmLoading]="isDeleting()"
      (closed)="closeDeleteDialog()"
      (confirmed)="confirmDelete()"
    />
  `
})
export class ResourcesComponent implements OnInit {
  protected readonly adminStore = inject(AdminStore) as unknown as AdminStoreType;
  protected readonly resourcesStore = inject(ResourcesStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly formatHint = RESOURCE_NAME_FORMAT_HINT;

  protected readonly canView = computed(() => this.authStore.hasPermission('resources_view'));
  protected readonly canCreate = computed(() => this.authStore.hasPermission('resources_create'));
  protected readonly canDelete = computed(() => this.authStore.hasPermission('resources_delete'));

  protected readonly isCreateOpen = signal(false);
  protected readonly isDeleteOpen = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly deleteTarget = signal<ResourceTable | null>(null);

  protected readonly columns: KkhColumnDef[] = [
    { id: 'name', header: 'Name' },
    { id: 'actions', header: 'Actions', align: 'right' }
  ];

  protected readonly resourceForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, resourceNameValidator]
    })
  });

  ngOnInit(): void {
    if (this.canView()) {
      this.resourcesStore.loadResources();
    }
  }

  protected onPage(event: { pageIndex: number; pageSize: number }): void {
    this.resourcesStore.setPage(event.pageIndex, event.pageSize);
  }

  protected isProtectedResource(resource: ResourceTable): boolean {
    return isSystemDefaultResource(resource);
  }

  protected nameError(): string | null {
    const control = this.resourceForm.controls.name;
    if (!control.touched) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Resource name is required';
    }
    if (control.hasError('resourceNameFormat')) {
      return RESOURCE_NAME_FORMAT_HINT;
    }
    return null;
  }

  protected openCreateModal(): void {
    this.resourceForm.reset({ name: '' });
    this.isCreateOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.resourceForm.reset({ name: '' });
    this.isCreateOpen.set(false);
  }

  protected async onCreateSubmit(): Promise<void> {
    if (this.resourceForm.invalid) {
      this.resourceForm.markAllAsTouched();
      return;
    }

    const name = normalizeResourceName(this.resourceForm.controls.name.value);
    const ok = await this.resourcesStore.addResource(name);
    if (ok) {
      this.closeCreateModal();
    }
  }

  protected openDeleteDialog(resource: ResourceTable): void {
    this.deleteTarget.set(resource);
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
    const ok = await this.resourcesStore.deleteResource(target.name);
    this.isDeleting.set(false);
    if (ok) {
      this.closeDeleteDialog();
      await this.adminStore.loadRealData();
    }
  }
}
