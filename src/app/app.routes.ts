import { Routes } from '@angular/router';
import { authGuard, redirectIfLoggedInGuard, permissionGuard } from '../core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'admin',
    pathMatch: 'full'
  },
  {
    path: 'login',
    canActivate: [redirectIfLoggedInGuard],
    loadComponent: () => import('../features/auth/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [redirectIfLoggedInGuard],
    loadComponent: () => import('../features/auth/register').then(m => m.RegisterComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('../features/admin/admin-shell').then(m => m.AdminShell),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('../features/admin/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { permissions: ['users_access'] },
        loadComponent: () => import('../features/admin/users/users').then(m => m.UsersComponent)
      },
      {
        path: 'roles',
        canActivate: [permissionGuard],
        data: { permissions: ['roles_access'] },
        loadComponent: () => import('../features/admin/roles/roles').then(m => m.RolesComponent)
      },
      {
        path: 'permissions',
        canActivate: [permissionGuard],
        data: { permissions: ['permissions_access'] },
        loadComponent: () => import('../features/admin/permissions/permissions').then(m => m.PermissionsComponent)
      },
      {
        path: 'menus',
        canActivate: [permissionGuard],
        data: { permissions: ['menus_access'] },
        loadComponent: () => import('../features/admin/menus/menus').then(m => m.MenusComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('../features/admin/profile/profile').then(m => m.UserProfileComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('../features/admin/settings/settings').then(m => m.SettingsComponent)
      }
    ]
  }
];
