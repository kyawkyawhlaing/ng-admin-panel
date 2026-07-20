import { Component, inject, computed, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore, AuthStoreType } from '../../../core/stores/auth-store';
import { ProfileStore } from './profile-store';
import {
  KkhPageHeaderComponent,
  KkhAlertComponent,
  KkhButtonComponent,
  KkhInputComponent,
  KkhDialogComponent
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
    KkhInputComponent,
    KkhDialogComponent
  ],
  providers: [ProfileStore],
  template: `
    <div class="space-y-8 kkh-page-enter">
      <kkh-page-header
        eyebrow="Operator"
        title="Profile"
        description="Identity, credentials, and console preferences."
      />

      @if (enrollPending()) {
        <kkh-alert tone="warning" title="MFA enrollment required">
          An administrator requires multi-factor authentication on this account. Complete setup on the Security tab before using the rest of the console.
        </kkh-alert>
      }

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
                <button type="button" (click)="setTab('personal')" class="kkh-tab" [class.kkh-tab-active]="activeTab() === 'personal'" [disabled]="enrollPending()">Personal</button>
                <button type="button" (click)="setTab('security')" class="kkh-tab" [class.kkh-tab-active]="activeTab() === 'security'">Security</button>
                <button type="button" (click)="setTab('preferences')" class="kkh-tab" [class.kkh-tab-active]="activeTab() === 'preferences'" [disabled]="enrollPending()">Preferences</button>
              </nav>
            </div>

            <div class="p-6 md:p-8">
              @if (profileStore.isLoading()) {
                <div class="flex justify-center py-10">
                  <div class="h-8 w-8 border border-[var(--kkh-accent)] border-t-transparent animate-spin" style="border-radius: 9999px"></div>
                </div>
              } @else {
                @if (activeTab() === 'personal' && !enrollPending()) {
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
                  <div class="space-y-8">
                    <section class="space-y-4">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-sm font-semibold text-[var(--kkh-text)]">Two-factor authentication</h3>
                        @if (mfaStatus(); as mfa) {
                          <span class="kkh-chip" [class.kkh-chip-ok]="mfa.enabled" [class.kkh-chip-muted]="!mfa.enabled && !mfa.required" [class.kkh-chip-accent]="!mfa.enabled && mfa.required">
                            {{ mfa.enabled ? 'Enrolled' : (mfa.required ? 'Required' : 'Off') }}
                          </span>
                          @if (mfa.enabled && mfa.hasRecoveryCodesLeft) {
                            <span class="kkh-chip kkh-chip-muted">Recovery codes available</span>
                          }
                        }
                      </div>
                      <p class="text-sm text-[var(--kkh-muted)]">
                        Protect your console with a TOTP authenticator app. Recovery codes are shown once when you enroll or regenerate.
                      </p>

                      @if (!mfaStatus()?.enabled) {
                        @if (!profileStore.totpSetup()) {
                          <kkh-button variant="primary" type="button" [loading]="profileStore.isMfaBusy()" (pressed)="onBeginMfaSetup()">
                            Set up authenticator
                          </kkh-button>
                        } @else {
                          <div class="kkh-raised p-5 space-y-5">
                            <p class="text-sm text-[var(--kkh-text)]">
                              Scan this QR code with your authenticator app, or enter the key manually.
                            </p>
                            <div class="flex flex-col sm:flex-row gap-5 items-start">
                              <div class="shrink-0 rounded-sm border border-[var(--kkh-border)] bg-white p-3">
                                <img
                                  [src]="profileStore.totpSetup()!.qrDataUrl"
                                  width="220"
                                  height="220"
                                  alt="Authenticator QR code"
                                  class="block h-[220px] w-[220px]"
                                />
                              </div>
                              <div class="min-w-0 flex-1 space-y-4">
                                <div>
                                  <span class="kkh-label">Manual key</span>
                                  <p class="mt-1 font-mono text-sm tracking-widest break-all text-[var(--kkh-text)]">{{ profileStore.totpSetup()!.sharedKey }}</p>
                                </div>
                                <details class="text-xs text-[var(--kkh-muted)]">
                                  <summary class="cursor-pointer hover:text-[var(--kkh-text)]">Show otpauth URI</summary>
                                  <p class="mt-2 font-mono break-all text-[var(--kkh-accent)]">{{ profileStore.totpSetup()!.authenticatorUri }}</p>
                                </details>
                              </div>
                            </div>
                            <form [formGroup]="totpConfirmForm" (ngSubmit)="onConfirmTotp()" class="flex flex-col sm:flex-row gap-3 items-end max-w-md">
                              <div class="flex-1 w-full">
                                <kkh-input label="Verification code" formControlName="code" autocomplete="one-time-code" placeholder="123456" />
                              </div>
                              <kkh-button variant="primary" type="submit" [loading]="profileStore.isMfaBusy()" [disabled]="totpConfirmForm.invalid">
                                Confirm
                              </kkh-button>
                            </form>
                            <kkh-button variant="ghost" type="button" (pressed)="profileStore.clearTotpSetup()">Cancel setup</kkh-button>
                          </div>
                        }
                      } @else if (!enrollPending()) {
                        <div class="flex flex-wrap gap-3">
                          <kkh-button variant="secondary" type="button" (pressed)="openDisableMfa()">Disable MFA</kkh-button>
                          <kkh-button variant="ghost" type="button" (pressed)="openRegenerateCodes()">Regenerate recovery codes</kkh-button>
                        </div>
                      }
                    </section>

                    @if (!enrollPending()) {
                      <section class="space-y-4 border-t border-[var(--kkh-border)] pt-8">
                        <h3 class="text-sm font-semibold text-[var(--kkh-text)]">Change password</h3>
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
                      </section>
                    }
                  </div>
                }

                @if (activeTab() === 'preferences' && !enrollPending()) {
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

    <kkh-dialog
      [open]="!!profileStore.recoveryCodes()"
      title="Recovery codes"
      subtitle="Copy or download these codes now. They will not be shown again."
      confirmLabel="Done"
      (closed)="closeRecoveryCodes()"
      (confirmed)="closeRecoveryCodes()"
    >
      @if (profileStore.recoveryCodes(); as codes) {
        <div class="space-y-4">
          <kkh-alert tone="warning">Each code works once. Store them offline.</kkh-alert>
          <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-sm text-[var(--kkh-text)]">
            @for (code of codes; track code) {
              <li class="kkh-raised px-3 py-2">{{ code }}</li>
            }
          </ul>
          <div class="flex flex-wrap gap-2">
            <kkh-button variant="secondary" type="button" (pressed)="copyRecoveryCodes()">Copy all</kkh-button>
            <kkh-button variant="ghost" type="button" (pressed)="downloadRecoveryCodes()">Download</kkh-button>
          </div>
        </div>
      }
    </kkh-dialog>

    <kkh-dialog
      [open]="disableMfaOpen()"
      title="Disable MFA"
      subtitle="Confirm with your password and a TOTP or recovery code."
      confirmLabel="Disable"
      confirmVariant="danger"
      [confirmLoading]="profileStore.isMfaBusy()"
      (closed)="disableMfaOpen.set(false)"
      (confirmed)="onDisableMfa()"
    >
      <form [formGroup]="disableMfaForm" class="space-y-4">
        <kkh-input label="Password" type="password" formControlName="password" />
        <kkh-input label="Authenticator or recovery code" formControlName="code" />
      </form>
    </kkh-dialog>

    <kkh-dialog
      [open]="regenerateOpen()"
      title="Regenerate recovery codes"
      subtitle="Previous unused codes will stop working immediately."
      confirmLabel="Regenerate"
      [confirmLoading]="profileStore.isMfaBusy()"
      (closed)="regenerateOpen.set(false)"
      (confirmed)="onRegenerateCodes()"
    >
      <form [formGroup]="regenerateForm" class="space-y-4">
        <kkh-input label="Password" type="password" formControlName="password" />
        <kkh-input label="Authenticator code" formControlName="code" />
      </form>
    </kkh-dialog>
  `
})
export class UserProfileComponent implements OnInit {
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;
  protected readonly profileStore = inject(ProfileStore);
  private readonly fb = inject(FormBuilder);

