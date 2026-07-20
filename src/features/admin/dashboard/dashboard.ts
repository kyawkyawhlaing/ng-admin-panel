import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { KkhPageHeaderComponent } from '../../../shared/ui';

interface ListMeta {
  metadata: { totalCount: number };
  items: unknown[];
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, DatePipe, KkhPageHeaderComponent],
  template: `
    <div class="space-y-8 kkh-page-enter">
      <kkh-page-header
        eyebrow="Overview"
        title="Dashboard"
        description="Live IAM console metrics from KKH modules."
      />

      <div class="kkh-raised px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div class="flex items-center gap-2">
          <span class="kkh-label">Link</span>
          <span class="kkh-chip" [class.kkh-chip-ok]="linkStatus() === 'online'" [class.kkh-chip-danger]="linkStatus() === 'degraded'" [class.kkh-chip-muted]="linkStatus() === 'checking'">
            {{ linkStatus() }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="kkh-label">Last sync</span>
          <span class="font-mono text-xs text-[var(--kkh-text)]">
            @if (lastSync()) {
              {{ lastSync() | date:'yyyy-MM-dd HH:mm:ss' }}
            } @else {
              —
            }
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="kkh-label">Latency</span>
          <span class="font-mono text-xs text-[var(--kkh-accent)]">
            @if (latencyMs() !== null) {
              {{ latencyMs() }} ms
            } @else {
              —
            }
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (stat of stats(); track stat.name) {
          <a [routerLink]="stat.route" class="kkh-panel relative overflow-hidden px-5 pt-5 pb-6 block hover:border-[var(--kkh-accent)] transition-colors group">
            <div class="absolute left-0 top-0 h-full w-0.5 bg-[var(--kkh-accent)] opacity-60 group-hover:opacity-100 transition-opacity"></div>
            <p class="kkh-label">{{ stat.name }}</p>
            <p class="mt-3 font-display text-3xl text-[var(--kkh-text)] tracking-wide">
              @if (loading()) {
                <span class="text-[var(--kkh-muted)]">—</span>
              } @else {
                {{ stat.value }}
              }
            </p>
            <p class="mt-2 text-xs text-[var(--kkh-muted)]">{{ stat.hint }}</p>
          </a>
        }
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly loading = signal(true);
  protected readonly lastSync = signal<Date | null>(null);
  protected readonly latencyMs = signal<number | null>(null);
  protected readonly linkStatus = signal<'checking' | 'online' | 'degraded'>('checking');
  protected readonly stats = signal([
    { name: 'Users', value: '0', hint: 'Identity module', route: '/admin/users' },
    { name: 'Roles', value: '0', hint: 'RBAC roles', route: '/admin/roles' },
    { name: 'Permissions', value: '0', hint: 'Policy grants', route: '/admin/permissions' },
    { name: 'Navigation', value: '0', hint: 'Nav resources', route: '/admin/navigation' }
  ]);

  async ngOnInit(): Promise<void> {
    const emptyPayload = { pageNumber: 1, pageSize: 1 };
    const started = performance.now();
    try {
      const [users, roles, permissions, navigation] = await Promise.all([
        lastValueFrom(this.http.post<ListMeta>('/users/list', emptyPayload)),
        lastValueFrom(this.http.post<ListMeta>('/roles/list', emptyPayload)),
        lastValueFrom(this.http.post<ListMeta>('/permissions/list', emptyPayload)),
        lastValueFrom(this.http.post<ListMeta>('/navigation/list', emptyPayload))
      ]);

      this.stats.set([
        { name: 'Users', value: String(users.metadata.totalCount), hint: 'Identity module', route: '/admin/users' },
        { name: 'Roles', value: String(roles.metadata.totalCount), hint: 'RBAC roles', route: '/admin/roles' },
        { name: 'Permissions', value: String(permissions.metadata.totalCount), hint: 'Policy grants', route: '/admin/permissions' },
        { name: 'Navigation', value: String(navigation.metadata.totalCount), hint: 'Nav resources', route: '/admin/navigation' }
      ]);
      this.linkStatus.set('online');
      this.latencyMs.set(Math.round(performance.now() - started));
      this.lastSync.set(new Date());
    } catch {
      this.linkStatus.set('degraded');
      this.latencyMs.set(Math.round(performance.now() - started));
      this.lastSync.set(new Date());
    } finally {
      this.loading.set(false);
    }
  }
}
