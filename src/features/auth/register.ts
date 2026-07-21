import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ThemeStore } from '../../core/stores/theme-store';
import { KkhAlertComponent, KkhButtonComponent, KkhInputComponent } from '../../shared/ui';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (!password || !confirmPassword) {
    return null;
  }
  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    KkhAlertComponent,
    KkhButtonComponent,
    KkhInputComponent
  ],
  template: `
    <div class="relative min-h-screen cyber-grid flex flex-col">
      <div class="absolute top-4 right-4 z-20">
        <button type="button" (click)="themeStore.toggleTheme()"
                class="kkh-btn kkh-btn-ghost !min-h-9 !w-9 !px-0"
                [attr.aria-label]="themeStore.theme() === 'light' ? 'Switch to dark theme' : 'Switch to light theme'">
          @if (themeStore.theme() === 'light') {
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
          } @else {
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m0 13.5V21M4.22 4.22l1.59 1.59m12.38 12.38l1.59 1.59M3 12h2.25m13.5 0H21m-16.78 6.78l1.59-1.59m12.38-12.38l1.59-1.59M12 7.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z" /></svg>
          }
        </button>
      </div>

      <main class="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div class="w-full max-w-[420px]">
          <div class="text-center mb-8">
            <p class="kkh-label text-[var(--kkh-accent)]">Identity Console</p>
            <h1 class="kkh-title mt-3 text-4xl sm:text-5xl text-[var(--kkh-text)] tracking-[0.12em]">KyawHlaing</h1>
            <p class="mt-3 text-sm text-[var(--kkh-muted)]">Create an operator account</p>
          </div>

          <div class="kkh-panel kkh-panel--framed relative overflow-hidden">
            <div class="kkh-rail"></div>
            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-4 px-6 py-7 sm:px-8 sm:py-8">
              @if (errorMessage(); as err) {
                <kkh-alert tone="danger">{{ err }}</kkh-alert>
              }
              @if (successMessage(); as msg) {
                <kkh-alert tone="success">{{ msg }}</kkh-alert>
              }

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <kkh-input label="First name" formControlName="firstName" />
                <kkh-input label="Last name" formControlName="lastName" />
              </div>

              <kkh-input label="Email" type="email" formControlName="email" placeholder="name@company.com" />
              <kkh-input label="Password" type="password" formControlName="password" hint="At least 8 characters" />
              <kkh-input
                label="Confirm password"
                type="password"
                formControlName="confirmPassword"
                [error]="registerForm.hasError('passwordMismatch') && registerForm.controls.confirmPassword.touched ? 'Passwords do not match' : null"
              />

              <div class="pt-1">
                <kkh-button variant="primary" type="submit" [fullWidth]="true" [loading]="isLoading()" [disabled]="isLoading()">
                  {{ isLoading() ? 'Creating…' : 'Create account' }}
                </kkh-button>
              </div>
            </form>
          </div>

          <p class="mt-6 text-center text-sm text-[var(--kkh-muted)]">
            Already registered?
            <a routerLink="/login" class="text-[var(--kkh-accent)] font-medium hover:underline ml-1">Sign in</a>
          </p>
        </div>
      </main>
    </div>
  `
})
export class RegisterComponent {
  protected readonly themeStore = inject(ThemeStore);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly registerForm = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  }, { validators: passwordMatchValidator });

  protected onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { firstName, lastName, email, password } = this.registerForm.getRawValue();

    this.http.post<string>('/users/register', {
      email,
      firstName,
      lastName,
      password
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Account created. Redirecting to login…');
        setTimeout(() => this.router.navigate(['/login']), 900);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || err.error?.title || 'Registration failed.');
      }
    });
  }
}
