# ASP.NET Core API Analysis

This document provides an analysis of the **KyawHlaing** ASP.NET Core backend (`KyawHlaing/`) and the steps required to integrate it with the `kyawhlaing-admin` Angular application.

## 1. Architectural Overview

The backend is a feature-first **modulith** with **Minimal APIs** and **CQRS** (Scrutor + `ICommand`/`IQuery` — not MediatR). Endpoints are grouped by module, which mirrors the Angular feature domains.

**Available API Categories:**
- **Users**: Handled via endpoints like `POST /users/login`, `POST /users/register`.
- **Roles**: Manage application roles.
- **Permissions**: Map actions to resources.
- **Menus**: Manage dynamic application navigation.
- **RefreshTokens**: Handle JWT renewal.

## 2. API Signatures & Models

### Authentication
- **Endpoint**: `POST /users/login`
- **Payload**: `{"Email": "user@example.com", "Password": "secret_password"}`
- **Response**: Returns an `AccessTokenResponseDto` containing the JWT and potentially user metadata.

### User Data
- **UserDto**:
  ```csharp
  public sealed class UserDto {
      public string Id { get; init; }
      public string Email { get; init; }
      public string FirstName { get; init; }
      public string LastName { get; init; }
  }
  ```
*Note: Depending on ASP.NET Core's JSON serialization settings, these PascalCase properties may be converted to camelCase (`id`, `email`, `firstName`, `lastName`) in the HTTP response.*

## 3. CORS Configuration

The `Api/Program.cs` file utilizes a dynamic CORS policy named `"CorsPolicy"`.
To permit the Angular application to make cross-origin requests directly (if not using a proxy), the Angular origin must be whitelisted.

**Required Action in `.NET`:**
Update `Api/appsettings.Development.json` (and production appsettings) to include the Angular URLs:
```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:4200",
      "http://localhost:4000"
    ]
  }
}
```

## 4. Angular BFF Proxy Integration

To seamlessly integrate without battling CORS or rewriting hardcoded Angular HTTP paths, the `NgAdminPanel` will utilize a Backend-For-Frontend (BFF) proxy pattern.

**How it works:**
1. The Angular Dev Server (`proxy.conf.json`) and the SSR Express Server (`src/server.ts`) will intercept all traffic destined for `/api/*`.
2. The proxy strips the `/api` prefix and forwards the request to the ASP.NET Core server (e.g., `https://localhost:5001/`).
3. Angular continues calling `/api/users/login`, but the actual execution happens on `https://localhost:5001/users/login`.

## 5. Integration Challenges and Solutions

During the integration of the BFF proxy pattern with the live ASP.NET Core development environment, two critical integration issues were identified and resolved.

### 5.1 Self-Signed SSL Certificate Verification
- **Situation:** The ASP.NET Core server locally runs with a self-signed development certificate (`https://localhost:5001`). Modern versions of Node.js (`fetch`) strictly verify SSL certificates and threw a `DEPTH_ZERO_SELF_SIGNED_CERT` error during the proxy authentication flow.
- **Solution:** For local development, `process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'` was introduced at the top of `src/server.ts` to bypass strict SSL validation. *Note: In a production environment, valid SSL certificates must be provisioned, or the internal proxy routing should occur over an isolated unencrypted network (e.g., Docker `http://backend:5000`).*

### 5.2 JWT Claim Serialization Formats
- **Situation:** The Angular `AuthStore` expected the `roles` and `resource_access` to be strings that require manual `JSON.parse` decoding. However, ASP.NET Core natively serializes these claims as JSON arrays by setting the value type to `JsonClaimValueTypes.JsonArray`. This led to a runtime crash (`SyntaxError: Unexpected token 'a', "admin" is not valid JSON`) when the BFF tried to re-parse the array as a JSON string.
- **Solution:** Implemented adaptive decoding logic in the BFF proxy to check the datatype natively (`Array.isArray(decoded.roles)`) before attempting `JSON.parse`. This guarantees the Node layer can securely convert the .NET JWT to the format the Angular SignalStore requires.
