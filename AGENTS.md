# AI Agent Instructions: Angular Application Architecture & Standards

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code. When generating code, writing tests, or proposing architectural changes, you MUST strictly adhere to the project structure, technology stack, and coding standards defined below.

## 🛠️ Technology Stack
- **Framework:** Angular v20+ (Standalone-by-default, Zoneless Change Detection)
- **State Management:** NgRx SignalStore (Global, Feature-scoped, and Custom Mixins) & Angular Signals
- **Styling:** Tailwind CSS v4
- **Routing:** Functional Guards, Functional Interceptors, Lazy Loading
- **Rendering:** Server-Side Rendering (SSR) with Express backend-for-frontend (BFF)

---

## 📂 Project Directory Structure & Responsibilities

The application follows a strictly typed, feature-driven architecture. Place all new files in their appropriate domains based on the following rules:

### `src/app/` - Root Application Config
- **Purpose:** Bootstrapping and global configurations.
- **Rules:** - Define global providers (`app.config.ts`) and SSR-specific providers (`app.config.server.ts`).
  - Keep routing definitions clean in `app.routes.ts` and `app.routes.server.ts`. 
  - The root component (`app.ts`, `app.html`) should only handle the router outlet and primary app shell wrapper.

### `src/core/` - Singletons & Infrastructure
- **Purpose:** Globally available services, interceptors, guards, and root-level state.
- **Rules:**
  - **Guards & Interceptors:** Must be written as functional guards/interceptors (not class-based).
  - **Services:** Pure API-fetching services injected at the root (`{ providedIn: 'root' }`).
  - **Stores:** Place global/singleton SignalStores here (e.g., `auth-store.ts`, `presence-store.ts`).
  - **Features (SignalStore Mixins):** Place reusable custom SignalStore features in `core/stores/features/` (e.g., `with-call-state.ts`, `with-local-storage.ts`).

### `src/features/` - Business Domains
- **Purpose:** Self-contained, domain-specific modules. Implement lazy loading for feature routes.
- **Rules:**
  - Co-locate UI components, feature-specific routing, and state management.
  - Feature stores should manage entity lists, pagination buffers, and domain-specific filters. Tie them to the lifecycle of the feature component if they do not need to be singletons.
  - Sub-directories should group related UI components.

### `src/shared/` - Reusable UI & Presentational Components
- **Purpose:** Stateless, dumb components used across multiple features.
- **Rules:**
  - Components here MUST NOT inject `core` stores or services directly. They must rely exclusively on Signal `input()` and `output()`.
  - Keep components small and focused on a single responsibility.

### `src/types/` - TypeScript Models
- **Purpose:** Strict typing for API responses, UI models, and generics.
- **Rules:** Keep types, interfaces, and schemas pure (no business logic or runtime code).

---

## 📜 Coding Standards & Directives

### 1. TypeScript Best Practices
- **Strict Typing:** Use strict type checking.
- **Inference:** Prefer type inference when the type is obvious.
- **Unknown over Any:** Avoid the `any` type; use `unknown` when a type is genuinely uncertain.

### 2. Angular Core Paradigms
- **Dependency Injection:** Use the `inject()` function instead of constructor injection. Design services around a single responsibility.
- **Standalone Default:** You must NOT set `standalone: true` inside Angular decorators. It is the default in Angular v20+. Do not generate or use `NgModules`.
- **Zoneless UI:** The app uses zoneless change detection. Rely entirely on Signals.
- **Host Bindings:** Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead.
- **Inputs/Outputs:** Use the Signal-based `input()`, `output()`, and `model()` APIs instead of decorators.
- **Forms:** Prefer Reactive forms instead of Template-driven ones.
- **Images:** Use `NgOptimizedImage` for all static images (Note: does not work for inline base64 images).
- **Paths:** When using external templates/styles, use paths relative to the component TS file. Prefer inline templates for small components.

### 3. State Management (NgRx SignalStore & Local Signals)
- **Global/Feature State:** Always use **NgRx SignalStore** for complex state. Prefer local/feature providers for stores unless the state strictly needs to be global.
- **Local Component State:** Use basic signals (`signal()`) for localized component state.
- **Derived State:** Use `computed()` for derived state. Keep state transformations pure and predictable.
- **Mutations:** Do NOT use `mutate` on signals; use `update` or `set` instead.

### 4. Templates
- **Simplicity:** Keep templates simple and avoid complex logic.
- **Control Flow:** Use the native built-in control flow (`@if`, `@for`, `@switch`) instead of structural directives (`*ngIf`, `*ngFor`).
- **Bindings:** Do NOT use `ngClass` or `ngStyle`. Use standard `class` and `style` bindings instead (e.g., `[class.active]="isActive()"`).
- **Observables:** Use the `async` pipe to handle observables if interfacing with RxJS.
- **Globals:** Do not assume globals (like `new Date()`, `Math`) are available directly in the template.

### 5. Accessibility (A11y) Requirements
- All generated code MUST pass AXE checks.
- It MUST follow all WCAG AA minimums, specifically regarding:
  - Focus management and trapping (e.g., in dialogs).
  - Proper color contrast ratios.
  - Semantic HTML and appropriate ARIA attributes.

### 6. Server-Side Rendering (SSR) Awareness
- Code running in components or services must be safe for SSR.
- Wrap browser-specific APIs (like `window`, `document`, `localStorage`) with `afterNextRender`, or inject the `PLATFORM_ID` to check if the code is executing on the browser before accessing the DOM.
- The `server.ts` Express setup acts as a Backend-for-Frontend (BFF). Configure API proxies correctly to avoid CORS issues on the client.

### 7. Styling
- Use **Tailwind CSS v4** utility classes exclusively. 
- Avoid writing custom CSS in component style files unless utilizing complex pseudo-selectors or keyframe animations that Tailwind cannot handle cleanly.

### 8. Admin modules (KyawHlaing IAM)
When adding a new **admin console page** that maps to a backend resource and permissions, read **`docs/AddingAdminModule.md`** (and `KyawHlaing/docs/AddingAdminModule.md`). That covers route guards (`{resource}_access`), store API paths, sidebar via `/navigation/sidebar`, and permission-gated UI (`{resource}_view|create|edit|delete`).

When asked to create a new feature, component, or store, analyze the directory structure above and place files in their exact designated locations while strictly adhering to these rules.