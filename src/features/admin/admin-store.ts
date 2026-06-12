import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { computed, Signal } from '@angular/core';
import { withCallState, setLoading, setLoaded, setError, CallState } from '../../core/stores/features/with-call-state';
import { User, Role, Permission, Menu, UserRoleMapping, RolePermissionMapping, PermissionMenuMapping } from '../../types/rbac';

export interface AdminState {
  users: User[];
  roles: Role[];
  permissions: Permission[];
  menus: Menu[];
  userRoles: UserRoleMapping[];
  rolePermissions: RolePermissionMapping[];
  permissionMenus: PermissionMenuMapping[];
}

const initialAdminState: AdminState = {
  users: [
    { id: 'u1', name: 'Sarah Connor', email: 'sarah@skynet.com', status: 'Active' },
    { id: 'u2', name: 'John Doe', email: 'john.doe@example.com', status: 'Active' },
    { id: 'u3', name: 'Alice Smith', email: 'alice.smith@example.com', status: 'Active' }
  ],
  roles: [
    { id: 'r1', name: 'Super Admin', description: 'Unrestricted access to all modules and configurations' },
    { id: 'r2', name: 'User Administrator', description: 'Can view and modify system user accounts' },
    { id: 'r3', name: 'Security Manager', description: 'Configures roles and permissions mapping' }
  ],
  permissions: [
    { id: 'p1', name: 'Read Users', description: 'Can view user management list', code: 'read:users' },
    { id: 'p2', name: 'Write Users', description: 'Can add, edit, or delete users', code: 'write:users' },
    { id: 'p3', name: 'Read Roles', description: 'Can view security roles', code: 'read:roles' },
    { id: 'p4', name: 'Write Roles', description: 'Can edit roles and assign permissions', code: 'write:roles' },
    { id: 'p5', name: 'Read Permissions', description: 'Can view permissions mapping catalog', code: 'read:permissions' },
    { id: 'p6', name: 'Read Menus', description: 'Can view layout sidebar menu settings', code: 'read:menus' }
  ],
  menus: [
    { id: 'm1', title: 'Dashboard', route: '/admin/dashboard', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
    { id: 'm2', title: 'Users', route: '/admin/users', icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z' },
    { id: 'm3', title: 'Roles', route: '/admin/roles', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751A11.959 11.959 0 0 1 12 2.712Z' },
    { id: 'm4', title: 'Permissions', route: '/admin/permissions', icon: 'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-.999.43-1.563A6 6 0 1 1 21.75 8.25Z' },
    { id: 'm5', title: 'Menus', route: '/admin/menus', icon: 'M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5' }
  ],
  userRoles: [
    { userId: 'u1', roleId: 'r1' }, // Sarah Connor -> Super Admin
    { userId: 'u2', roleId: 'r2' }, // John Doe -> User Administrator
    { userId: 'u3', roleId: 'r3' }  // Alice Smith -> Security Manager
  ],
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
  permissionMenus: [
    { permissionId: 'p1', menuId: 'm2' }, // Read Users -> Users Menu
    { permissionId: 'p3', menuId: 'm3' }, // Read Roles -> Roles Menu
    { permissionId: 'p5', menuId: 'm4' }, // Read Permissions -> Permissions Menu
    { permissionId: 'p6', menuId: 'm5' }  // Read Menus -> Menus Menu
  ]
};

export const AdminStore = signalStore(
  { providedIn: 'root' },
  withState(initialAdminState),
  withCallState(),
  withMethods((store) => {
    // Helper to simulate network latency
    const simulateApiCall = <T>(action: () => T, delay = 800): Promise<T> => {
      patchState(store, setLoading());
      return new Promise<T>((resolve, reject) => {
        setTimeout(() => {
          try {
            const result = action();
            patchState(store, setLoaded());
            resolve(result);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
            patchState(store, setError(errorMsg));
            reject(err);
          }
        }, delay);
      });
    };

    return {
      // Users to Roles Mappings CRUD
      assignRoleToUser(userId: string, roleId: string): Promise<void> {
        return simulateApiCall(() => {
          const exists = store.userRoles().some(m => m.userId === userId && m.roleId === roleId);
          if (exists) {
            throw new Error(`Role is already assigned to this user.`);
          }
          const updated = [...store.userRoles(), { userId, roleId }];
          patchState(store, { userRoles: updated });
        });
      },

      removeRoleFromUser(userId: string, roleId: string): Promise<void> {
        return simulateApiCall(() => {
          const updated = store.userRoles().filter(m => !(m.userId === userId && m.roleId === roleId));
          patchState(store, { userRoles: updated });
        });
      },

      // Roles to Permissions Mappings CRUD
      assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
        return simulateApiCall(() => {
          const exists = store.rolePermissions().some(m => m.roleId === roleId && m.permissionId === permissionId);
          if (exists) {
            throw new Error(`Permission is already assigned to this role.`);
          }
          const updated = [...store.rolePermissions(), { roleId, permissionId }];
          patchState(store, { rolePermissions: updated });
        });
      },

      removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
        return simulateApiCall(() => {
          const updated = store.rolePermissions().filter(m => !(m.roleId === roleId && m.permissionId === permissionId));
          patchState(store, { rolePermissions: updated });
        });
      },

      // Permissions to Menus Mappings CRUD
      assignMenuToPermission(permissionId: string, menuId: string): Promise<void> {
        return simulateApiCall(() => {
          const exists = store.permissionMenus().some(m => m.permissionId === permissionId && m.menuId === menuId);
          if (exists) {
            throw new Error(`Menu is already assigned to this permission.`);
          }
          const updated = [...store.permissionMenus(), { permissionId, menuId }];
          patchState(store, { permissionMenus: updated });
        });
      },

      removeMenuFromPermission(permissionId: string, menuId: string): Promise<void> {
        return simulateApiCall(() => {
          const updated = store.permissionMenus().filter(m => !(m.permissionId === permissionId && m.menuId === menuId));
          patchState(store, { permissionMenus: updated });
        });
      },

      // Entity queries (convenient accessor methods)
      getRolesForUser(userId: string): Role[] {
        const roleIds = store.userRoles()
          .filter(m => m.userId === userId)
          .map(m => m.roleId);
        return store.roles().filter(r => roleIds.includes(r.id));
      },

      getPermissionsForRole(roleId: string): Permission[] {
        const permIds = store.rolePermissions()
          .filter(m => m.roleId === roleId)
          .map(m => m.permissionId);
        return store.permissions().filter(p => permIds.includes(p.id));
      },

      getMenusForPermission(permissionId: string): Menu[] {
        const menuIds = store.permissionMenus()
          .filter(m => m.permissionId === permissionId)
          .map(m => m.menuId);
        return store.menus().filter(m => menuIds.includes(m.id));
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
  readonly permissionMenus: Signal<PermissionMenuMapping[]>;
  readonly callState: Signal<CallState>;
  readonly isLoading: Signal<boolean>;
  readonly isLoaded: Signal<boolean>;
  readonly error: Signal<string | null>;

  assignRoleToUser(userId: string, roleId: string): Promise<void>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
  assignPermissionToRole(roleId: string, permissionId: string): Promise<void>;
  removePermissionFromRole(roleId: string, permissionId: string): Promise<void>;
  assignMenuToPermission(permissionId: string, menuId: string): Promise<void>;
  removeMenuFromPermission(permissionId: string, menuId: string): Promise<void>;

  getRolesForUser(userId: string): Role[];
  getPermissionsForRole(roleId: string): Permission[];
  getMenusForPermission(permissionId: string): Menu[];
}
