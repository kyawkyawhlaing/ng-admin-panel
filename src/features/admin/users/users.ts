import { Component, inject, signal, computed, ElementRef, viewChild, effect, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { AdminStore, AdminStoreType } from '../admin-store';
import { UsersStore } from './users-store';
import { AssignmentDialogComponent } from '../../../shared/components/assignment-dialog';
import { Role } from '../../../types/rbac';
import { UsersTable } from '../../../types/database';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (!password || !confirmPassword) return null;
  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-admin-users',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    AssignmentDialogComponent
  ],
  providers: [UsersStore],
  template: `
    <div class="space-y-6">
      <!-- Header Section -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">User Directory</h1>
          <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Database records matching the UsersTable model. Manage status, multi-sorting criteria, and role permissions.
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
          Create User
        </button>
      </div>

      <!-- Filters & Toolbar Toolbar -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <!-- Text Search Filter -->
          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Search Users</mat-label>
            <input 
              matInput 
              [value]="usersStore.filterText()" 
              (input)="onSearchInput($event)" 
              placeholder="Search name or email..." 
            />
            @if (usersStore.filterText()) {
              <button 
                matSuffix 
                (click)="usersStore.setFilterText('')" 
                class="mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                type="button"
                aria-label="Clear search"
              >
                ✕
              </button>
            }
          </mat-form-field>

          <!-- Lockout Filter -->
          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Lockout Status</mat-label>
            <mat-select [value]="usersStore.lockoutFilter()" (selectionChange)="usersStore.setLockoutFilter($event.value)">
              <mat-option value="all">All Statuses</mat-option>
              <mat-option value="active">Active Only</mat-option>
              <mat-option value="locked">Locked Out Only</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- 2FA Filter -->
          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>MFA Enabled</mat-label>
            <mat-select [value]="usersStore.twoFactorFilter()" (selectionChange)="usersStore.setTwoFactorFilter($event.value)">
              <mat-option value="all">All MFA States</mat-option>
              <mat-option value="enabled">Enabled Only</mat-option>
              <mat-option value="disabled">Disabled Only</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Multi-Sort Info & Reset -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1 text-xs">
          <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <svg class="h-4.5 w-4.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Tip: Click column headers to sort. <strong>Hold Shift</strong> while clicking to apply a <strong>multiple sort order</strong>.
            </span>
          </div>
          @if (usersStore.sorts().length > 0) {
            <button 
              type="button"
              (click)="usersStore.clearSorts()"
              class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold cursor-pointer"
            >
              Clear active sorts ({{ usersStore.sorts().length }})
            </button>
          }
        </div>
      </div>

      <!-- Users Datatable -->
      <div class="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-xs">
        <table mat-table [dataSource]="usersStore.pagedUsers()" class="w-full !bg-transparent">
          
          <!-- Display Name Column -->
          <ng-container matColumnDef="display_name">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('display_name', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !pl-6 !text-left !text-xs !font-bold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>Display Name</span>
                {{ getSortIndicator('display_name') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let user" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !pl-6 !text-sm !font-semibold !text-slate-900 dark:!text-slate-100">
              {{ user.display_name }}
            </td>
          </ng-container>

          <!-- Email Column -->
          <ng-container matColumnDef="email">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('email', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-bold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>Email</span>
                {{ getSortIndicator('email') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let user" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-500 dark:!text-slate-400">
              {{ user.email }}
            </td>
          </ng-container>

          <!-- First Name Column -->
          <ng-container matColumnDef="first_name">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('first_name', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-bold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>First Name</span>
                {{ getSortIndicator('first_name') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let user" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-600 dark:!text-slate-300">
              {{ user.first_name }}
            </td>
          </ng-container>

          <!-- Last Name Column -->
          <ng-container matColumnDef="last_name">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('last_name', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-bold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>Last Name</span>
                {{ getSortIndicator('last_name') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let user" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-600 dark:!text-slate-300">
              {{ user.last_name }}
            </td>
          </ng-container>

          <!-- Roles Column -->
          <ng-container matColumnDef="roles">
            <th mat-header-cell *matHeaderCellDef class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-bold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400">
              Roles
            </th>
            <td mat-cell *matCellDef="let user" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm">
              <div class="flex flex-wrap gap-1.5">
                @for (role of getUserRoles(user.id); track role.id) {
                  <span class="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-900/40">
                    {{ role.name }}
                  </span>
                } @empty {
                  <span class="text-xs text-slate-400 dark:text-slate-500 italic">No roles</span>
                }
              </div>
            </td>
          </ng-container>

          <!-- Status / Lockout Column -->
          <ng-container matColumnDef="status">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('is_locked_out', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-bold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>Account Status</span>
                {{ getSortIndicator('is_locked_out') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let user" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm">
              @if (user.is_locked_out) {
                <span class="inline-flex items-center rounded-md bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400 ring-1 ring-rose-600/10 dark:ring-rose-900/40 select-none">
                  Locked Out
                </span>
              } @else {
                <span class="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-600/10 dark:ring-emerald-900/40 select-none">
                  Active
                </span>
              }
            </td>
          </ng-container>

          <!-- 2FA Status Column -->
          <ng-container matColumnDef="two_factor_enabled">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('two_factor_enabled', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-bold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>MFA</span>
                {{ getSortIndicator('two_factor_enabled') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let user" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm">
              @if (user.two_factor_enabled) {
                <span class="inline-flex items-center rounded-md bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-400 ring-1 ring-sky-600/10 dark:ring-sky-900/40 select-none">
                  2FA Active
                </span>
              } @else {
                <span class="inline-flex items-center rounded-md bg-slate-50 dark:bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/10 dark:ring-slate-600/40 select-none">
                  Disabled
                </span>
              }
            </td>
          </ng-container>

          <!-- Created At Column -->
          <ng-container matColumnDef="created_at">
            <th 
              mat-header-cell 
              *matHeaderCellDef 
              (click)="onHeaderClick('created_at', $event)"
              class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !text-left !text-xs !font-bold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div class="flex items-center gap-1.5">
                <span>Created At</span>
                {{ getSortIndicator('created_at') }}
              </div>
            </th>
            <td mat-cell *matCellDef="let user" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !text-sm !text-slate-500 dark:!text-slate-400">
              {{ user.created_at | date:'yyyy-MM-dd HH:mm' }}
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="!border-b border-slate-200 dark:!border-slate-700 !py-4.5 !pr-6 !text-right !text-xs !font-bold !uppercase !tracking-wider !text-slate-500 dark:!text-slate-400">
              Actions
            </th>
            <td mat-cell *matCellDef="let user" class="!border-b border-slate-100 dark:!border-slate-700/60 !py-4 !pr-6 !text-right !text-sm !font-semibold">
              <div class="flex items-center justify-end gap-3">
                <!-- Assign Roles Button -->
                <button 
                  type="button" 
                  (click)="openAssignDialog(user.id)"
                  class="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors cursor-pointer"
                  title="Assign Roles"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </button>
                
                <!-- Toggle Lockout Button -->
                <button 
                  type="button" 
                  (click)="usersStore.toggleLockout(user.id)"
                  [class.text-rose-600]="!user.is_locked_out"
                  [class.text-emerald-600]="user.is_locked_out"
                  [class.dark:text-rose-400]="!user.is_locked_out"
                  [class.dark:text-emerald-400]="user.is_locked_out"
                  class="hover:opacity-85 transition-opacity cursor-pointer"
                  [title]="user.is_locked_out ? 'Unlock User' : 'Lock User'"
                >
                  @if (user.is_locked_out) {
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  } @else {
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                </button>

                <!-- Edit User Button -->
                <button 
                  type="button" 
                  (click)="openCreateModal(user)"
                  class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Edit User"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns" class="!bg-slate-50 dark:!bg-slate-900/60"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns" class="hover:!bg-slate-50 dark:hover:!bg-slate-700/50 transition-colors"></tr>
        </table>

        <!-- Empty State -->
        @if (usersStore.pagedUsers().length === 0) {
          <div class="text-center py-10 px-4">
            <svg class="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 class="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">No users found</h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Try adjusting your filters or search terms.</p>
          </div>
        }

        <!-- Paginator -->
        <mat-paginator 
          [length]="usersStore.totalUsersCount()"
          [pageIndex]="usersStore.pageIndex()"
          [pageSize]="usersStore.pageSize()"
          [pageSizeOptions]="[5, 10, 20]"
          (page)="onPageEvent($event)"
          class="!bg-transparent border-t border-slate-100 dark:border-slate-700"
        />
      </div>
    </div>

    <!-- User Assignment Dialog popup -->
    @if (isAssignDialogOpen()) {
      <app-assignment-dialog
        [title]="assignDialogTitle()"
        [subtitle]="'Choose the roles to assign to ' + activeUser()?.display_name"
        [allItems]="assignDialogOptions()"
        [assignedItemIds]="assignedRoleIds()"
        (assigned)="onRolesAssigned($event)"
        (closed)="closeAssignDialog()"
      />
    }

    <!-- User Creation Modal Dialog (Native dialog styled with Tailwind v4) -->
    <dialog #createDialogRef class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xl max-w-lg w-full backdrop:bg-slate-900/40 dark:backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs focus:outline-none" (close)="onModalClose()">
      <div class="space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ editingUserId() ? 'Edit User' : 'Create New User' }}</h3>
          <button type="button" (click)="closeCreateModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold text-lg cursor-pointer">✕</button>
        </div>

        <form [formGroup]="userForm" (ngSubmit)="onCreateSubmit()" class="space-y-4">
          <!-- Grid for Name Fields -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <mat-form-field appearance="outline" class="w-full !m-0">
              <mat-label>First Name</mat-label>
              <input matInput formControlName="first_name" placeholder="John" />
              @if (userForm.get('first_name')?.hasError('required') && userForm.get('first_name')?.touched) {
                <mat-error>First name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full !m-0">
              <mat-label>Last Name</mat-label>
              <input matInput formControlName="last_name" placeholder="Doe" />
              @if (userForm.get('last_name')?.hasError('required') && userForm.get('last_name')?.touched) {
                <mat-error>Last name is required</mat-error>
              }
            </mat-form-field>
          </div>

          <!-- Display Name -->
          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Display Name</mat-label>
            <input matInput formControlName="display_name" placeholder="John Doe" />
            @if (userForm.get('display_name')?.hasError('required') && userForm.get('display_name')?.touched) {
              <mat-error>Display name is required</mat-error>
            }
          </mat-form-field>

          <!-- Email -->
          <mat-form-field appearance="outline" class="w-full !m-0">
            <mat-label>Email address</mat-label>
            <input matInput type="email" formControlName="email" placeholder="john.doe@example.com" />
            @if (userForm.get('email')?.hasError('required') && userForm.get('email')?.touched) {
              <mat-error>Email is required</mat-error>
            }
            @if (userForm.get('email')?.hasError('email') && userForm.get('email')?.touched) {
              <mat-error>Please enter a valid email address</mat-error>
            }
          </mat-form-field>

          <!-- Grid for Passwords -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <mat-form-field appearance="outline" class="w-full !m-0">
              <mat-label>{{ editingUserId() ? 'New Password (Optional)' : 'Password' }}</mat-label>
              <input matInput type="password" formControlName="password" />
              @if (userForm.get('password')?.hasError('required') && userForm.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
              @if (userForm.get('password')?.hasError('minlength') && userForm.get('password')?.touched) {
                <mat-error>Password must be at least 6 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full !m-0">
              <mat-label>Confirm Password</mat-label>
              <input matInput type="password" formControlName="confirmPassword" />
              @if (userForm.get('confirmPassword')?.hasError('required') && userForm.get('confirmPassword')?.touched) {
                <mat-error>Please confirm password</mat-error>
              }
              @if (userForm.hasError('passwordMismatch') && userForm.get('confirmPassword')?.touched && !userForm.get('confirmPassword')?.hasError('required')) {
                <mat-error>Passwords do not match</mat-error>
              }
            </mat-form-field>
          </div>

          <!-- Feature Flags / Switches -->
          <div class="bg-slate-50 dark:bg-slate-900 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-400 select-none">Security Configuration</span>
            
            <div class="flex flex-col gap-3">
              <label class="flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  formControlName="lockout_enabled" 
                  class="h-4 w-4 rounded-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-blue-600 focus:ring-blue-600 dark:focus:ring-offset-slate-800 cursor-pointer" 
                />
                <span class="ml-3 text-sm font-medium text-slate-800 dark:text-slate-200">Enable Lockout Safeguards</span>
              </label>

              <label class="flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  formControlName="two_factor_enabled" 
                  class="h-4 w-4 rounded-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-blue-600 focus:ring-blue-600 dark:focus:ring-offset-slate-800 cursor-pointer" 
                />
                <span class="ml-3 text-sm font-medium text-slate-800 dark:text-slate-200">Force Multi-Factor Authentication (MFA)</span>
              </label>

              <label class="flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  formControlName="first_time_login" 
                  class="h-4 w-4 rounded-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-blue-600 focus:ring-blue-600 dark:focus:ring-offset-slate-800 cursor-pointer" 
                />
                <span class="ml-3 text-sm font-medium text-slate-800 dark:text-slate-200">Require Password Reset on First Login</span>
              </label>
            </div>
          </div>

          <!-- Dialog Form Footer -->
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
              [disabled]="userForm.invalid"
              class="rounded-md bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 dark:hover:bg-blue-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {{ editingUserId() ? 'Save Changes' : 'Add User' }}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  `
})
export class UsersComponent implements OnInit {
  protected readonly usersStore = inject(UsersStore);
  protected readonly adminStore = inject(AdminStore) as unknown as AdminStoreType;

