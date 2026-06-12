# Complete Backend-for-Frontend (BFF) Pattern Guide

This document provides a detailed analysis of the project's server structure and a comprehensive guide on implementing a robust Backend-for-Frontend (BFF) pattern using the existing Node.js Express server.

## 1. What is the BFF Pattern?

The Backend-for-Frontend (BFF) pattern involves creating a dedicated server-side layer that sits between your frontend application (Angular) and your downstream backend services (e.g., microservices in ASP.NET Core, Java, Rust).

**Benefits of a BFF:**
- **Concealment:** True backend endpoints are never exposed to the public internet or the browser. The browser only communicates with the BFF.
- **Security:** The BFF can handle authentication (e.g., converting HTTP-only cookies to JWT Bearer tokens) preventing Cross-Site Scripting (XSS) attacks from stealing tokens.
- **Aggregation:** The BFF can aggregate multiple downstream API calls into a single response tailored specifically for the UI.
- **CORS Elimination:** The browser only makes same-origin requests to the BFF. Complex Cross-Origin Resource Sharing (CORS) configurations are no longer required on the core backend.

## 2. Analysis of the Current Project Structure

The project currently runs an Express server (`src/server.ts`) which serves three purposes:
1. **Angular SSR Renderer:** Uses `@angular/ssr/node` to render pages server-side for optimal performance and SEO.
2. **Static File Server:** Serves compiled browser assets (`/browser`).
3. **Mock API Provider:** Defines routes like `/api/auth/login` and uses an internal `apiRouter` to simulate backend functionality.

Currently, the Express server validates mock JWT tokens via the `authenticateToken` middleware. This architectural foundation positions the `server.ts` file perfectly to be transitioned from a *mock* API into a *production BFF proxy*.

## 3. Implementing the Complete BFF Pattern

To transition the `server.ts` into a production-ready BFF that conceals your real backend APIs, follow these steps in detail.

### Step 3.1: Install Dependencies

You will need `http-proxy-middleware` to easily route requests, and `cookie-parser` to implement strict cookie-based authentication.

```bash
pnpm add http-proxy-middleware cookie-parser
pnpm add -D @types/cookie-parser
```

### Step 3.2: Secure Authentication (Cookie to Bearer)

In a pure BFF architecture, the frontend should not store JWTs in LocalStorage. Instead, the login endpoint should set an **HttpOnly, Secure** cookie.

Update your `server.ts` to manage the token conversion dynamically.

```typescript
// Inside src/server.ts
import cookieParser from 'cookie-parser';
import { createProxyMiddleware } from 'http-proxy-middleware';

app.use(cookieParser());

// 1. BFF Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Make a server-to-server call to your REAL backend to authenticate
  try {
    const backendResponse = await fetch('https://internal-api.backend.local/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!backendResponse.ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const data = await backendResponse.json();
    const token = data.token; // The real JWT from the backend
    
    // Set an HttpOnly cookie so the browser cannot read it via Javascript
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });
    
    // Return user info to Angular (DO NOT return the token)
    res.json({ user: data.user });
  } catch (err) {
    res.status(500).json({ message: 'BFF Login Error' });
  }
});

// 2. BFF Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.sendStatus(200);
});
```

### Step 3.3: Concealing Backend Endpoints via Proxy Middleware

Now, intercept all other `/api/*` requests coming from the Angular frontend. The BFF will extract the HTTP-only cookie, attach it as a standard `Authorization: Bearer` header, and proxy the request to the concealed backend.

```typescript
// Replace the old mock apiRouter with this proxy configuration
const targetBackendUrl = process.env.BACKEND_API_URL || 'https://internal-api.backend.local';

app.use('/api', createProxyMiddleware({
  target: targetBackendUrl,
  changeOrigin: true, // Required for virtual hosted sites
  pathRewrite: {
    '^/api': '', // Rewrites /api/users to /users on the backend
  },
  on: {
    proxyReq: (proxyReq, req: any, res) => {
      // Extract the HttpOnly cookie
      const token = req.cookies?.auth_token;
      
      // Attach it as a Bearer token for the downstream backend
      if (token) {
        proxyReq.setHeader('Authorization', `Bearer ${token}`);
      }
      
      // Optional: Add a BFF specific secret key so the backend knows 
      // the request actually came from the BFF and not directly from the outside.
      proxyReq.setHeader('X-BFF-Key', process.env.BFF_SECRET || 'dev-secret');
    },
    error: (err, req, res) => {
      console.error('BFF Proxy Error:', err);
      res.status(502).json({ message: 'Bad Gateway - Backend unreachable' });
    }
  }
}));
```

### Step 3.4: Angular HttpClient Adjustments

Because the BFF handles the token via cookies, you must ensure that your Angular `HttpClient` sends credentials (cookies) with every request.

Modify your Angular interceptor (`src/core/interceptors/auth.interceptor.ts`):

```typescript
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Always include cookies in cross-origin or same-origin requests
  const clonedReq = req.clone({
    withCredentials: true 
  });
  
  return next(clonedReq);
};
```

*(Note: You must remove the existing code that manually reads the token from LocalStorage and attaches it to the header, as the BFF now handles the token securely via HttpOnly cookies).*

## 4. Summary of Traffic Flow

1. **User Action:** User logs in via Angular UI.
2. **Angular -> BFF:** Angular sends credentials to `POST /api/auth/login`.
3. **BFF -> Backend:** BFF forwards credentials to internal backend. Backend responds with JWT.
4. **BFF -> Angular:** BFF strips the JWT, places it in an `HttpOnly` cookie, and returns the User object.
5. **Data Request:** Angular calls `GET /api/users` (the browser automatically attaches the cookie).
6. **BFF Proxy:** BFF intercepts `/api/users`, extracts the cookie, adds `Authorization: Bearer <token>`, and routes to internal backend `GET /users`.
7. **Response:** Backend validates the token and returns data to BFF, which forwards it back to Angular.

This architecture entirely conceals your backend infrastructure and provides enterprise-grade security against XSS token theft.
