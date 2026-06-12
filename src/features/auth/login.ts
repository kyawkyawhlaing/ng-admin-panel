import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthStore, AuthStoreType } from '../../core/stores/auth-store';
import { ThemeStore } from '../../core/stores/theme-store';

@Component({
  selector: 'app-login',
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
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 class="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Sign in to your account</h2>
        <p class="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Or
          <a routerLink="/register" class="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors">
            create a new enterprise account
          </a>
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white dark:bg-slate-800 px-8 py-10 shadow-xs border border-slate-200 dark:border-slate-700 sm:rounded-xl">
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
            
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
                <mat-label>Email address</mat-label>
                <input matInput type="email" formControlName="email" placeholder="you@example.com" />
                @if (loginForm.get('email')?.hasError('required') && loginForm.get('email')?.touched) {
                  <mat-error>Email is required</mat-error>
                }
                @if (loginForm.get('email')?.hasError('email') && loginForm.get('email')?.touched) {
                  <mat-error>Please enter a valid email address</mat-error>
                }
              </mat-form-field>
            </div>

            <div>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Password</mat-label>
                <input matInput type="password" formControlName="password" />
                @if (loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched) {
                  <mat-error>Password is required</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" class="h-4 w-4 rounded-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-blue-600 focus:ring-blue-600 dark:focus:ring-offset-slate-900 cursor-pointer" />
                <label for="remember-me" class="ml-3 block text-sm text-slate-900 dark:text-slate-300 select-none cursor-pointer">Remember me</label>
              </div>

              <div class="text-sm font-medium">
                <a class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 cursor-pointer transition-colors">Forgot password?</a>
              </div>
            </div>

            <div>
              <button 
                mat-flat-button 
                type="submit" 
                [disabled]="loginForm.invalid || isLoading()"
                [class.is-loading]="isLoading()"
                class="w-full cursor-pointer disabled:cursor-not-allowed"
              >
                <span class="flex items-center justify-center gap-2">
                  @if (isLoading()) {
                    <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  } @else {
                    <span>Sign in</span>
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
export class LoginComponent {
  protected readonly themeStore = inject(ThemeStore);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  protected onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const email = this.loginForm.controls.email.value;
    const password = this.loginForm.controls.password.value;

    this.http.post<{ token: string; user: any }>('/api/auth/login', { email, password }).subscribe({
      next: (response) => {
        const { token, user } = response;
        const roles = user.roles ? user.roles.map((r: any) => r.name) : [];
        
        this.authStore.setAuth(
          { id: user.id.toString(), email: user.email, name: user.displayName || `${user.firstName} ${user.lastName}` },
          token,
          roles,
          [] // Permissions are not returned yet
        );
        this.isLoading.set(false);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Invalid email or password.');
      }
    });
  }
}