  // Native creation modal reference
  private createDialogRef = viewChild<ElementRef<HTMLDialogElement>>('createDialogRef');

  // MatTable visible columns
  protected readonly displayedColumns = [
    'display_name',
    'email',
    'first_name',
    'last_name',
    'roles',
    'status',
    'two_factor_enabled',
    'created_at',
    'actions'
  ];

  // Role assignment state variables
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
    this.adminStore.roles().map(r => ({ id: r.id, name: r.name, description: r.description }))
  );

  protected readonly assignedRoleIds = computed(() => {
    const userId = this.activeUserId();
    if (!userId) return [];
    return this.adminStore.userRoles()
      .filter(ur => ur.userId === userId)
      .map(ur => ur.roleId);
  });

  // User creation form config
  protected readonly userForm = new FormGroup({
    first_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    last_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    display_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lockout_enabled: new FormControl(true, { nonNullable: true }),
    two_factor_enabled: new FormControl(false, { nonNullable: true }),
    first_time_login: new FormControl(true, { nonNullable: true })
  }, { validators: passwordMatchValidator });

  constructor() {
    // Synchronize auto focus management for creation modal inside effect
    effect(() => {
      const modal = this.createDialogRef()?.nativeElement;
      if (modal) {
        modal.addEventListener('keydown', this.trapModalFocus);
      }
    });
  }

  ngOnInit() {
    this.usersStore.loadUsers();
    this.adminStore.loadRealData();
  }

  // Header click triggers multi-sort or single-sort based on Shift key
  protected onHeaderClick(field: keyof UsersTable, event: MouseEvent): void {
    this.usersStore.toggleSort(field, event.shiftKey);
  }

  // Get sort order indicator for header cells
  protected getSortIndicator(field: keyof UsersTable): string {
    const sorts = this.usersStore.sorts();
    const index = sorts.findIndex(s => s.field === field);
    if (index === -1) return '';

    const arrow = sorts[index].direction === 'asc' ? '▲' : '▼';
    
    // If multi-sorting is active, display the sort priority index
    if (sorts.length > 1) {
      const superscriptMap: Record<number, string> = {
        0: '¹', 1: '²', 2: '³', 3: '⁴', 4: '⁵', 5: '⁶', 6: '⁷', 7: '⁸', 8: '⁹'
      };
      const priority = superscriptMap[index] || `(${index + 1})`;
      return `${arrow}${priority}`;
    }
    
    return arrow;
  }

  // Handle Search input with safe state update
  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.usersStore.setFilterText(input.value);
  }

  // Handle MatPaginator pagination events
  protected onPageEvent(event: PageEvent): void {
    this.usersStore.setPage(event.pageIndex, event.pageSize);
  }

  // Role mapping access queries
  protected getUserRoles(userId: string): Role[] {
    return this.adminStore.getRolesForUser(userId);
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

    const currentRoleIds = this.assignedRoleIds();
    const rolesToAdd = newRoleIds.filter(id => !currentRoleIds.includes(id));
    const rolesToRemove = currentRoleIds.filter(id => !newRoleIds.includes(id));

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

  // Creation modal handlers
  protected openCreateModal(user?: UsersTable): void {
    const modal = this.createDialogRef()?.nativeElement;
    if (modal && !modal.open) {
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
          two_factor_enabled: user.two_factor_enabled,
          first_time_login: user.first_time_login || true
        });
        this.userForm.get('password')?.clearValidators();
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
          two_factor_enabled: false,
          first_time_login: true
        });
        this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
        this.userForm.get('confirmPassword')?.setValidators([Validators.required]);
      }
      this.userForm.get('password')?.updateValueAndValidity();
      this.userForm.get('confirmPassword')?.updateValueAndValidity();
      
      modal.showModal();
      
      // Auto focus first form field
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
    this.userForm.reset();
  }

  protected onCreateSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formVal = this.userForm.getRawValue();
    const editId = this.editingUserId();

    if (editId) {
      this.usersStore.editUser(editId, {
        firstName: formVal.first_name,
        lastName: formVal.last_name,
        displayName: formVal.display_name,
        email: formVal.email,
        password: formVal.password || undefined,
        lockoutEnabled: formVal.lockout_enabled,
        twoFactorEnabled: formVal.two_factor_enabled,
        firstTimeLogin: formVal.first_time_login
      });
    } else {
      this.usersStore.addUser({
        firstName: formVal.first_name,
        lastName: formVal.last_name,
        displayName: formVal.display_name,
        email: formVal.email,
        password: formVal.password,
        lockoutEnabled: formVal.lockout_enabled,
        twoFactorEnabled: formVal.two_factor_enabled,
        firstTimeLogin: formVal.first_time_login
      });
    }

    this.closeCreateModal();
  }

  // Key trap focus implementation inside the modal dialog
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
