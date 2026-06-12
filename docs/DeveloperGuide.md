# Developer Guide

Welcome to the ng-admin-panel Developer Guide. This document provides a concise, step-by-step process for implementing new features consistently according to our architectural standards.

## Architecture Overview
- **Framework:** Angular v22+ (Standalone-by-default, Zoneless Change Detection)
- **State Management:** NgRx SignalStore & local Signals
- **Styling:** Tailwind CSS v4
- **Mock Backend:** Express Server (`src/server/`)

---

## Step-by-Step Feature Implementation

### Step 1: Define Types and Interfaces
Always start by defining strict TypeScript models for your data. Place them in `src/types/`.

**Example:** `src/types/product.ts`
```typescript
export interface Product {
  id: number;
  name: string;
  price: number;
}
```

### Step 2: Update Mock Backend (Express)
Since the app relies on an Express backend-for-frontend (BFF) for mock data, update the mock database and API endpoints first.

**1. Add Mock Data (`src/server/mock-data.ts`):**
```typescript
export const mockData = {
  // ... existing data arrays
  products: [
    { id: 1, name: 'Laptop', price: 999 }
  ]
};
```

**2. Create Endpoints (`src/server/api.ts`):**
```typescript
apiRouter.get('/products', (req, res) => {
  res.json(mockData.products);
});
```

### Step 3: Create the Feature Store (NgRx SignalStore)
Create a localized feature store to manage state using NgRx SignalStore. Place it within the feature directory `src/features/<feature-name>/<feature-name>-store.ts`.

**Example:** `src/features/products/products-store.ts`
```typescript
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Product } from '../../../types/product';

export const ProductsStore = signalStore(
  withState({ products: [] as Product[], isLoading: false }),
  withMethods((store, http = inject(HttpClient)) => ({
    async loadProducts() {
      patchState(store, { isLoading: true });
      try {
        const products = await lastValueFrom(http.get<Product[]>('/api/products'));
        patchState(store, { products, isLoading: false });
      } catch (err) {
        patchState(store, { isLoading: false });
        console.error('Failed to load products', err);
      }
    }
  }))
);
```

### Step 4: Build the Feature Component
Create the UI components using Zoneless change detection and Tailwind CSS utility classes. Place it in `src/features/<feature-name>/`. Do NOT use `standalone: true` in the decorator.

**Example:** `src/features/products/products.ts`
```typescript
import { Component, inject, OnInit } from '@angular/core';
import { ProductsStore } from './products-store';

@Component({
  selector: 'app-products',
  providers: [ProductsStore],
  template: `
    <div class="p-6 space-y-4">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Products</h1>
      
      @if (store.isLoading()) {
        <p class="text-slate-500">Loading...</p>
      }

      <ul class="space-y-2">
        @for (product of store.products(); track product.id) {
          <li class="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            {{ product.name }} - \${{ product.price }}
          </li>
        }
      </ul>
    </div>
  `
})
export class ProductsComponent implements OnInit {
  protected readonly store = inject(ProductsStore);

  ngOnInit() {
    this.store.loadProducts();
  }
}
```

### Step 5: Configure Routing
Lazy load the new feature component in the application's routing config. Place feature routes in `src/app/app.routes.ts`.

**Example:**
```typescript
export const routes: Routes = [
  {
    path: 'admin',
    component: AdminShellComponent,
    children: [
      // ... existing routes
      {
        path: 'products',
        loadComponent: () => import('../features/products/products').then(m => m.ProductsComponent)
      }
    ]
  }
];
```

---

## Best Practices Checklist
- [ ] **Strict Types:** Always use strict typing; favor `unknown` over `any`.
- [ ] **Modern Angular:** No `standalone: true`, no `@HostBinding`, no `@HostListener`. Use `host` object in `@Component` instead.
- [ ] **Signals API:** Use `input()`, `output()`, and `model()` APIs exclusively instead of decorators.
- [ ] **Control Flow:** Use modern block flow (`@if`, `@for`, `@switch`).
- [ ] **Styling:** Use Tailwind v4 native utility classes (`class.active="isActive()"`). Do not use `ngClass` or `ngStyle`.
- [ ] **SSR Safe:** Protect browser-specific global objects (`window`, `localStorage`) by using `afterNextRender` or `PLATFORM_ID`.

---

## Build & Deployment (SSR)

This application utilizes Angular Server-Side Rendering (SSR) backed by an Express server. To deploy this application to a VPS, you need to run the compiled Express server using Node.js.

### 1. Building for Production

To build the application for production, run:

```bash
npm run build
```

This compiles both the Angular browser bundle and the Node.js server bundle. The output will be located in the `dist/ng-admin-panel/` directory.

### 2. Deploying to a Linux VPS

The recommended way to run the Node.js application in production on Linux is using **PM2** (a production process manager) alongside a reverse proxy like **Nginx**.

**Prerequisites:**
- Node.js (v18+)
- PM2 installed globally (`npm install -g pm2`)
- Nginx installed (`sudo apt install nginx`)

**Deployment Steps:**
1. **Transfer Files:** Copy the compiled `dist/ng-admin-panel/` directory to your Linux server (e.g., `/var/www/ng-admin-panel`).
2. **Start the Server:** Navigate to your project directory and start the Express server using PM2.
   ```bash
   cd /var/www/ng-admin-panel
   pm2 start server/server.mjs --name "ng-admin-panel"
   ```
3. **Persist PM2:** Ensure PM2 restarts automatically on server reboots.
   ```bash
   pm2 save
   pm2 startup
   ```
4. **Configure Nginx:** Create an Nginx server block to proxy traffic to the PM2 service.
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:4000; # Default Angular SSR port
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
5. **Enable and Restart Nginx:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/ng-admin-panel /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```

### 3. Deploying to a Windows Server VPS

On a Windows Server, you have two common approaches: Using PM2 for Windows, or using IIS with `iisnode`. Using PM2 is generally simpler for pure Node apps.

**Approach A: Using PM2 (Recommended)**

**Prerequisites:**
- Node.js (v18+) installed on the server.
- PM2 installed globally (`npm install -g pm2`).
- `pm2-windows-service` installed to run PM2 as a Windows service (`npm install -g pm2-windows-service`).

**Deployment Steps:**
1. **Transfer Files:** Copy the compiled `dist/ng-admin-panel/` directory to your Windows server (e.g., `C:\inetpub\ng-admin-panel`).
2. **Start the Application:**
   Open an Administrator Command Prompt/PowerShell.
   ```powershell
   cd C:\inetpub\ng-admin-panel
   pm2 start server/server.mjs --name "ng-admin-panel"
   ```
3. **Install Windows Service:** Install PM2 as a Windows service so it runs on startup.
   ```powershell
   pm2-service-install -n PM2
   pm2 save
   ```
4. **Expose Port (Optional):** If you are not using a reverse proxy, you will need to open port `4000` in the Windows Firewall. If you are using IIS as a reverse proxy, configure the URL Rewrite module to proxy traffic from port 80/443 to `localhost:4000`.

**Approach B: Using IIS & IISNode**

If you heavily rely on IIS, you can host the SSR server using `iisnode`.
1. Install **IIS**, the **URL Rewrite** module, and **iisnode**.
2. Transfer the `dist/ng-admin-panel/` output to your IIS site folder.
3. Create a `web.config` file in the root of your application folder to intercept traffic and route it through `iisnode` to `server/server.mjs`.

*Note: Since the output is compiled to an `.mjs` ES module, ensure you are running a Node.js version natively supported by your iisnode configuration that supports ES modules.*
