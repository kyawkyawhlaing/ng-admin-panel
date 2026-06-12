# Backend API Integration Guide

This guide explains how to replace the current Express mock API (`src/server/`) with a real backend service such as **ASP.NET Core**, **Java (Spring Boot)**, **Rust**, or **Python (FastAPI/Django)**.

Since the application uses an NgRx SignalStore and Angular's `HttpClient` for data fetching, migrating to a real backend is a straightforward process of redirecting API calls and enforcing security policies.

## Step 1: Configure CORS on the Backend

When replacing the mock API, your new backend must handle Cross-Origin Resource Sharing (CORS) since the Angular app (running on `localhost:4200` in dev or via SSR) will request data from the backend domain.

**Example (ASP.NET Core):**
```csharp
var builder = WebApplication.CreateBuilder(args);

// Add CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp",
        policy => policy.WithOrigins("http://localhost:4200")
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials()); // Required for JWT cookies
});

var app = builder.Build();
app.UseCors("AllowAngularApp");
```

## Step 2: Configure the Angular Dev Proxy

During development, Angular proxies `/api` requests to the Express mock server. You must update this proxy to point to your real backend running locally.

Modify the `proxy.conf.json` (or create one in the root folder):

```json
{
  "/api": {
    "target": "http://localhost:5000", 
    "secure": false,
    "changeOrigin": true
  }
}
```
*Note: Replace `http://localhost:5000` with the URL and port of your actual backend (e.g., ASP.NET Core runs on 5000/5001 by default).*

## Step 3: Implement JWT Authentication

The mock API simulates JWT tokens. Your real backend must issue standard JWTs and validate them on secure endpoints.

1. **Login:** The backend must return a JSON payload with a `token`.
2. **Angular Interceptor:** The Angular app already attaches the JWT token via a functional interceptor using the `Authorization: Bearer <token>` header.
3. **Backend Validation:** The backend must decode and validate this token.

**Example (ASP.NET Core Authorization):**
```csharp
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    [HttpGet]
    public IActionResult GetUsers()
    {
        // Only accessible with a valid Bearer token
        return Ok(new[] { new { Id = "u1", Name = "John Doe" } });
    }
}
```

## Step 4: Handle Server-Side Rendering (SSR) Considerations

If you deploy using Angular SSR (`server.mjs`), API calls made during the server rendering phase will originate from the Node.js process, not the user's browser. 

If your backend is deployed at `https://api.yourdomain.com`:

1. Set an environment variable in Angular (e.g., `environment.apiUrl = 'https://api.yourdomain.com'`).
2. Prefix all `HttpClient` calls with the base URL, or use a functional interceptor to automatically attach the base URL to `/api/*` requests in production.

**Example Interceptor for Production URLs:**
```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { isDevMode } from '@angular/core';

export const baseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isDevMode() && req.url.startsWith('/api')) {
    const apiReq = req.clone({ url: `https://api.yourdomain.com${req.url}` });
    return next(apiReq);
  }
  return next(req);
};
```

## Step 5: Implement the BFF Pattern (Proxying)

Instead of exposing your real backend APIs directly to the browser (which reveals your microservices/backend architecture), you can utilize the existing Node.js Express server (`server.ts`) as a Backend-for-Frontend (BFF). This conceals the true backend endpoints and simplifies CORS.

To achieve this, you will use `http-proxy-middleware` inside `server.ts` to transparently route all frontend `/api` requests to your real ASP.NET Core/Java/Rust backend.

**1. Install Proxy Middleware:**
```bash
npm install http-proxy-middleware
# or if using pnpm: pnpm add http-proxy-middleware
```

**2. Update `server.ts` to Proxy Requests:**
Replace the mock API routes in `src/server.ts` with the proxy middleware:

```typescript
import { createProxyMiddleware } from 'http-proxy-middleware';

// Remove the mock API router
// import { apiRouter } from './server/api'; 
// server.use('/api', apiRouter);

// Add the BFF Proxy
server.use('/api', createProxyMiddleware({
  target: 'https://internal-api.yourdomain.com', // Your real backend URL
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Optional: remove /api prefix when sending to backend
  },
  onProxyReq: (proxyReq, req, res) => {
    // Optional: Add server-to-server authentication headers here
    // proxyReq.setHeader('X-API-KEY', process.env.BACKEND_API_KEY);
  }
}));
```

Using this BFF approach:
1. The Angular frontend only ever talks to its own origin (`/api/...`).
2. The browser never sees `https://internal-api.yourdomain.com`.
3. You bypass complex CORS configurations on the real backend because the Node.js server makes the requests server-to-server.
