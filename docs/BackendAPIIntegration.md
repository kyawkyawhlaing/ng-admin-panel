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

## Step 5: Remove the Mock Server

Once your real backend is fully functional:
1. Delete the `src/server/mock-data.ts` and `src/server/api.ts` files.
2. In `server.ts` (the SSR entry point), remove the Express API routes mapping `server.use('/api', apiRouter);`.
3. The Express `server.ts` will now solely serve as the SSR renderer for your Angular application without handling backend endpoints.
