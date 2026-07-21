import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, Signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { withCallState, setLoading, setLoaded, setError, CallState } from '../../core/stores/features/with-call-state';
import { AuthStore, AuthStoreType } from '../../core/stores/auth-store';
import { User, Role, Permission, Menu, UserRoleMapping, RolePermissionMapping } from '../../types/rbac';

export interface AdminState {
  users: User[];
  roles: Role[];
  permissions: Permission[];
  menus: Menu[];
  userRoles: UserRoleMapping[];
  rolePermissions: RolePermissionMapping[];
  /** True after RBAC mappings are loaded or locally mutated — sidebar can trust live mappings. */
  rbacHydrated: boolean;
}

const initialAdminState: AdminState = {
  users: [
    { id: 'u1', name: 'Sarah Connor', email: 'sarah@skynet.com', status: 'Active' },
    { id: 'u2', name: 'John Doe', email: 'john.doe@example.com', status: 'Active' },
    { id: 'u3', name: 'Alice Smith', email: 'alice.smith@example.com', status: 'Active' }
  ],
  roles: [],
  permissions: [
    { id: 'p1', name: 'Read Users', description: 'Can view user management list', code: 'read:users' },
    { id: 'p2', name: 'Write Users', description: 'Can add, edit, or delete users', code: 'write:users' },
    { id: 'p3', name: 'Read Roles', description: 'Can view security roles', code: 'read:roles' },
    { id: 'p4', name: 'Write Roles', description: 'Can edit roles and assign permissions', code: 'write:roles' },
    { id: 'p5', name: 'Read Permissions', description: 'Can view permissions mapping catalog', code: 'read:permissions' },
    { id: 'p6', name: 'Read Navigation', description: 'Can view layout sidebar navigation settings', code: 'read:navigation' }
  ],
  menus: [
    { id: 'm1', title: 'Dashboard', route: '/admin/dashboard', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
    { id: 'm2', title: 'Users', route: '/admin/users', icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z' },
    { id: 'm3', title: 'Roles', route: '/admin/roles', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751A11.959 11.959 0 0 1 12 2.712Z' },
    { id: 'm4', title: 'Permissions', route: '/admin/permissions', icon: 'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-.999.43-1.563A6 6 0 1 1 21.75 8.25Z' },
    { id: 'm5', title: 'Navigation', route: '/admin/navigation', icon: 'M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5' }
  ],
  userRoles: [],
  rolePermissions: [
    // Super Admin permissions (All)
    { roleId: 'r1', permissionId: 'p1' },
    { roleId: 'r1', permissionId: 'p2' },
    { roleId: 'r1', permissionId: 'p3' },
    { roleId: 'r1', permissionId: 'p4' },
    { roleId: 'r1', permissionId: 'p5' },
    { roleId: 'r1', permissionId: 'p6' },
    // User Administrator permissions
    { roleId: 'r2', permissionId: 'p1' },
    { roleId: 'r2', permissionId: 'p2' },
    // Security Manager permissions
    { roleId: 'r3', permissionId: 'p3' },
    { roleId: 'r3', permissionId: 'p4' },
    { roleId: 'r3', permissionId: 'p5' }
  ],
  rbacHydrated: false
};

export const AdminStore = signalStore(
  { providedIn: 'root' },
  withState(initialAdminState),
  withCallState(),
  withMethods((store, http = inject(HttpClient), authStore = inject(AuthStore) as unknown as AuthStoreType) => {
    const fetchAllPages = async (endpoint: string): Promise<any[]> => {
      const pageSize = 50;
      let pageNumber = 1;
      const items: any[] = [];
      while (true) {
        const response = await lastValueFrom(
          http.post<{ items: any[]; metadata?: { totalCount?: number } }>(endpoint, {
            searchTerm: null,
            sorts: [],
            pageNumber,
            pageSize
          })
        );
        items.push(...(response.items ?? []));
        const total = response.metadata?.totalCount ?? items.length;
        if (items.length >= total || (response.items?.length ?? 0) < pageSize) {
          break;
        }
        pageNumber += 1;
      }
      return items;
    };

    return {
      // Backend Synced Loaders
      async loadRealData(): Promise<void> {
        try {
          const canViewRoles = authStore.hasPermission('roles_view');
          const canViewPermissions = authStore.hasPermission('permissions_view');
          const canViewUsers = authStore.hasPermission('users_view');

          const roles = canViewRoles ? await fetchAllPages('/roles/list') : [];
          const permissions = canViewPermissions ? await fetchAllPages('/permissions/list') : [];
          const mappings = canViewUsers
            ? await lastValueFrom(http.get<{ userId: string; roleId: number }[]>('/users/roles-mapping'))
            : [];
          const rolePermMappings = canViewRoles
            ? await lastValueFrom(http.get<{ roleId: number; permissionId: number }[]>('/roles/permissions-mapping'))
            : [];

          const backendRoles = roles.map(r => ({
            id: r.id.toString(),
            name: r.name,
            description: `Normalized: ${r.normalized_name}`
          }));

          const backendPermissions = permissions.map(p => ({
            id: p.id.toString(),
            name: p.name,
            description: p.description || '',
            code: `${p.resource}_${p.action}`,
            resource: p.resource as string,
            action: p.action as string
          }));

          const formatted = mappings.map(m => ({ userId: m.userId, roleId: m.roleId.toString() }));
          const formattedRolePerms = rolePermMappings.map(m => ({
            roleId: m.roleId.toString(),
            permissionId: m.permissionId.toString()
          }));

          patchState(store, {
            roles: backendRoles,
            permissions: backendPermissions,
            userRoles: formatted,
            rolePermissions: formattedRolePerms,
            rbacHydrated: true
          });
        } catch (err) {
          console.error('Error loading real data for admin store', err);
        }
      },

      // Users to Roles Mappings CRUD
      async assignRoleToUser(userId: string, roleId: string): Promise<void> {
        patchState(store, setLoading());
        try {
          const numRoleId = typeof roleId === 'string' ? parseInt(roleId, 10) : roleId;
          await lastValueFrom(http.post('/users/assign-roles', { userId, roleId: numRoleId }));
          const roleKey = String(roleId);
          const exists = store.userRoles().some((m) => m.userId === userId && String(m.roleId) === roleKey);
          const updated = exists
            ? store.userRoles()
            : [...store.userRoles(), { userId, roleId: roleKey }];
          patchState(store, { userRoles: updated, rbacHydrated: true });
          patchState(store, setLoaded());
        } catch (err: any) {
          patchState(store, setError(err.message));
          throw err;
        }
      },

      async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
        patchState(store, setLoading());
        try {
          const numRoleId = typeof roleId === 'string' ? parseInt(roleId, 10) : roleId;
          await lastValueFrom(http.post('/users/remove-roles', { userId, roleId: numRoleId }));
          const roleKey = String(roleId);
          const updated = store.userRoles().filter(
            (m) => !(m.userId === userId && String(m.roleId) === roleKey)
          );
          patchState(store, { userRoles: updated, rbacHydrated: true });
          patchState(store, setLoaded());
        } catch (err: any) {
          patchState(store, setError(err.message));
          throw err;
        }
      },

      // Roles to Permissions Mappings CRUD
      async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
        patchState(store, setLoading());
        try {
          const numRoleId = typeof roleId === 'string' ? parseInt(roleId, 10) : roleId;
          const numPermissionId = typeof permissionId === 'string' ? parseInt(permissionId, 10) : permissionId;
          await lastValueFrom(http.post('/roles/assign-permission', { roleId: numRoleId, permissionId: numPermissionId }));
          const roleKey = String(roleId);
          const permKey = String(permissionId);
          const exists = store.rolePermissions().some(
            (m) => String(m.roleId) === roleKey && String(m.permissionId) === permKey
          );
          const updated = exists
            ? store.rolePermissions()
            : [...store.rolePermissions(), { roleId: roleKey, permissionId: permKey }];
          patchState(store, { rolePermissions: updated, rbacHydrated: true });
          patchState(store, setLoaded());
        } catch (err: any) {
          patchState(store, setError(err.message));
          throw err;
        }
      },

      async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
        patchState(store, setLoading());
        try {
          const numRoleId = typeof roleId === 'string' ? parseInt(roleId, 10) : roleId;
          const numPermissionId = typeof permissionId === 'string' ? parseInt(permissionId, 10) : permissionId;
          await lastValueFrom(http.post('/roles/remove-permission', { roleId: numRoleId, permissionId: numPermissionId }));
          const roleKey = String(roleId);
          const permKey = String(permissionId);
          const updated = store.rolePermissions().filter(
            (m) => !(String(m.roleId) === roleKey && String(m.permissionId) === permKey)
          );
          patchState(store, { rolePermissions: updated, rbacHydrated: true });
          patchState(store, setLoaded());
        } catch (err: any) {
          patchState(store, setError(err.message));
          throw err;
        }
      },

      // Entity queries (convenient accessor methods)
      getRolesForUser(userId: string): Role[] {
        const roleIds = new Set(
          store.userRoles()
            .filter((m) => m.userId === userId)
            .map((m) => String(m.roleId))
        );
        return store.roles().filter((r) => roleIds.has(String(r.id)));
      },

      getPermissionsForRole(roleId: string): Permission[] {
        const roleKey = String(roleId);
        const permIds = new Set(
          store.rolePermissions()
            .filter((m) => String(m.roleId) === roleKey)
            .map((m) => String(m.permissionId))
        );
        return store.permissions().filter((p) => permIds.has(String(p.id)));
      },

      /** Live permission codes for a user from role mappings (signal-store source of truth). */
      getPermissionCodesForUser(userId: string): string[] {
        const roleIds = new Set(
          store.userRoles()
            .filter((m) => m.userId === userId)
            .map((m) => String(m.roleId))
        );
        const permIds = new Set(
          store.rolePermissions()
            .filter((m) => roleIds.has(String(m.roleId)))
            .map((m) => String(m.permissionId))
        );
        const codes = new Set<string>();
        for (const p of store.permissions()) {
          if (!permIds.has(String(p.id))) continue;
          const code = (p.code || `${p.resource}_${p.action}`).trim();
          if (code) codes.add(code);
        }
        return [...codes];
      }
    };
  })
);

export interface AdminStoreType {
  readonly users: Signal<User[]>;
  readonly roles: Signal<Role[]>;
  readonly permissions: Signal<Permission[]>;
  readonly menus: Signal<Menu[]>;
  readonly userRoles: Signal<UserRoleMapping[]>;
  readonly rolePermissions: Signal<RolePermissionMapping[]>;
  readonly rbacHydrated: Signal<boolean>;
  readonly callState: Signal<CallState>;
  readonly isLoading: Signal<boolean>;
  readonly isLoaded: Signal<boolean>;
  readonly error: Signal<string | null>;

  assignRoleToUser(userId: string, roleId: string): Promise<void>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
  assignPermissionToRole(roleId: string, permissionId: string): Promise<void>;
  removePermissionFromRole(roleId: string, permissionId: string): Promise<void>;

  loadRealData(): Promise<void>;

  getRolesForUser(userId: string): Role[];
  getPermissionsForRole(roleId: string): Permission[];
  getPermissionCodesForUser(userId: string): string[];
}
