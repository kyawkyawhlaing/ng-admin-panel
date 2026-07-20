import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AdminStore, AdminStoreType } from '../admin-store';
import { UsersStore } from './users-store';
import {
  KkhPageHeaderComponent,
  KkhButtonComponent,
  KkhInputComponent,
  KkhSelectComponent,
  KkhDataTableComponent,
  KkhCellDefDirective,
  KkhTransferComponent,
  KkhDialogComponent,
  KkhColumnDef,
  SelectOption
} from '../../../shared/ui';
import { UsersTable } from '../../../types/database';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider, Edit, Trash2 } from 'lucide-angular';
import { isProtectedAdminEmail, isSysAdminRole } from '../../../core/auth/system-defaults.util';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (!password || !confirmPassword) return null;
  // Optional password on edit: both empty is fine.
  if (!password.value && !confirmPassword.value) return null;
  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
};

const passwordComplexityValidators = [
  Validators.required,
  Validators.minLength(8),
  Validators.pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[\W_]).+$/)
];


@Component({
  selector: 'app-admin-users',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    KkhPageHeaderComponent,
    KkhButtonComponent,
    KkhInputComponent,
    KkhSelectComponent,
    KkhDataTableComponent,
    KkhCellDefDirective,
    KkhTransferComponent,
    KkhDialogComponent,
    LucideAngularModule
  ],
  providers: [
    UsersStore,
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({ Edit, Trash2 })
    }
  ],
  template: `
    <div class="space-y-6 kkh-page-enter">
      <kkh-page-header
        eyebrow="IDENTITY"
        title="Operators"
        description="Directory of console accounts, lockout state, and role bindings."
      >
        @if (canCreate()) {
          <kkh-button variant="primary" (pressed)="openCreateModal()">+ Create User</kkh-button>
        }
      </kkh-page-header>

      <kkh-data-table
        [columns]="columns"
        [rows]="usersStore.pagedUsers()"
        [totalCount]="usersStore.totalUsersCount()"
        [pageIndex]="usersStore.pageIndex()"
        [pageSize]="usersStore.pageSize()"
        [sorts]="usersStore.sorts()"
        [loading]="usersStore.isLoading()"
        emptyTitle="No users found"
        emptyDescription="Try adjusting your filters or search terms."
        (pageChange)="onPage($event)"
        (sortChange)="onSort($event)"
      >
        <div filters class="space-y-3">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <kkh-input
              label="Search Users"
              placeholder="Search name or email..."
              [ngModel]="usersStore.filterText()"
              (ngModelChange)="usersStore.setFilterText($event)"
            />
            <kkh-select
              label="Lockout Status"
              [options]="lockoutOptions"
              [ngModel]="usersStore.lockoutFilter()"
              (ngModelChange)="usersStore.setLockoutFilter($event)"
            />
            <kkh-select
              label="MFA Enabled"
              [options]="mfaOptions"
              [ngModel]="usersStore.twoFactorFilter()"
              (ngModelChange)="usersStore.setTwoFactorFilter($event)"
            />
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
            <p class="kkh-label text-[var(--kkh-muted)] normal-case tracking-normal">
              Tip: Click column headers to sort. <strong>Hold Shift</strong> while clicking to apply a <strong>multiple sort order</strong>.
            </p>
            @if (usersStore.sorts().length > 0) {
              <button
                type="button"
                (click)="usersStore.clearSorts()"
                class="text-[var(--kkh-accent)] font-mono text-xs uppercase tracking-wider cursor-pointer"
              >
                Clear active sorts ({{ usersStore.sorts().length }})
              </button>
            }
          </div>
        </div>

        <ng-template kkhCell="roles" let-row>
          @let count = getUserRoleCount(row.id);
          <button
            type="button"
            class="kkh-relation-summary"
            [class.kkh-relation-summary--empty]="count === 0"
            [disabled]="!canEdit()"
            (click)="canEdit() && openAssignDialog(row.id)"
            [attr.aria-label]="count === 0 ? 'Assign roles' : 'Manage ' + count + ' roles'"
            [title]="count === 0 ? 'Assign roles' : count + ' roles assigned — click to manage'"
          >
            <span class="kkh-relation-summary__count">
              <span class="kkh-relation-summary__label">
                {{ count === 0 ? 'No roles' : count + (count === 1 ? ' role' : ' roles') }}
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

        <ng-template kkhCell="is_locked_out" let-row>
          <button
            type="button"
            class="kkh-relation-summary"
            [class.kkh-relation-summary--empty]="!row.is_locked_out"
            [disabled]="!canEdit() || isProtectedUser(row)"
            (click)="canEdit() && !isProtectedUser(row) && usersStore.toggleLockout(row.id)"
            [attr.aria-label]="row.is_locked_out ? 'Unlock account' : 'Lock account'"
            [title]="isProtectedUser(row) ? 'System administrator cannot be locked' : (row.is_locked_out ? 'Locked out — click to unlock' : 'Active — click to lock')"
          >
            <span class="kkh-relation-summary__count">
              <span class="kkh-relation-summary__label">
                {{ row.is_locked_out ? 'Locked Out' : 'Active' }}
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

        <ng-template kkhCell="two_factor_required" let-row>
          <div class="flex flex-col gap-1.5 min-w-[9rem]">
            <button
              type="button"
              class="kkh-relation-summary"
              [class.kkh-relation-summary--empty]="!row.two_factor_required"
              [disabled]="!canEdit()"
              (click)="canEdit() && usersStore.toggleMfaRequired(row.id)"
              [attr.aria-label]="row.two_factor_required ? 'Clear MFA requirement' : 'Require MFA'"
              [title]="row.two_factor_required ? 'MFA required — click to clear policy' : 'Not required — click to require MFA'"
            >
              <span class="kkh-relation-summary__count">
                <span class="kkh-relation-summary__label">
                  {{ row.two_factor_required ? 'Required' : 'Optional' }}
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
            <span
              class="kkh-chip text-[10px] w-fit"
              [class.kkh-chip-ok]="row.two_factor_enabled"
              [class.kkh-chip-muted]="!row.two_factor_enabled"
              [title]="row.two_factor_enabled ? 'User has enrolled an authenticator' : 'User has not enrolled MFA'"
            >
              {{ row.two_factor_enabled ? 'Enrolled' : 'Not enrolled' }}
            </span>
            @if (canEdit() && row.two_factor_enabled) {
              <button
                type="button"
                class="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--kkh-danger)] hover:underline cursor-pointer"
                (click)="usersStore.forceDisableMfa(row.id)"
                title="Wipe authenticator and recovery codes"
              >
                Force disable
              </button>
            }
          </div>
        </ng-template>

        <ng-template kkhCell="created_at" let-row>
          <span class="text-[var(--kkh-muted)]">{{ row.created_at | date:'yyyy-MM-dd HH:mm' }}</span>
        </ng-template>

        <ng-template kkhCell="actions" let-row>
          <div class="flex items-center justify-end gap-3">
            @if (canEdit()) {
              <button
                type="button"
                (click)="openCreateModal(row)"
                class="text-[var(--kkh-accent)] hover:opacity-80 transition-opacity cursor-pointer"
                title="Edit User"
              >
                <lucide-icon name="edit" class="h-4.5 w-4.5" [strokeWidth]="2"></lucide-icon>
              </button>
            }
            @if (canDelete() && row.id !== authStore.user()?.id && !isProtectedUser(row)) {
              <button
                type="button"
                (click)="openDeleteDialog(row)"
                class="text-[var(--kkh-danger)] hover:opacity-80 transition-opacity cursor-pointer"
                title="Delete User"
              >
                <lucide-icon name="trash-2" class="h-4.5 w-4.5" [strokeWidth]="2"></lucide-icon>
              </button>
            }
          </div>
        </ng-template>
      </kkh-data-table>
    </div>

    <kkh-transfer
      [open]="isAssignDialogOpen()"
      [title]="assignDialogTitle()"
      [subtitle]="'Choose the roles to assign to ' + activeUser()?.display_name"
      [allItems]="assignDialogOptions()"
      [assignedItemIds]="assignedRoleIds()"
      (assigned)="onRolesAssigned($event)"
      (closed)="closeAssignDialog()"
    />

    <kkh-dialog
      [open]="isCreateOpen()"
      [title]="editingUserId() ? 'Edit User' : 'Create New User'"
      [wide]="true"
      [showDefaultActions]="false"
      (closed)="onModalClose()"
    >
      <form id="user-form" [formGroup]="userForm" (ngSubmit)="onCreateSubmit()" class="kkh-dialog__form">
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <kkh-input
            label="First Name"
            formControlName="first_name"
            placeholder="John"
            [error]="userForm.get('first_name')?.hasError('required') && userForm.get('first_name')?.touched ? 'First name is required' : null"
          />

          <kkh-input
            label="Last Name"
            formControlName="last_name"
            placeholder="Doe"
            [error]="userForm.get('last_name')?.hasError('required') && userForm.get('last_name')?.touched ? 'Last name is required' : null"
          />
        </div>

        <kkh-input
          label="Display Name"
          formControlName="display_name"
          placeholder="John Doe"
          [error]="userForm.get('display_name')?.hasError('required') && userForm.get('display_name')?.touched ? 'Display name is required' : null"
        />

        <kkh-input
          label="Email address"
          type="email"
          formControlName="email"
          placeholder="john.doe@example.com"
          [error]="userForm.get('email')?.hasError('required') && userForm.get('email')?.touched ? 'Email is required' : userForm.get('email')?.hasError('email') && userForm.get('email')?.touched ? 'Please enter a valid email address' : null"
        />

        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <kkh-input
            [label]="editingUserId() ? 'New Password (Optional)' : 'Password'"
            type="password"
            formControlName="password"
            [error]="
              userForm.get('password')?.touched && userForm.get('password')?.hasError('required')
                ? 'Password is required'
                : userForm.get('password')?.touched && userForm.get('password')?.hasError('minlength')
                  ? 'Password must be at least 8 characters'
                  : userForm.get('password')?.touched && userForm.get('password')?.hasError('pattern')
                    ? 'Use upper case, a number, and a special character'
                    : null
            "
          />

          <kkh-input
            label="Confirm Password"
            type="password"
            formControlName="confirmPassword"
            [error]="userForm.get('confirmPassword')?.hasError('required') && userForm.get('confirmPassword')?.touched ? 'Please confirm password' : userForm.hasError('passwordMismatch') && userForm.get('confirmPassword')?.touched ? 'Passwords do not match' : null"
          />
        </div>

        <div class="kkh-dialog__section">
          <span class="kkh-field-label">Security Configuration</span>

          <div class="flex flex-col gap-3">
            <label class="flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                formControlName="lockout_enabled"
                class="h-4 w-4 rounded-sm border-[var(--kkh-border)] bg-[var(--kkh-panel)] text-[var(--kkh-accent)] cursor-pointer"
              />
              <span class="ml-3 text-sm text-[var(--kkh-text)]">Enable Lockout Safeguards</span>
            </label>

            <label class="flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                formControlName="two_factor_required"
                class="h-4 w-4 rounded-sm border-[var(--kkh-border)] bg-[var(--kkh-panel)] text-[var(--kkh-accent)] cursor-pointer"
              />
              <span class="ml-3 text-sm text-[var(--kkh-text)]">Require Multi-Factor Authentication (MFA)</span>
            </label>

            <label class="flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                formControlName="first_time_login"
                class="h-4 w-4 rounded-sm border-[var(--kkh-border)] bg-[var(--kkh-panel)] text-[var(--kkh-accent)] cursor-pointer"
              />
              <span class="ml-3 text-sm text-[var(--kkh-text)]">Require Password Reset on First Login</span>
            </label>
          </div>
        </div>
      </form>
      <div footer class="contents">
        <kkh-button variant="ghost" type="button" (pressed)="closeCreateModal()">Cancel</kkh-button>
        <kkh-button variant="primary" type="submit" form="user-form" [disabled]="userForm.invalid">
          {{ editingUserId() ? 'Save Changes' : 'Add User' }}
        </kkh-button>
      </div>
    </kkh-dialog>

    <kkh-dialog
      [open]="isDeleteOpen()"
      title="Delete User"
      [subtitle]="deleteTarget() ? 'Permanently remove ' + deleteTarget()!.display_name + ' (' + deleteTarget()!.email + '). This cannot be undone.' : null"
      confirmLabel="Delete"
      confirmVariant="danger"
      [confirmLoading]="isDeleting()"
      (closed)="closeDeleteDialog()"
      (confirmed)="confirmDelete()"
    />
  `
})
export class UsersComponent implements OnInit {
  protected readonly usersStore = inject(UsersStore);
  protected readonly adminStore = inject(AdminStore) as unknown as AdminStoreType;
  protected readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly canView = computed(() => this.authStore.hasPermission('users_view'));
  protected readonly canCreate = computed(() => this.authStore.hasPermission('users_create'));
  protected readonly canEdit = computed(() => this.authStore.hasPermission('users_edit'));
  protected readonly canDelete = computed(() => this.authStore.hasPermission('users_delete'));

