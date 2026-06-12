import { Component, inject, computed, signal, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import { ProfileStore } from './profile-store';

type Tab = 'personal' | 'security' | 'preferences';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [ProfileStore],
  template: `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">My Profile</h1>
          <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Manage your personal information and security settings.</p>
        </div>
      </div>

      <!-- Feedback Messages -->
      @if (profileStore.error(); as err) {
        <div class="rounded-md bg-red-50 dark:bg-red-950/40 p-4 border border-red-200 dark:border-red-900/60 text-sm text-red-800 dark:text-red-400 flex justify-between items-center">
          <span>{{ err }}</span>
          <button (click)="profileStore.clearMessages()" class="text-red-500 hover:text-red-700 cursor-pointer">✕</button>
        </div>
      }
      @if (profileStore.successMessage(); as msg) {
        <div class="rounded-md bg-emerald-50 dark:bg-emerald-950/40 p-4 border border-emerald-200 dark:border-emerald-900/60 text-sm text-emerald-800 dark:text-emerald-400 flex justify-between items-center">
          <span>{{ msg }}</span>
          <button (click)="profileStore.clearMessages()" class="text-emerald-500 hover:text-emerald-700 cursor-pointer">✕</button>
        </div>
      }

      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        <!-- Left Column: Avatar & Basic Info Card -->
        <div class="lg:col-span-1 space-y-6">
          <div class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs relative group">
            <div class="h-32 bg-linear-to-r from-blue-500 to-indigo-600"></div>
            
            <div class="relative px-6 pb-6">
              <div class="relative -mt-16 mb-4 flex justify-center">
                <div class="h-32 w-32 rounded-full border-4 border-white dark:border-slate-800 bg-blue-100 dark:bg-slate-700 shadow-md flex items-center justify-center text-4xl font-bold text-blue-600 dark:text-blue-400 overflow-hidden group-hover:scale-105 transition-transform duration-300 select-none">
                  {{ userInitial() }}
                </div>
              </div>

              <div class="text-center">
                <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ authUserName() }}</h2>
                <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{{ authUserEmail() }}</p>
                
                <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
                  @for (role of userRoles(); track role) {
                    <span class="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                      {{ role }}
                    </span>
                  }
                </div>
              </div>

              <div class="mt-6 border-t border-slate-100 dark:border-slate-700/60 pt-4">
                <div class="flex justify-between text-sm py-2">
                  <span class="text-slate-500 dark:text-slate-400">Account ID</span>
                  <span class="font-mono text-slate-900 dark:text-slate-300 truncate w-32 text-right">{{ userId() }}</span>
                </div>
                <div class="flex justify-between text-sm py-2">
                  <span class="text-slate-500 dark:text-slate-400">Status</span>
                  <span class="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <span class="h-2 w-2 rounded-full bg-emerald-500"></span> Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Settings & Details Tab -->
        <div class="lg:col-span-2 space-y-6">
          <div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
            
            <!-- Tabs -->
            <div class="border-b border-slate-200 dark:border-slate-700">
              <nav class="flex px-6 space-x-6" aria-label="Tabs">
                <button 
                  (click)="setTab('personal')"
                  [class.border-blue-500]="activeTab() === 'personal'"
                  [class.text-blue-600]="activeTab() === 'personal'"
                  [class.dark:text-blue-400]="activeTab() === 'personal'"
                  [class.border-transparent]="activeTab() !== 'personal'"
                  [class.text-slate-500]="activeTab() !== 'personal'"
                  class="border-b-2 py-4 px-1 text-sm font-medium hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Personal Details
                </button>
                <button 
                  (click)="setTab('security')"
                  [class.border-blue-500]="activeTab() === 'security'"
                  [class.text-blue-600]="activeTab() === 'security'"
                  [class.dark:text-blue-400]="activeTab() === 'security'"
                  [class.border-transparent]="activeTab() !== 'security'"
                  [class.text-slate-500]="activeTab() !== 'security'"
                  class="border-b-2 py-4 px-1 text-sm font-medium hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Security
                </button>
                <button 
                  (click)="setTab('preferences')"
                  [class.border-blue-500]="activeTab() === 'preferences'"
                  [class.text-blue-600]="activeTab() === 'preferences'"
                  [class.dark:text-blue-400]="activeTab() === 'preferences'"
                  [class.border-transparent]="activeTab() !== 'preferences'"
                  [class.text-slate-500]="activeTab() !== 'preferences'"
                  class="border-b-2 py-4 px-1 text-sm font-medium hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Preferences
                </button>
              </nav>
            </div>

            <div class="p-6 md:p-8">
              
              @if (profileStore.isLoading()) {
                <div class="flex justify-center py-10">
                  <svg class="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              } @else {

                <!-- Personal Details Form -->
                @if (activeTab() === 'personal') {
                  <form [formGroup]="personalForm" (ngSubmit)="onSavePersonal()" class="space-y-6 animate-in fade-in duration-300">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div class="space-y-1">
                        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">First Name</label>
                        <input type="text" formControlName="first_name" class="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 transition-colors" />
                      </div>
                      <div class="space-y-1">
                        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Last Name</label>
                        <input type="text" formControlName="last_name" class="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 transition-colors" />
                      </div>
                      <div class="space-y-1">
                        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Display Name</label>
                        <input type="text" formControlName="display_name" class="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 transition-colors" />
                      </div>
                      <div class="space-y-1">
                        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email Address</label>
                        <input type="email" formControlName="email" class="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 transition-colors" />
                      </div>
                    </div>

                    <div class="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                      <button 
                        type="submit" 
                        [disabled]="personalForm.invalid || !personalForm.dirty || profileStore.isSaving()"
                        class="inline-flex items-center rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 dark:hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {{ profileStore.isSaving() ? 'Saving...' : 'Save Changes' }}
                      </button>
                    </div>
                  </form>
                }

                <!-- Security Form -->
                @if (activeTab() === 'security') {
                  <form [formGroup]="securityForm" (ngSubmit)="onSaveSecurity()" class="space-y-6 animate-in fade-in duration-300">
                    <div class="max-w-md space-y-6">
                      <div class="space-y-1">
                        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Current Password</label>
                        <input type="password" formControlName="currentPassword" class="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 transition-colors" />
                      </div>
                      <div class="space-y-1">
                        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">New Password</label>
                        <input type="password" formControlName="newPassword" class="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 transition-colors" />
                      </div>
                      <div class="space-y-1">
                        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Confirm New Password</label>
                        <input type="password" formControlName="confirmPassword" class="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 transition-colors" />
                        @if (securityForm.hasError('mismatch')) {
                          <p class="text-xs text-red-500 mt-1">Passwords do not match.</p>
                        }
                      </div>
                    </div>

                    <div class="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                      <button 
                        type="submit" 
                        [disabled]="securityForm.invalid || profileStore.isSaving()"
                        class="inline-flex items-center rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 dark:hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {{ profileStore.isSaving() ? 'Updating...' : 'Update Password' }}
                      </button>
                    </div>
                  </form>
                }

                <!-- Preferences Form -->
                @if (activeTab() === 'preferences') {
                  <form [formGroup]="preferencesForm" (ngSubmit)="onSavePreferences()" class="space-y-6 animate-in fade-in duration-300">
                    <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-5">
                      <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <svg class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Email Notifications
                      </h3>
                      
                      <div class="mt-4 space-y-4">
                        <label class="flex items-start justify-between cursor-pointer group">
                          <div class="space-y-0.5">
                            <span class="block text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors select-none">Security Alerts</span>
                            <span class="block text-xs text-slate-500 dark:text-slate-400 select-none">Get notified when someone logs into your account.</span>
                          </div>
                          <div class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full">
                            <input type="checkbox" formControlName="security_alerts" class="peer sr-only" />
                            <div class="h-5 w-9 rounded-full bg-slate-200 dark:bg-slate-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 transition-colors duration-200"></div>
                            <div class="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200 peer-checked:translate-x-4"></div>
                          </div>
                        </label>
                        
                        <div class="h-px bg-slate-200 dark:bg-slate-700"></div>

                        <label class="flex items-start justify-between cursor-pointer group">
                          <div class="space-y-0.5">
                            <span class="block text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors select-none">System Updates</span>
                            <span class="block text-xs text-slate-500 dark:text-slate-400 select-none">Receive notifications about system maintenance.</span>
                          </div>
                          <div class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full">
                            <input type="checkbox" formControlName="system_updates" class="peer sr-only" />
                            <div class="h-5 w-9 rounded-full bg-slate-200 dark:bg-slate-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 transition-colors duration-200"></div>
                            <div class="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200 peer-checked:translate-x-4"></div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div class="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                      <button 
                        type="submit" 
                        [disabled]="preferencesForm.invalid || !preferencesForm.dirty || profileStore.isSaving()"
                        class="inline-flex items-center rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 dark:hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {{ profileStore.isSaving() ? 'Saving...' : 'Save Preferences' }}
                      </button>
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

  // Basic Display Info straight from AuthStore (for left sidebar)
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

  // Forms
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

    // Hydrate forms when user details are loaded
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
