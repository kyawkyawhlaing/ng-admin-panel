export interface User {
  id: string;
  name: string;
  email: string;
  status: 'Active' | 'Inactive';
}

export interface Role {
  id: string;
  name: string;
  description: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  code: string;
}

export interface Menu {
  id: string;
  title: string;
  route: string;
  icon: string;
}

export interface UserRoleMapping {
  userId: string;
  roleId: string;
}

export interface RolePermissionMapping {
  roleId: string;
  permissionId: string;
}

export interface PermissionMenuMapping {
  permissionId: string;
  menuId: string;
}
