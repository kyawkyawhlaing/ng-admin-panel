# Adding an admin module (frontend + backend)

This guide explains how to add a new **admin screen** in kyawhlaing-admin and keep it aligned with the **KyawHlaing** API. The link between FE and BE is the **resource name** (lowercase, e.g. `products`).

Companion doc (backend): `KyawHlaing/docs/AddingAdminModule.md`.

---

## How FE tracks BE

```
┌─────────────────────────────────────────────────────────────────┐
│  resource: "products"  (single key on both sides)             │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   permissions          navigation_items         API endpoints
   products_*           route + resource         RequirePermission
         │                    │                    │
         ▼                    ▼                    ▼
   JWT claims           GET /navigation/sidebar   HTTP from store
         │                    │                    │
         ▼                    ▼                    ▼
   AuthStore            AdminShell sidebar        *-store.ts
   hasPermission()      (automatic)               component UI
         │
         ▼
   permissionGuard + canView / canCreate / …
```

| Layer | What you configure | Where |
|-------|-------------------|--------|
| **JWT** | User's permission list | Loaded in `src/core/stores/auth-store.ts` at login |
| **Route** | `{resource}_access` | `src/app/app.routes.ts` |
| **Sidebar** | Nav row from API | `src/core/nav/nav-menu.service.ts` (no change for new modules) |
| **Data** | `*_view` etc. | `src/features/admin/<feature>/<feature>-store.ts` |
| **Buttons** | `*_create/edit/delete` | `src/features/admin/<feature>/<feature>.ts` |

### Permission suffixes (must match backend)

| Permission | Frontend use |
|------------|----------------|
| `{resource}_access` | `permissionGuard` on route; user sees sidebar item |
| `{resource}_view` | Load list/detail; call read APIs |
| `{resource}_create` | Show Create button/modal |
| `{resource}_edit` | Show Edit / inline toggles |
| `{resource}_delete` | Show Delete action |

---

## Prerequisites (backend)

Before frontend work, ensure the API has:

1. **Resource** row (e.g. `products`) and five permissions — via SQL/bootstrap or **Admin → Resources**.
2. **Navigation** row — title, `route` (`/admin/products`), `resource` (`products`), icon — via bootstrap or **Admin → Navigation**.
3. **Role assignment** — grant `products_access` (and view/create/edit/delete as needed) via **Admin → Roles**.

Resource names: `^[a-z][a-z0-9_]*$` — see `src/core/auth/resource-naming.util.ts`.

---

## Frontend implementation steps

Use `src/features/admin/resources/` as the reference implementation for a simple CRUD admin page.

### Step 1: Define types

`src/types/product.ts` (or extend `database.ts` if you prefer the existing pattern):

```typescript
export interface ProductTable {
  id: number;
  name: string;
  // match API JSON (often snake_case from .NET)
}
```

### Step 2: Create the feature store

`src/features/admin/products/products-store.ts`:

- Inject `HttpClient` and `ToastService`
- Call the same paths the backend exposes, e.g. `POST /products/list`
- Use paginated payload shape consistent with other admin stores:

```typescript
const payload = {
  searchTerm: store.filterText() || null,
  pageNumber: store.pageIndex() + 1,
  pageSize: store.pageSize()
};
const response = await lastValueFrom(
  http.post<{ metadata: { totalCount: number }; items: ProductTable[] }>(
    '/products/list',
    payload
  )
);
```

HTTP calls go to the API host configured in `src/environments/` (dev proxy to `https://localhost:5001`). Paths do **not** use an `/api` prefix in feature stores.

### Step 3: Create the component

`src/features/admin/products/products.ts`:

- Provide the feature store in the component `providers`
- Gate UI with permission computed signals:

```typescript
private readonly authStore = inject(AuthStore) as unknown as AuthStoreType;

protected readonly canView = computed(() => this.authStore.hasPermission('products_view'));
protected readonly canCreate = computed(() => this.authStore.hasPermission('products_create'));
protected readonly canEdit = computed(() => this.authStore.hasPermission('products_edit'));
protected readonly canDelete = computed(() => this.authStore.hasPermission('products_delete'));
```

