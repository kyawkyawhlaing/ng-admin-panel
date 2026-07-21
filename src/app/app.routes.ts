import { Routes } from '@angular/router';
import {
  authGuard,
  redirectIfLoggedInGuard,
  permissionGuard,
  mfaEnrollGateGuard
} from '../core/guards/auth.guard';

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
        canActivate: [mfaEnrollGateGuard],
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
        path: 'navigation',
        canActivate: [permissionGuard],
        data: { permissions: ['navigation_access'] },
        loadComponent: () => import('../features/admin/navigation/navigation').then(m => m.NavigationComponent)
      },
      {
        path: 'resources',
        canActivate: [permissionGuard],
        data: { permissions: ['resources_access'] },
        loadComponent: () => import('../features/admin/resources/resources').then(m => m.ResourcesComponent)
      },
      {
        path: 'sms-authentication',
        canActivate: [permissionGuard],
        data: { permissions: ['sms_authentication_access'] },
        loadComponent: () =>
          import('../features/admin/sms-authentication/sms-authentication').then(m => m.SmsAuthenticationComponent)
      },
      {
        path: 'email-authentication',
        canActivate: [permissionGuard],
        data: { permissions: ['email_authentication_access'] },
        loadComponent: () =>
          import('../features/admin/email-authentication/email-authentication').then(m => m.EmailAuthenticationComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('../features/admin/profile/profile').then(m => m.UserProfileComponent)
      },
      {
        path: 'settings',
        canActivate: [mfaEnrollGateGuard],
        loadComponent: () => import('../features/admin/settings/settings').then(m => m.SettingsComponent)
      }
    ]
  }
];
