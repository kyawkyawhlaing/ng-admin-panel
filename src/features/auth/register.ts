import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthStore, AuthStoreType } from '../../core/stores/auth-store';
import { ThemeStore } from '../../core/stores/theme-store';

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
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <div class="relative flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      
      <!-- Floating Theme Switcher Toggle -->
      <div class="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button (click)="themeStore.toggleTheme()" 
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors cursor-pointer"
                [attr.aria-label]="themeStore.theme() === 'light' ? 'Switch to dark theme' : 'Switch to light theme'">
          @if (themeStore.theme() === 'light') {
            <!-- Moon Icon for dark mode -->
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          } @else {
            <!-- Sun Icon for light mode -->
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m0 13.5V21M4.22 4.22l1.59 1.59m12.38 12.38l1.59 1.59M3 12h2.25m13.5 0H21m-16.78 6.78l1.59-1.59m12.38-12.38l1.59-1.59M12 7.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z" />
            </svg>
          }
        </button>
      </div>

      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <!-- Minimalist and elegant logo/title -->
        <div class="mx-auto h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs">
          <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 class="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Create your enterprise account</h2>
        <p class="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?
          <a routerLink="/login" class="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors">
            Sign in instead
          </a>
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white dark:bg-slate-800 px-8 py-10 shadow-xs border border-slate-200 dark:border-slate-700 sm:rounded-xl">
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-6">
            
            @if (errorMessage()) {
              <div class="rounded-md bg-red-50 dark:bg-red-950/40 p-4 border border-red-200 dark:border-red-900/60">
                <div class="flex">
                  <div class="shrink-0">
                    <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-red-800 dark:text-red-400">{{ errorMessage() }}</p>
                  </div>
                </div>
              </div>
            }

            <div>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Full Name</mat-label>
                <input matInput type="text" formControlName="name" placeholder="John Doe" />
                @if (registerForm.get('name')?.hasError('required') && registerForm.get('name')?.touched) {
                  <mat-error>Name is required</mat-error>
                }
              </mat-form-field>
            </div>

            <div>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Email address</mat-label>
                <input matInput type="email" formControlName="email" placeholder="you@example.com" />
                @if (registerForm.get('email')?.hasError('required') && registerForm.get('email')?.touched) {
                  <mat-error>Email is required</mat-error>
                }
                @if (registerForm.get('email')?.hasError('email') && registerForm.get('email')?.touched) {
                  <mat-error>Please enter a valid email address</mat-error>
                }
              </mat-form-field>
            </div>

            <div>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Password</mat-label>
                <input matInput type="password" formControlName="password" />
                @if (registerForm.get('password')?.hasError('required') && registerForm.get('password')?.touched) {
                  <mat-error>Password is required</mat-error>
                }
                @if (registerForm.get('password')?.hasError('minlength') && registerForm.get('password')?.touched) {
                  <mat-error>Password must be at least 6 characters</mat-error>
                }
              </mat-form-field>
            </div>

            <div>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Confirm Password</mat-label>
                <input matInput type="password" formControlName="confirmPassword" />
                @if (registerForm.get('confirmPassword')?.hasError('required') && registerForm.get('confirmPassword')?.touched) {
                  <mat-error>Please confirm your password</mat-error>
                }
                @if (registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched && !registerForm.get('confirmPassword')?.hasError('required')) {
                  <mat-error>Passwords do not match</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="flex items-center">
              <input id="terms" name="terms" type="checkbox" formControlName="terms" class="h-4 w-4 rounded-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-blue-600 focus:ring-blue-600 dark:focus:ring-offset-slate-900 cursor-pointer" />
              <label for="terms" class="ml-3 block text-sm text-slate-900 dark:text-slate-300 select-none cursor-pointer">
                I accept the
                <a class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium">Terms of Service</a>
                and
                <a class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium">Privacy Policy</a>
              </label>
            </div>

            <div>
              <button 
                mat-flat-button 
                type="submit" 
                [disabled]="registerForm.invalid || isLoading()"
                [class.is-loading]="isLoading()"
                class="w-full cursor-pointer disabled:cursor-not-allowed"
              >
                <span class="flex items-center justify-center gap-2">
                  @if (isLoading()) {
                    <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating account...</span>
                  } @else {
                    <span>Create Account</span>
                  }
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  protected readonly themeStore = inject(ThemeStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly registerForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)]
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    terms: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue]
    })
  }, { validators: passwordMatchValidator });

  protected onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Mock API call
    setTimeout(() => {
      const name = this.registerForm.controls.name.value;
      const email = this.registerForm.controls.email.value;

      // Mock successful registration and login
      this.authStore.setAuth(
        { id: '2', email, name },
        'mock-jwt-token-register-123456',
        ['admin'],
        ['read:users', 'write:users', 'read:roles', 'read:permissions']
      );
      this.isLoading.set(false);
      this.router.navigate(['/admin/dashboard']);
    }, 1200);
  }
}
