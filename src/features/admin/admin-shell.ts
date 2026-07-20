import { Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  LUCIDE_ICONS,
  LucideIconProvider,
  LayoutDashboard,
  Users,
  Shield,
  Key,
  Menu,
  Home,
  Settings,
  Database,
  Layout,
  FileText,
  Component as ComponentIcon
} from 'lucide-angular';
import { AuthStore, AuthStoreType } from '../../core/stores/auth-store';
import { ThemeStore } from '../../core/stores/theme-store';
import { NavMenuService } from '../../core/nav/nav-menu.service';
import { KkhButtonComponent } from '../../shared/ui';

@Component({
  selector: 'app-admin-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    KkhButtonComponent,
    LucideAngularModule
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        LayoutDashboard,
        Users,
        Shield,
        Key,
        Menu,
        Home,
        Settings,
        Database,
        Layout,
        FileText,
        Component: ComponentIcon
      })
    }
  ],
  templateUrl: './admin-shell.html',
  host: {
    class: 'block h-screen w-screen overflow-hidden',
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class AdminShell implements OnInit {
  protected readonly themeStore = inject(ThemeStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;
  private readonly navMenuService = inject(NavMenuService);

  /** Handset + tablet equivalent (~CDK Breakpoints.Handset / TabletPortrait). */
  protected readonly isMobile = signal(false);

  protected readonly menuItems = this.navMenuService.menuItems;
  protected readonly navLoading = this.navMenuService.isLoading;

  ngOnInit(): void {
    const mq = window.matchMedia('(max-width: 959.98px)');
    const sync = () => this.isMobile.set(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    this.destroyRef.onDestroy(() => mq.removeEventListener('change', sync));

    void this.navMenuService.loadNavigation();
  }

  // Sidebar state: collapsed on desktop
  protected readonly isCollapsed = signal(false);

  // Sidebar state: opened on mobile
  protected readonly isMobileOpen = signal(false);

  // Profile dropdown menu state
  protected readonly isProfileMenuOpen = signal(false);

  // Logout dialog state
  protected readonly showLogoutDialog = signal(false);
  protected readonly isLoggingOut = signal(false);

  protected readonly userName = computed(() => this.authStore.displayName());
  protected readonly userEmail = computed(() => this.authStore.displayEmail());
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

  protected async confirmLogout(): Promise<void> {
    this.isLoggingOut.set(true);
    try {
      // Hold the Terminate session loading UI before revoke + redirect.
      await new Promise<void>((resolve) => setTimeout(resolve, 1800));
      await this.authStore.logout();
    } finally {
      this.isLoggingOut.set(false);
      this.showLogoutDialog.set(false);
    }
  }

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