  protected readonly isCreateOpen = signal(false);
  protected readonly isDeleteOpen = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly deleteTarget = signal<UsersTable | null>(null);

  protected readonly columns: KkhColumnDef[] = [
    { id: 'display_name', header: 'Display Name', sortable: true },
    { id: 'email', header: 'Email', sortable: true },
    { id: 'first_name', header: 'First Name', sortable: true },
    { id: 'last_name', header: 'Last Name', sortable: true },
    { id: 'roles', header: 'Roles' },
    { id: 'is_locked_out', header: 'Account Status', sortable: true },
    { id: 'two_factor_required', header: 'MFA', sortable: true },
    { id: 'created_at', header: 'Created At', sortable: true },
    { id: 'actions', header: 'Actions', align: 'right' }
  ];

  protected readonly lockoutOptions: SelectOption[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active Only' },
    { value: 'locked', label: 'Locked Out Only' }
  ];

  protected readonly mfaOptions: SelectOption[] = [
    { value: 'all', label: 'All MFA States' },
    { value: 'enabled', label: 'Enrolled Only' },
    { value: 'disabled', label: 'Not Enrolled' }
  ];

  protected readonly activeUserId = signal<string | null>(null);
  protected readonly isAssignDialogOpen = signal(false);
  protected readonly editingUserId = signal<string | null>(null);

