import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

import { mockData } from './server/mock-data';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env['JWT_SECRET'] || 'super-secret-key-for-dev';

app.use(express.json());

// Helper to authenticate JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

import { apiRouter } from './server/api';

/**
 * Example Express Rest API endpoints can be defined here.
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = mockData.users.find(u => u.email === email);
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    
    if ((user as any).password !== password) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Fetch user roles
    const userRoleMappings = mockData.users_roles.filter(ur => ur.user_id === user.id);
    const roles = userRoleMappings.map(ur => {
      const role = mockData.roles.find(r => r.id === ur.role_id);
      return role ? { name: role.name, normalized_name: role.normalized_name } : null;
    }).filter(r => r !== null);
    
    const token = jwt.sign(
      { id: user.id, email: user.email, roles: roles.map(r => r?.name) },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        displayName: user.display_name,
        roles
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.use('/api', authenticateToken, apiRouter);



app.get('/api/auth/me', authenticateToken, async (req: any, res: any) => {
  try {
    const user = mockData.users.find(u => u.id === req.user.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    const userRoleMappings = mockData.users_roles.filter(ur => ur.user_id === user.id);
    const roles = userRoleMappings.map(ur => {
      const role = mockData.roles.find(r => r.id === ur.role_id);
      return role ? { name: role.name, normalized_name: role.normalized_name } : null;
    }).filter(r => r !== null);
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name,
      roles: roles
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
