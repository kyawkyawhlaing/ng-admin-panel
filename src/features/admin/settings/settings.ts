import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import { UsersTable } from '../../../types/database';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      
      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>
          <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Manage your advanced security and account preferences.</p>
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-10">
          <svg class="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      } @else {
        
        <!-- Security Settings Section -->
        <div class="space-y-6">
          <div>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Two-Factor Authentication (2FA)</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">Add an extra layer of security to your account. Once enabled, you'll be prompted to enter a code from your authenticator app.</p>
          </div>

          <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs overflow-hidden">
            <div class="p-6">
              
              <!-- State 1: MFA is already enabled -->
              @if (isMfaEnabled()) {
                <div class="flex items-start gap-4">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <svg class="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Authenticator App configured</h3>
                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Two-factor authentication is currently active on your account.</p>
                  </div>
                  <button 
                    (click)="disableMfa()"
                    [disabled]="isSaving()"
                    class="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {{ isSaving() ? 'Disabling...' : 'Disable' }}
                  </button>
                </div>
              } 
              
              <!-- State 2: MFA is disabled, setup is not started -->
              @else if (!isSetupStarted()) {
                <div class="flex items-start gap-4">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700/50">
                    <svg class="h-6 w-6 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Authenticator App</h3>
                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Use an app like Google Authenticator or Authy to generate verification codes.</p>
                  </div>
                  <button 
                    (click)="startSetup()"
                    class="rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 dark:hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
                  >
                    Enable
                  </button>
                </div>
              }

              <!-- State 3: MFA Setup Flow -->
              @else {
                <div class="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Configure Authenticator App</h3>
                    <button (click)="cancelSetup()" class="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer">Cancel</button>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <div class="space-y-4">
                      <p class="text-sm text-slate-600 dark:text-slate-300">
                        <strong class="font-semibold text-slate-900 dark:text-slate-100">Step 1:</strong> Scan this QR code with your authenticator app.
                      </p>
                      
                      <div class="flex justify-center p-4 bg-white border border-slate-200 rounded-xl max-w-fit mx-auto md:mx-0">
                        <!-- Mock QR Code Placeholder -->
                        <div class="h-40 w-40 bg-slate-100 relative grid grid-cols-5 grid-rows-5 gap-1 p-2">
                          <div class="bg-black row-span-2 col-span-2"></div>
                          <div class="bg-black col-start-4"></div>
                          <div class="bg-black col-start-5"></div>
                          <div class="bg-black col-start-4 row-start-2"></div>
                          <div class="bg-black col-start-3 row-start-3"></div>
                          <div class="bg-black col-start-5 row-start-3"></div>
                          <div class="bg-black row-start-4 col-span-2 row-span-2"></div>
                          <div class="bg-black col-start-4 row-start-5 col-span-2"></div>
                          <!-- Overlays to make it look like a QR code structure -->
                          <div class="absolute inset-0 border-[12px] border-white m-3 pointer-events-none"></div>
                          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span class="text-[10px] font-bold text-slate-400 bg-white px-1">MOCK</span>
                          </div>
                        </div>
                      </div>

                      <div class="pt-2">
                        <p class="text-xs text-slate-500 dark:text-slate-400">Can't scan the code? Enter this secret key manually:</p>
                        <code class="mt-2 block w-max rounded bg-slate-100 dark:bg-slate-900 px-2 py-1 text-xs font-mono text-slate-800 dark:text-slate-200">
                          JBSWY3DPEHPK3PXP
                        </code>
                      </div>
                    </div>

                    <div class="space-y-4">
                      <p class="text-sm text-slate-600 dark:text-slate-300">
                        <strong class="font-semibold text-slate-900 dark:text-slate-100">Step 2:</strong> Enter the 6-digit code generated by your app.
                      </p>

                      <div class="space-y-3">
                        <input 
                          type="text" 
                          [value]="verificationCode()"
                          (input)="onCodeInput($event)"
                          maxlength="6"
                          placeholder="000000"
                          class="block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 py-3 px-4 text-center text-2xl tracking-[0.5em] font-mono text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:border-blue-400 transition-colors placeholder:tracking-normal"
                        />
                        @if (errorMsg()) {
                          <p class="text-sm text-red-500">{{ errorMsg() }}</p>
                        }
                      </div>

                      <button 
                        (click)="verifyAndEnable()"
                        [disabled]="verificationCode().length !== 6 || isSaving()"
                        class="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 dark:hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        @if (isSaving()) {
                          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Verifying...
                        } @else {
                          Verify and Enable
                        }
                      </button>
                    </div>

                  </div>
                </div>
              }

            </div>
          </div>
        </div>

      }
    </div>
  `
})
export class SettingsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isMfaEnabled = signal(false);
  protected readonly isSetupStarted = signal(false);
  
  protected readonly verificationCode = signal('');
  protected readonly errorMsg = signal('');

  async ngOnInit() {
    await this.fetchUserSettings();
  }

  private async fetchUserSettings() {
    this.isLoading.set(true);
    const userId = this.authStore.user()?.id;
    if (!userId) return;

    try {
      const users = await lastValueFrom(this.http.get<UsersTable[]>('/api/users'));
      const currentUser = users.find(u => u.id === userId);
      if (currentUser) {
        this.isMfaEnabled.set(!!currentUser.two_factor_enabled);
      }
    } catch (err) {
      console.error('Failed to load user settings', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected startSetup() {
    this.isSetupStarted.set(true);
    this.verificationCode.set('');
    this.errorMsg.set('');
  }

  protected cancelSetup() {
    this.isSetupStarted.set(false);
  }

  protected onCodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // only allow digits
    input.value = input.value.replace(/\D/g, '');
    this.verificationCode.set(input.value);
    this.errorMsg.set('');
  }

  protected async verifyAndEnable() {
    // Mock Verification
    if (this.verificationCode().length !== 6) return;
    
    // Accept any code except '000000' for demo purposes
    if (this.verificationCode() === '000000') {
      this.errorMsg.set('Invalid verification code.');
      return;
    }

    this.isSaving.set(true);
    const userId = this.authStore.user()?.id;
    if (!userId) return;

    try {
      await lastValueFrom(this.http.put(`/api/users/${userId}/mfa`, { enabled: true }));
      this.isMfaEnabled.set(true);
      this.isSetupStarted.set(false);
    } catch (err) {
      this.errorMsg.set('Failed to enable MFA. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async disableMfa() {
    this.isSaving.set(true);
    const userId = this.authStore.user()?.id;
    if (!userId) return;

    try {
      await lastValueFrom(this.http.put(`/api/users/${userId}/mfa`, { enabled: false }));
      this.isMfaEnabled.set(false);
    } catch (err) {
      console.error('Failed to disable MFA', err);
    } finally {
      this.isSaving.set(false);
    }
  }
}