  protected readonly activeUser = computed(() => {
    const userId = this.activeUserId();
    if (!userId) return null;
    return this.usersStore.users().find(u => u.id === userId) || null;
  });

  protected readonly assignDialogTitle = computed(() =>
    this.activeUser() ? `Assign Roles for ${this.activeUser()!.display_name}` : 'Assign Roles'
  );

  protected readonly assignDialogOptions = computed(() =>
    this.adminStore.roles().map(r => ({ id: String(r.id), name: r.name, description: r.description }))
  );

  protected readonly assignedRoleIds = computed(() => {
    const userId = this.activeUserId();
    if (!userId) return [];
    return this.adminStore.userRoles()
      .filter(ur => ur.userId === userId)
      .map(ur => String(ur.roleId));
  });

  protected readonly userForm = new FormGroup({
    first_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    last_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    display_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: passwordComplexityValidators }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lockout_enabled: new FormControl(true, { nonNullable: true }),
    two_factor_required: new FormControl(false, { nonNullable: true }),
    first_time_login: new FormControl(true, { nonNullable: true })
  }, { validators: passwordMatchValidator });

  ngOnInit() {
    if (this.canView()) {
      this.usersStore.loadUsers();
    }
    this.adminStore.loadRealData();
  }

  protected onPage(event: { pageIndex: number; pageSize: number }): void {
    this.usersStore.setPage(event.pageIndex, event.pageSize);
  }

  protected onSort(event: { field: string; multi: boolean }): void {
    this.usersStore.toggleSort(event.field as keyof UsersTable, event.multi);
  }

  protected getUserRoleCount(userId: string): number {
    return this.adminStore.getRolesForUser(userId).length;
  }

  protected isProtectedUser(user: UsersTable): boolean {
    return isProtectedAdminEmail(user.email);
  }

  protected openAssignDialog(userId: string): void {
    this.activeUserId.set(userId);
    this.isAssignDialogOpen.set(true);
  }

  protected closeAssignDialog(): void {
    this.isAssignDialogOpen.set(false);
    this.activeUserId.set(null);
  }

  protected async onRolesAssigned(newRoleIds: string[]): Promise<void> {
    const userId = this.activeUserId();
    if (!userId) return;

    const user = this.usersStore.users().find((u) => u.id === userId);
    const currentRoleIds = this.assignedRoleIds();
    const rolesToAdd = newRoleIds.filter(id => !currentRoleIds.includes(id));
    let rolesToRemove = currentRoleIds.filter(id => !newRoleIds.includes(id));

    if (user && isProtectedAdminEmail(user.email)) {
      const sysAdminRoleIds = this.adminStore.roles()
        .filter((r) => isSysAdminRole(r.name))
        .map((r) => String(r.id));
      rolesToRemove = rolesToRemove.filter((id) => !sysAdminRoleIds.includes(id));
    }

    try {
      for (const roleId of rolesToAdd) {
        await this.adminStore.assignRoleToUser(userId, roleId);
      }
      for (const roleId of rolesToRemove) {
        await this.adminStore.removeRoleFromUser(userId, roleId);
      }
    } catch (err) {
      console.error('Error assigning user roles:', err);
    }
  }

  protected openCreateModal(user?: UsersTable): void {
    if (user) {
      this.editingUserId.set(user.id);
      this.userForm.reset({
        first_name: user.first_name,
        last_name: user.last_name,
        display_name: user.display_name,
        email: user.email,
        password: '',
        confirmPassword: '',
        lockout_enabled: user.lockout_enabled || true,
        two_factor_required: user.two_factor_required,
        first_time_login: user.first_time_login || true
      });
      this.userForm.get('password')?.setValidators([
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[\W_]).+$|^$/)
      ]);
      this.userForm.get('confirmPassword')?.clearValidators();
    } else {
      this.editingUserId.set(null);
      this.userForm.reset({
        first_name: '',
        last_name: '',
        display_name: '',
        email: '',
        password: '',
        confirmPassword: '',
        lockout_enabled: true,
        two_factor_required: false,
        first_time_login: true
      });
      this.userForm.get('password')?.setValidators(passwordComplexityValidators);
      this.userForm.get('confirmPassword')?.setValidators([Validators.required]);
    }
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.get('confirmPassword')?.updateValueAndValidity();
    this.isCreateOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.onModalClose();
  }

  protected onModalClose(): void {
    this.userForm.reset();
    this.isCreateOpen.set(false);
  }

  protected openDeleteDialog(user: UsersTable): void {
    this.deleteTarget.set(user);
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
    const ok = await this.usersStore.deleteUser(target.id);
    this.isDeleting.set(false);
    if (ok) {
      this.closeDeleteDialog();
      await this.adminStore.loadRealData();
    }
  }

  protected async onCreateSubmit(): Promise<void> {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formVal = this.userForm.getRawValue();
    const editId = this.editingUserId();
    const newPassword = (formVal.password || '').trim();

    if (editId) {
      const ok = await this.usersStore.editUser(
        editId,
        {
          first_name: formVal.first_name,
          last_name: formVal.last_name,
          display_name: formVal.display_name,
          email: formVal.email,
          lockout_enabled: formVal.lockout_enabled,
          two_factor_required: formVal.two_factor_required,
          first_time_login: formVal.first_time_login
        },
        newPassword || undefined
      );
      if (!ok) {
        return;
      }
    } else {
      const ok = await this.usersStore.addUser({
        firstName: formVal.first_name,
        lastName: formVal.last_name,
        displayName: formVal.display_name,
        email: formVal.email,
        password: formVal.password,
        lockoutEnabled: formVal.lockout_enabled,
        twoFactorRequired: formVal.two_factor_required,
        firstTimeLogin: formVal.first_time_login
      });
      if (!ok) {
        return;
      }
    }

    this.closeCreateModal();
  }
}
