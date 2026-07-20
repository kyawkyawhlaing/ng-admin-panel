import { Component, inject, computed, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import { ProfileStore } from './profile-store';
import {
  KkhPageHeaderComponent,
  KkhAlertComponent,
  KkhButtonComponent,
  KkhInputComponent
} from '../../../shared/ui';

type Tab = 'personal' | 'security' | 'preferences';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    KkhPageHeaderComponent,
    KkhAlertComponent,
    KkhButtonComponent,
    KkhInputComponent
  ],
  providers: [ProfileStore],
  template: `
    <div class="space-y-8 kkh-page-enter">
      <kkh-page-header
        eyebrow="Operator"
        title="Profile"
        description="Identity, credentials, and console preferences."
      />

      @if (profileStore.error(); as err) {
        <kkh-alert tone="danger" [dismissible]="true" (dismissed)="profileStore.clearMessages()">{{ err }}</kkh-alert>
      }
      @if (profileStore.successMessage(); as msg) {
        <kkh-alert tone="success" [dismissible]="true" (dismissed)="profileStore.clearMessages()">{{ msg }}</kkh-alert>
      }

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="lg:col-span-1">
          <div class="kkh-panel overflow-hidden">
            <div class="border-b border-[var(--kkh-border)] bg-[var(--kkh-raised)] px-6 py-8 flex flex-col items-center">
              <div class="h-20 w-20 border border-[var(--kkh-accent)] bg-[var(--kkh-hover)] flex items-center justify-center font-display text-2xl font-bold text-[var(--kkh-accent)] tracking-wider select-none"
                   style="border-radius: var(--kkh-radius)">
                {{ userInitial() }}
              </div>
              <h2 class="mt-5 text-base font-semibold text-[var(--kkh-text)]">{{ authUserName() }}</h2>
              <p class="mt-1.5 text-sm text-[var(--kkh-muted)]">{{ authUserEmail() }}</p>
              <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
                @for (role of userRoles(); track role) {
                  <span class="kkh-chip kkh-chip-accent">{{ role }}</span>
                } @empty {
                  <span class="kkh-chip kkh-chip-muted">No roles</span>
                }
              </div>
            </div>
            <div class="px-6 py-4 space-y-3">
              <div class="flex justify-between gap-4 text-sm">
                <span class="kkh-label">Account ID</span>
                <span class="font-mono text-xs text-[var(--kkh-text)] truncate max-w-[10rem] text-right">{{ userId() }}</span>
              </div>
              <div class="flex justify-between gap-4 text-sm items-center">
                <span class="kkh-label">Status</span>
                <span class="kkh-chip kkh-chip-ok">Active</span>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-2">
          <div class="kkh-panel">
            <div class="border-b border-[var(--kkh-border)] px-6">
              <nav class="flex gap-6" aria-label="Profile sections">
                <button type="button" (click)="setTab('personal')" class="kkh-tab" [class.kkh-tab-active]="activeTab() === 'personal'">Personal</button>
                <button type="button" (click)="setTab('security')" class="kkh-tab" [class.kkh-tab-active]="activeTab() === 'security'">Security</button>
                <button type="button" (click)="setTab('preferences')" class="kkh-tab" [class.kkh-tab-active]="activeTab() === 'preferences'">Preferences</button>
              </nav>
            </div>

            <div class="p-6 md:p-8">
              @if (profileStore.isLoading()) {
                <div class="flex justify-center py-10">
                  <div class="h-8 w-8 border border-[var(--kkh-accent)] border-t-transparent animate-spin" style="border-radius: 9999px"></div>
                </div>
              } @else {
                @if (activeTab() === 'personal') {
                  <form [formGroup]="personalForm" (ngSubmit)="onSavePersonal()" class="space-y-6">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <kkh-input label="First Name" formControlName="first_name" />
                      <kkh-input label="Last Name" formControlName="last_name" />
                      <kkh-input label="Display Name" formControlName="display_name" />
                      <kkh-input label="Email" type="email" formControlName="email" />
                    </div>
                    <div class="flex justify-end pt-4 border-t border-[var(--kkh-border)]">
                      <kkh-button
                        variant="primary"
                        type="submit"
                        [disabled]="personalForm.invalid || !personalForm.dirty || profileStore.isSaving()"
                        [loading]="profileStore.isSaving()"
                      >Save Changes</kkh-button>
                    </div>
                  </form>
                }

                @if (activeTab() === 'security') {
                  <form [formGroup]="securityForm" (ngSubmit)="onSaveSecurity()" class="space-y-6">
                    <div class="max-w-md space-y-5">
                      <kkh-input label="Current Password" type="password" formControlName="currentPassword" />
                      <kkh-input label="New Password" type="password" formControlName="newPassword" />
                      <kkh-input
                        label="Confirm New Password"
                        type="password"
                        formControlName="confirmPassword"
                        [error]="securityForm.hasError('mismatch') ? 'Passwords do not match.' : null"
                      />
                    </div>
                    <div class="flex justify-end pt-4 border-t border-[var(--kkh-border)]">
                      <kkh-button
                        variant="primary"
                        type="submit"
                        [disabled]="securityForm.invalid || profileStore.isSaving()"
                        [loading]="profileStore.isSaving()"
                      >Update Password</kkh-button>
                    </div>
                  </form>
                }

                @if (activeTab() === 'preferences') {
                  <form [formGroup]="preferencesForm" (ngSubmit)="onSavePreferences()" class="space-y-6">
                    <div class="kkh-raised p-5 space-y-4">
                      <h3 class="text-sm font-semibold text-[var(--kkh-text)]">Email Notifications</h3>
                      <label class="flex items-start justify-between gap-4 cursor-pointer">
                        <div>
                          <span class="block text-sm text-[var(--kkh-text)]">Security Alerts</span>
                          <span class="block text-xs text-[var(--kkh-muted)] mt-0.5">Notify on new console sign-ins.</span>
                        </div>
                        <input type="checkbox" formControlName="security_alerts" class="mt-1 h-4 w-4 cursor-pointer accent-[var(--kkh-accent)]" />
                      </label>
                      <div class="h-px bg-[var(--kkh-border)]"></div>
                      <label class="flex items-start justify-between gap-4 cursor-pointer">
                        <div>
                          <span class="block text-sm text-[var(--kkh-text)]">System Updates</span>
                          <span class="block text-xs text-[var(--kkh-muted)] mt-0.5">Maintenance and module notices.</span>
                        </div>
                        <input type="checkbox" formControlName="system_updates" class="mt-1 h-4 w-4 cursor-pointer accent-[var(--kkh-accent)]" />
                      </label>
                    </div>
                    <div class="flex justify-end pt-4 border-t border-[var(--kkh-border)]">
                      <kkh-button
                        variant="primary"
                        type="submit"
                        [disabled]="preferencesForm.invalid || !preferencesForm.dirty || profileStore.isSaving()"
                        [loading]="profileStore.isSaving()"
                      >Save Preferences</kkh-button>
                    </div>
                  </form>
                }
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UserProfileComponent implements OnInit {
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;
  protected readonly profileStore = inject(ProfileStore);
  private readonly fb = inject(FormBuilder);

  protected readonly activeTab = signal<Tab>('personal');

  protected readonly authUserName = computed(() => this.authStore.user()?.name || 'Administrator');
  protected readonly authUserEmail = computed(() => this.authStore.user()?.email || 'admin@admin.com');
  protected readonly userId = computed(() => this.authStore.user()?.id || '');
  protected readonly userRoles = computed(() => this.authStore.roles() || []);

  protected readonly userInitial = computed(() => {
    const parts = this.authUserName().split(' ');
    const first = parts[0] ? parts[0].charAt(0).toUpperCase() : '';
    const last = parts.length > 1 ? parts[1].charAt(0).toUpperCase() : '';
    return first + last;
  });

  protected readonly personalForm: FormGroup;
  protected readonly securityForm: FormGroup;
  protected readonly preferencesForm: FormGroup;

  constructor() {
    this.personalForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      display_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    this.securityForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.preferencesForm = this.fb.group({
      security_alerts: [true],
      system_updates: [true]
    });

    effect(() => {
      const details = this.profileStore.userDetails();
      if (details) {
        this.personalForm.patchValue({
          first_name: details.first_name,
          last_name: details.last_name,
          display_name: details.display_name,
          email: details.email
        });

        if (details.preferences) {
          this.preferencesForm.patchValue({
            security_alerts: details.preferences.security_alerts,
            system_updates: details.preferences.system_updates
          });
        }
      }
    });
  }

  ngOnInit(): void {
    const id = this.userId();
    if (id) {
      this.profileStore.loadProfile(id);
    }
  }

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.profileStore.clearMessages();
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  protected onSavePersonal(): void {
    if (this.personalForm.valid) {
      this.profileStore.updatePersonalDetails(this.userId(), this.personalForm.value).then(() => {
        this.personalForm.markAsPristine();
      });
    }
  }

  protected onSaveSecurity(): void {
    if (this.securityForm.valid) {
      this.profileStore.updatePassword(this.userId(), this.securityForm.value).then(() => {
        this.securityForm.reset();
      });
    }
  }

  protected onSavePreferences(): void {
    if (this.preferencesForm.valid) {
      this.profileStore.updatePreferences(this.userId(), this.preferencesForm.value).then(() => {
        this.preferencesForm.markAsPristine();
      });
    }
  }
}
