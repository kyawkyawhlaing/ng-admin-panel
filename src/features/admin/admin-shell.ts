import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { AuthStore, AuthStoreType } from '../../core/stores/auth-store';
import { ThemeStore } from '../../core/stores/theme-store';

@Component({
  selector: 'app-admin-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './admin-shell.html',
  host: {
    class: 'block h-screen w-screen overflow-hidden',
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class AdminShell {
  protected readonly themeStore = inject(ThemeStore);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;
  private readonly router = inject(Router);

  // Monitor screensize for responsive layout (mobile and tablet-portrait)
  protected readonly isMobile = toSignal(
    this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).pipe(
      map(result => result.matches)
    ),
    { initialValue: false }
  );

  // Sidebar state: collapsed on desktop
  protected readonly isCollapsed = signal(false);

  // Sidebar state: opened on mobile
  protected readonly isMobileOpen = signal(false);

  // Profile dropdown menu state
  protected readonly isProfileMenuOpen = signal(false);

  // Logout dialog state
  protected readonly showLogoutDialog = signal(false);
  protected readonly isLoggingOut = signal(false);

  protected readonly userName = computed(() => this.authStore.user()?.name || 'Administrator');
  protected readonly userEmail = computed(() => this.authStore.user()?.email || 'admin@admin.com');
  protected readonly userInitial = computed(() => {
    const name = this.userName();
    return name.slice(0, 2).toUpperCase();
  });

  protected toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation(); // Avoid triggering document click
    this.isProfileMenuOpen.update(open => !open);
  }

  protected onDocumentClick(event: MouseEvent): void {
    this.isProfileMenuOpen.set(false);
  }

  protected triggerLogout(): void {
    this.isProfileMenuOpen.set(false);
    this.showLogoutDialog.set(true);
  }

  protected cancelLogout(): void {
    this.showLogoutDialog.set(false);
  }

  protected confirmLogout(): void {
    this.isLoggingOut.set(true);
    
    // Simulate graceful logout delay
    setTimeout(() => {
      this.authStore.clearAuth();
      this.router.navigate(['/login']);
      this.isLoggingOut.set(false);
      this.showLogoutDialog.set(false);
    }, 800);
  }

  protected readonly menuItems = [
    { title: 'Dashboard', route: '/admin/dashboard', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
    { title: 'Users', route: '/admin/users', icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z' },
    { title: 'Roles', route: '/admin/roles', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751A11.959 11.959 0 0 1 12 2.712Z' },
    { title: 'Permissions', route: '/admin/permissions', icon: 'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-.999.43-1.563A6 6 0 1 1 21.75 8.25Z' },
    { title: 'Menus', route: '/admin/menus', icon: 'M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5' }
  ];

  protected toggleSidebar(): void {
    if (this.isMobile()) {
      this.isMobileOpen.update(v => !v);
    } else {
      this.isCollapsed.update(v => !v);
    }
  }

  protected onNavItemClick(): void {
    if (this.isMobile()) {
      this.isMobileOpen.set(false);
    }
  }
}