  protected readonly activeTab = signal<Tab>('personal');
  protected readonly disableMfaOpen = signal(false);
  protected readonly regenerateOpen = signal(false);

  protected readonly enrollPending = computed(() => this.authStore.isMfaEnrollPending());
  protected readonly mfaStatus = computed(() => this.profileStore.mfaStatus());

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
  protected readonly totpConfirmForm: FormGroup;
  protected readonly disableMfaForm: FormGroup;
  protected readonly regenerateForm: FormGroup;

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

    this.totpConfirmForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.disableMfaForm = this.fb.group({
      password: ['', Validators.required],
      code: ['', Validators.required]
    });

    this.regenerateForm = this.fb.group({
      password: ['', Validators.required],
      code: ['', Validators.required]
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

    effect(() => {
      if (this.enrollPending()) {
        this.activeTab.set('security');
      }
    });
  }

  ngOnInit(): void {
    const id = this.userId();
    if (id) {
      this.profileStore.loadProfile(id);
    } else {
      void this.profileStore.loadMfaStatus();
    }
  }

  protected setTab(tab: Tab): void {
    if (this.enrollPending() && tab !== 'security') {
      return;
    }
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

  protected async onBeginMfaSetup(): Promise<void> {
    await this.profileStore.beginTotpSetup();
  }

  protected async onConfirmTotp(): Promise<void> {
    if (this.totpConfirmForm.invalid) {
      this.totpConfirmForm.markAllAsTouched();
      return;
    }
    const ok = await this.profileStore.confirmTotp(this.totpConfirmForm.value.code);
    if (ok) {
      this.totpConfirmForm.reset();
    }
  }

  protected openDisableMfa(): void {
    this.disableMfaForm.reset();
    this.disableMfaOpen.set(true);
  }

  protected openRegenerateCodes(): void {
    this.regenerateForm.reset();
    this.regenerateOpen.set(true);
  }

  protected async onDisableMfa(): Promise<void> {
    if (this.disableMfaForm.invalid) {
      this.disableMfaForm.markAllAsTouched();
      return;
    }
    const { password, code } = this.disableMfaForm.getRawValue();
    const ok = await this.profileStore.disableMfa(password, code);
    if (ok) {
      this.disableMfaOpen.set(false);
    }
  }

  protected async onRegenerateCodes(): Promise<void> {
    if (this.regenerateForm.invalid) {
      this.regenerateForm.markAllAsTouched();
      return;
    }
    const { password, code } = this.regenerateForm.getRawValue();
    const ok = await this.profileStore.regenerateRecoveryCodes(password, code);
    if (ok) {
      this.regenerateOpen.set(false);
    }
  }

  protected closeRecoveryCodes(): void {
    this.profileStore.clearRecoveryCodes();
  }

  protected async copyRecoveryCodes(): Promise<void> {
    const codes = this.profileStore.recoveryCodes();
    if (!codes?.length) {
      return;
    }
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
    } catch {
      // Ignore clipboard failures.
    }
  }

  protected downloadRecoveryCodes(): void {
    const codes = this.profileStore.recoveryCodes();
    if (!codes?.length) {
      return;
    }
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kkh-mfa-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }
}
