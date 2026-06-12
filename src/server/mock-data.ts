export const mockData = {
  users: [
    {
      id: '7e3cd563-3290-49de-b14d-2a652212c740',
      display_name: 'System Admin',
      email: 'systemadmin@default.com',
      first_name: 'System',
      last_name: 'Admin',
      password: 'password123',
      is_locked_out: false,
      created_at: '2026-03-08T13:13:08.455Z',
      two_factor_enabled: false,
      preferences: {
        security_alerts: true,
        system_updates: true
      }
    },
    {
      id: '696a38a9-d338-443b-a3f6-6418b0333ac3',
      display_name: 'Kyaw Kyaw',
      email: 'kyaw@test.com',
      first_name: 'Kyaw',
      last_name: 'Kyaw',
      password: 'password123',
      is_locked_out: false,
      created_at: '2026-03-09T10:15:00.000Z',
      two_factor_enabled: false,
      preferences: {
        security_alerts: false,
        system_updates: true
      }
    }
  ],
  roles: [
    { id: 1, name: 'admin', normalized_name: 'ADMIN' },
    { id: 2, name: 'department', normalized_name: 'DEPARTMENT' }
  ],
  permissions: [
    { id: 1, name: 'users_access', action: 'access', resource: 'users', description: 'Access to users management' },
    { id: 2, name: 'users_create', action: 'create', resource: 'users', description: 'Can create new users' }
  ],
  menus: [
    { 
      id: 1, 
      name: 'users', 
      api_path: '/users', 
      description: 'user page', 
      is_active: true,
      icon: null,
      parent_id: 0,
      is_visible: true,
      sort_order: 1
    }
  ],
  users_roles: [
    { user_id: '7e3cd563-3290-49de-b14d-2a652212c740', role_id: 1 }
  ],
  roles_permissions: [
    { role_id: 1, permission_id: 1 },
    { role_id: 1, permission_id: 2 }
  ],
  permissions_menus: [],
  menu_statuses: [
    { status: 'users' },
    { status: 'roles' },
    { status: 'permissions' },
    { status: 'menus' },
    { status: 'settings' }
  ]
};
