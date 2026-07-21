# KyawHlaing Admin (Role-Based Access Control)

KyawHlaing Admin is a modern, enterprise-grade admin dashboard built with Angular v22+. It implements a comprehensive Role-Based Access Control (RBAC) system natively designed for Server-Side Rendering (SSR).

## Project Overview

This project is engineered with modern web development paradigms:
- **Zoneless Change Detection:** Achieves high performance by relying entirely on Angular Signals rather than Zone.js.
- **State Management:** Uses NgRx SignalStore for global, feature-scoped, and reactive local states.
- **Styling:** Styled exclusively with Tailwind CSS v4, utilizing a sleek, modern UI.
- **Backend-for-Frontend (BFF):** Uses an integrated Express server to provide mock API data, manage JWTs, and handle server-side rendering (SSR).

## Project Structure

The codebase is organized into a strictly typed, feature-driven architecture:

- `src/app/`: Bootstrapping and global configurations (`app.config.ts`, routing).
- `src/core/`: Globally available singletons. Contains functional guards, interceptors, and root-level state stores.
- `src/features/`: Self-contained business domains (e.g., `admin`, `login`, `register`). Features co-locate their UI components, routing, and NgRx SignalStores.
- `src/shared/`: Reusable, stateless UI components that rely entirely on Signal inputs and outputs.
- `src/types/`: Strict TypeScript models and database schemas used across the app.
- `src/server/`: The Express backend implementation (BFF) providing mock data and SSR logic.
- `docs/`: Developer guides and deployment instructions (e.g. `DeveloperGuide.md`, `AddingAdminModule.md`, `BackendAPIIntegration.md`).

## How to Run

### Prerequisites
- Node.js (v24.16.0 or higher)
- pnpm

### Installation
1. Clone the repository and navigate to the project directory:
   ```bash
   cd kyawhlaing-admin
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development Server
To start the local development server (which includes the mock Express API and Angular Dev Server):
```bash
pnpm start
```
*Alternatively, you can run `ng serve`. Navigate to `http://localhost:4200/` in your browser.*

### Building for Production
To build the application for production with SSR:
```bash
pnpm run build
```
The output will be placed in the `dist/kyawhlaing-admin/` directory.

### Serving Production Build
After building, you can serve the production Express server:
```bash
pnpm run serve:ssr:kyawhlaing-admin
```

---
For additional details on feature implementation, adding real APIs, or deploying to a VPS, please refer to the documents in the `docs/` folder.

**Adding a new admin module (FE + BE):** see [`docs/AddingAdminModule.md`](docs/AddingAdminModule.md) and the backend companion [`../KyawHlaing/docs/AddingAdminModule.md`](../KyawHlaing/docs/AddingAdminModule.md).
