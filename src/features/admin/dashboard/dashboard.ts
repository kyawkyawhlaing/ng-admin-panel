import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Welcome to your enterprise administration panel.</p>
      </div>

      <!-- Overview Cards -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        @for (stat of stats; track stat.name) {
          <div class="relative overflow-hidden rounded-lg bg-white dark:bg-slate-800 px-4 pt-5 pb-6 border border-slate-200 dark:border-slate-700 sm:px-6 transition-all hover:border-slate-300 dark:hover:border-slate-600">
            <dt>
              <div class="absolute rounded-md bg-blue-50 dark:bg-blue-950/50 p-3 text-blue-600 dark:text-blue-400">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="stat.icon" />
                </svg>
              </div>
              <p class="ml-16 truncate text-sm font-medium text-slate-500 dark:text-slate-400">{{ stat.name }}</p>
            </dt>
            <dd class="ml-16 flex items-baseline">
              <p class="text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ stat.value }}</p>
              <span class="ml-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">{{ stat.change }}</span>
            </dd>
          </div>
        }
      </div>
    </div>
  `
})
export class DashboardComponent {
  protected readonly stats = [
    { name: 'Total Users', value: '12,480', change: '+12%', icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0 1 10.089 20.5c-2.057 0-3.978-.549-5.636-1.512V19.13c0-2.44 1.877-4.49 4.309-4.81M15 9.128a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.128a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z' },
    { name: 'Active Roles', value: '8', change: '0%', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751A11.959 11.959 0 0 1 12 2.712Z' },
    { name: 'Permissions Configured', value: '142', change: '+8 new', icon: 'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-.999.43-1.563A6 6 0 1 1 21.75 8.25Z' },
    { name: 'Menu Items', value: '24', change: '+1', icon: 'M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5' }
  ];
}
