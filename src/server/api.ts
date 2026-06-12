import { Router } from 'express';
import { mockData } from './mock-data';
import * as crypto from 'crypto';

export const apiRouter = Router();

// --- Users ---
apiRouter.get('/users', (req, res) => {
  try {
    res.json(mockData.users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

apiRouter.post('/users', (req, res) => {
  try {
    const newUser = { 
      id: crypto.randomUUID(), 
      ...req.body, 
      created_at: new Date().toISOString() 
    };
    mockData.users.push(newUser);
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating user' });
  }
});

apiRouter.put('/users/:id', (req, res) => {
  const { id } = req.params;
  try {
    const index = mockData.users.findIndex(u => u.id === id);
    if (index !== -1) {
      mockData.users[index] = { ...mockData.users[index], ...req.body };
      res.json(mockData.users[index]);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

apiRouter.put('/users/:id/password', (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;
  try {
    const index = mockData.users.findIndex(u => u.id === id);
    if (index !== -1) {
      if (mockData.users[index].password !== currentPassword) {
        res.status(400).json({ message: 'Incorrect current password' });
        return;
      }
      mockData.users[index].password = newPassword;
      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

apiRouter.put('/users/:id/mfa', (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;
  try {
    const index = mockData.users.findIndex(u => u.id === id);
    if (index !== -1) {
      mockData.users[index].two_factor_enabled = enabled;
      res.json({ message: enabled ? 'MFA enabled successfully' : 'MFA disabled successfully', user: mockData.users[index] });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update MFA settings' });
  }
});

apiRouter.delete('/users/:id', (req, res) => {
  try {
    mockData.users = mockData.users.filter(u => u.id !== req.params['id']);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- Roles ---
apiRouter.get('/roles', (req, res) => {
  try {
    res.json(mockData.roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching roles' });
  }
});

apiRouter.post('/roles', (req, res) => {
  try {
    const nextId = mockData.roles.length > 0 ? Math.max(...mockData.roles.map(r => r.id)) + 1 : 1;
    const newRole = { id: nextId, ...req.body };
    mockData.roles.push(newRole);
    res.status(201).json(newRole);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating role' });
  }
});

apiRouter.put('/roles/:id', (req, res) => {
  const id = parseInt(req.params['id'], 10);
  try {
    const index = mockData.roles.findIndex(r => r.id === id);
    if (index !== -1) {
      mockData.roles[index] = { ...mockData.roles[index], ...req.body };
      res.json(mockData.roles[index]);
    } else {
      res.status(404).json({ message: 'Role not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// --- Permissions ---
apiRouter.get('/permissions', (req, res) => {
  try {
    res.json(mockData.permissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching permissions' });
  }
});

apiRouter.post('/permissions', (req, res) => {
  try {
    const nextId = mockData.permissions.length > 0 ? Math.max(...mockData.permissions.map(p => p.id)) + 1 : 1;
    const newPermission = { id: nextId, ...req.body };
    mockData.permissions.push(newPermission);
    res.status(201).json(newPermission);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating permission' });
  }
});

apiRouter.put('/permissions/:id', (req, res) => {
  const id = parseInt(req.params['id'], 10);
  try {
    const index = mockData.permissions.findIndex(p => p.id === id);
    if (index !== -1) {
      mockData.permissions[index] = { ...mockData.permissions[index], ...req.body };
      res.json(mockData.permissions[index]);
    } else {
      res.status(404).json({ message: 'Permission not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

// --- Menus ---
apiRouter.get('/menus', (req, res) => {
  try {
    res.json(mockData.menus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching menus' });
  }
});

apiRouter.post('/menus', (req, res) => {
  try {
    const nextId = mockData.menus.length > 0 ? Math.max(...mockData.menus.map(m => m.id)) + 1 : 1;
    const newMenu = { id: nextId, ...req.body };
    mockData.menus.push(newMenu);
    res.status(201).json(newMenu);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating menu' });
  }
});

apiRouter.put('/menus/:id', (req, res) => {
  const id = parseInt(req.params['id'], 10);
  try {
    const index = mockData.menus.findIndex(m => m.id === id);
    if (index !== -1) {
      mockData.menus[index] = { ...mockData.menus[index], ...req.body };
      res.json(mockData.menus[index]);
    } else {
      res.status(404).json({ message: 'Menu not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update menu' });
  }
});

// --- Mappings ---
apiRouter.get('/mappings/users_roles', (req, res) => {
  try {
    res.json(mockData.users_roles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users_roles' });
  }
});

apiRouter.post('/mappings/users_roles', (req, res) => {
  const { user_id, role_id } = req.body;
  try {
    mockData.users_roles.push({ user_id, role_id });
    res.status(201).json({ message: 'User role mapped' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to map user role' });
  }
});

apiRouter.delete('/mappings/users_roles', (req, res) => {
  const { user_id, role_id } = req.body;
  try {
    mockData.users_roles = mockData.users_roles.filter(ur => !(ur.user_id === user_id && ur.role_id === role_id));
    res.json({ message: 'User role mapping deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user role mapping' });
  }
});

apiRouter.get('/menu_statuses', (req, res) => {
  try {
    res.json(mockData.menu_statuses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu statuses' });
  }
});
