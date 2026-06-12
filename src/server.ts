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

import cookieParser from 'cookie-parser';
import { createProxyMiddleware } from 'http-proxy-middleware';

const JWT_SECRET = process.env['JWT_SECRET'] || 'a0c0bf3d62f808d99f1efcd182c27346b36154960c17763f22a6d50d28faed8b';

app.use(cookieParser());
app.use(express.json());

// Temporarily bypass self-signed certificate errors for local development
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// BFF Login Endpoint - Calls .NET and sets HttpOnly cookie
app.post('/api/auth/login', async (req, res, next) => {
  const { email, password } = req.body;
  
  try {
    // 1. Authenticate with ASP.NET Core
    const backendResponse = await fetch('https://localhost:5001/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!backendResponse.ok) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    
    const data = await backendResponse.json();
    const token = data.accessToken;
    
    // 2. Set HttpOnly Cookie for the token
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax', // Must be lax/strict for security
      maxAge: 3600000 // 1 hour
    });
    
    // 3. Return a generic success (Angular will decode the cookie or token via a different mean, 
    // but wait, Angular can't read HttpOnly cookies to decode the JWT). 
    // Since Angular needs to decode the JWT to get roles, we MUST send the token back 
    // OR we decode it here and send the user info. Let's decode it here and send user info.
    const jwtDecode = (await import('jwt-decode')).jwtDecode;
    const decoded: any = jwtDecode(token);
    
    const user = {
      id: decoded.sub,
      email: decoded.email,
      roles: Array.isArray(decoded.roles) ? decoded.roles : (typeof decoded.roles === 'string' ? JSON.parse(decoded.roles) : []),
      resourceAccess: Array.isArray(decoded.resource_access) ? decoded.resource_access : (typeof decoded.resource_access === 'string' ? JSON.parse(decoded.resource_access) : [])
    };
    
    res.json({ user, token }); // Also returning token so Angular AuthStore can still save it if needed, or we just rely on HttpOnly. Let's return token just in case.
  } catch (err) {
    console.error('BFF Login Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.sendStatus(200);
});

// Proxy other API requests to ASP.NET Core
app.use('/api', createProxyMiddleware({
  target: 'https://localhost:5001',
  changeOrigin: true,
  secure: false, // Bypass self-signed cert errors in local dev
  pathRewrite: {
    '^/api': '' 
  },
  on: {
    proxyReq: (proxyReq, req: any) => {
      // Forward the token from the HttpOnly cookie
      const token = req.cookies?.auth_token;
      if (token) {
        proxyReq.setHeader('Authorization', `Bearer ${token}`);
      }
    }
  }
}));

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
