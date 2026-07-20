export type ActionStatus = 'access' | 'create' | 'delete' | 'edit' | 'view';

export interface PermissionsMenusTable {
  permission_id: number;
  menu_id: number;
}

export interface MenuStatusTable {
  status: string;
}

export interface MenusTable {
  id: number;
  name: string | null;
  api_path: string;
  icon: string | null;
  description: string;
  parent_id: number;
  is_active: boolean;
  is_visible: boolean;
  sort_order: number;
}

export interface PermissionsTable {
  id: number;
  name: string;
  action: ActionStatus;
  resource: string | null;
  description: string;
}

export interface RolesTable {
  id: number;
  name: string;
  normalized_name: string;
}

export interface RolesPermissionsTable {
  role_id: number;
  permission_id: number;
}

export interface UsersTable {
  id: string;
  display_name: string;
  email: string;
  first_name: string;
  last_name: string;
  first_time_login: boolean;
  two_factor_enabled: boolean;
  access_failed_count: number;
  lockout_enabled: boolean;
  is_locked_out: boolean;
  lockout_end: string | Date | null;
  created_by: string;
  created_at: string | Date;
  updated_by: string;
  last_updated_at: string | Date | null;
  /** Write-only field used by create-user forms — never returned by API. */
  password?: string;
  preferences?: {
    security_alerts: boolean;
    system_updates: boolean;
  };
}

export interface UsersRolesTable {
  user_id: string;
  role_id: number;
}