- In `ngOnInit`, only load data when `canView()` is true
- Hide create/edit/delete controls when the corresponding `can*` is false
- Reuse shared UI: `KkhPageHeader`, `KkhDataTable`, `KkhModal`, etc.

### Step 4: Register the route

`src/app/app.routes.ts` — add a child under `/admin`:

```typescript
{
  path: 'products',
  canActivate: [permissionGuard],
  data: { permissions: ['products_access'] },
  loadComponent: () =>
    import('../features/admin/products/products').then(m => m.ProductsComponent)
}
```

`permissionGuard` (`src/core/guards/auth.guard.ts`) requires the user to hold **any** permission listed in `data.permissions`. Without `products_access`, navigation redirects to `/admin/dashboard`.

The route path (`products`) should match the nav item route (`/admin/products`).

### Step 5: Sidebar (usually automatic)

`AdminShell` loads `GET /navigation/sidebar` via `NavMenuService`. If the backend nav row exists and the user has `products_access`, the item appears without frontend registration.

Routes are normalized in `src/core/nav/nav-menu.util.ts` (`toAdminRoute`).

### Step 6: Optional dashboard link

`src/features/admin/dashboard/dashboard.ts` — add a stat card or link to `/admin/products` if you want it on the home screen.

### Step 7: System defaults (core IAM only)

Only for built-in console modules (`users`, `roles`, `permissions`, `navigation`, `resources`):

Update `src/core/auth/system-defaults.util.ts`:

- `CORE_RESOURCES`
- `isProtectedNavigation` routes
- `isProtectedPermission` / `isSystemDefaultResource` as needed

Custom modules like `products` do **not** require changes here.

---

## 403 and permission messaging

- Backend returns descriptive `detail` for forbidden actions (`PermissionForbiddenResultHandler`).
- `src/core/interceptors/api.interceptor.ts` surfaces toast messages via `resolveForbiddenMessage()` in `src/core/auth/permission-denied.util.ts`.

Ensure new API paths are recognizable by the interceptor or return a `detail` body from the API.

---

## Naming alignment checklist

Use the **exact same strings** everywhere:

| Location | Example |
|----------|---------|
| DB `permissions.name` | `products_view` |
| BE `PermissionNames.cs` | `products_view` |
| BE `.RequirePermission(...)` | `products_view` |
| FE route `data.permissions` | `products_access` |
| FE `hasPermission(...)` | `products_view` |
| DB `navigation_items.resource` | `products` |
| DB `resources.name` | `products` |

---

## End-to-end checklist

### Backend (see `KyawHlaing/docs/AddingAdminModule.md`)

- [ ] Module endpoints live and protected with `RequirePermission`
- [ ] Resource + five permissions exist
- [ ] Navigation row with matching `route` and `resource`
- [ ] Test role has `products_access` (+ view/create/edit/delete)

### Frontend

- [ ] `src/types/` models match API
- [ ] `src/features/admin/<feature>/` store + component
- [ ] Route in `app.routes.ts` with `{resource}_access`
- [ ] `canView` / `canCreate` / `canEdit` / `canDelete` wired in template
- [ ] `pnpm run build` succeeds
- [ ] Manual test: sidebar visible, route works, APIs succeed for granted permissions, 403 toast when denied

---

## Reference files

| Purpose | Path |
|---------|------|
| Routes + guards | `src/app/app.routes.ts`, `src/core/guards/auth.guard.ts` |
| Auth / permissions | `src/core/stores/auth-store.ts` |
| Sidebar | `src/core/nav/nav-menu.service.ts`, `nav-menu.util.ts` |
| Simple admin CRUD | `src/features/admin/resources/` |
| Full admin CRUD | `src/features/admin/users/` |
| System defaults | `src/core/auth/system-defaults.util.ts` |
| Resource naming | `src/core/auth/resource-naming.util.ts` |
| API integration | `docs/BackendAPIIntegration.md` |

---

## Related docs

- `docs/DeveloperGuide.md` — general Angular feature patterns
- `docs/BackendAPIIntegration.md` — JWT, proxy, CORS
- `KyawHlaing/docs/AddingAdminModule.md` — backend module and IAM seeding
- `KyawHlaing/AGENTs.md` — modulith architecture and endpoint rules
