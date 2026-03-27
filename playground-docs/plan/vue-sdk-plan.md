# Vue.js SDK for Asgardeo — Detailed Implementation Plan

**Package:** `@asgardeo/vue`
**Layer:** Core Lib SDK (extends Browser SDK / Platform SDK)
**Reference Implementation:** `@asgardeo/react` (v0.14.3)
**Specification:** WSO2 IAM SDK Specification v1.0.0-draft
**Date:** 2026-03-12

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Current State Analysis](#2-current-state-analysis)
- [3. Architecture & Design](#3-architecture--design)
- [4. Project Setup & Configuration](#4-project-setup--configuration)
- [5. Phase 1 — Core Authentication Layer](#5-phase-1--core-authentication-layer)
- [6. Phase 2 — Composables & Reactive State](#6-phase-2--composables--reactive-state)
- [7. Phase 3 — UI Components](#7-phase-3--ui-components)
- [8. Phase 4 — Advanced Features](#8-phase-4--advanced-features)
- [9. Phase 5 — Testing, Docs & Release](#9-phase-5--testing-docs--release)
- [10. File & Directory Structure](#10-file--directory-structure)
- [11. API Surface Reference](#11-api-surface-reference)
- [12. Dependencies](#12-dependencies)
- [13. Risks & Mitigations](#13-risks--mitigations)
- [14. Appendix: React ↔ Vue Mapping](#14-appendix-react--vue-mapping)

---

## 1. Executive Summary

This plan details the implementation of the `@asgardeo/vue` SDK — a modern, specification-compliant Core Lib SDK built on `@asgardeo/browser` (Platform SDK). The SDK will:

- Follow the **four-layer architecture** defined in the IAM SDK specification
- Use `@asgardeo/browser` as its parent layer dependency
- Provide Vue 3 **Composition API** primitives (composables, plugins, `provide`/`inject`)
- Ship a full set of **UI components** (styled + unstyled Base variants) matching the React SDK's component library
- Support both **Redirect-Based** and **App-Native (Embedded)** authentication modes
- Support i18n, theming, branding, and organization management
- Use the same build tooling (esbuild) as other SDK packages in the monorepo

---

## 2. Design Reference

### 2.1 Key Differences: React SDK → Vue SDK

| React Pattern | Vue 3 Equivalent |
|--------------|-----------------|
| `createContext()` + `useContext()` | `provide()` / `inject()` with `InjectionKey` |
| `useState()` | `ref()` / `reactive()` |
| `useEffect()` | `onMounted()`, `onUnmounted()`, `watch()`, `watchEffect()` |
| `useMemo()` / `useCallback()` | `computed()` / plain functions (no hook rules in Vue) |
| `useRef()` | `ref()` (template refs) or plain variables |
| `<Context.Provider value={...}>` | `provide(key, value)` inside `setup()` |
| JSX components (`FC<Props>`) | SFCs (`.vue` files) or functional render components |
| `PropsWithChildren` | `<slot>` (default slot) |
| Conditional rendering `{condition && <Child />}` | `v-if` directive or `<slot>` |

---

## 3. Architecture & Design

### 3.1 Layer Positioning

```
┌─────────────────────────────────────────────────┐
│ @asgardeo/nuxt (Framework Specific SDK)         │  ← Nuxt.js integration (SSR, file routing)
├─────────────────────────────────────────────────┤
│ @asgardeo/vue (Core Lib SDK) ← THIS PLAN       │  ← Vue 3 composables, plugin, UI components
├─────────────────────────────────────────────────┤
│ @asgardeo/browser (Platform SDK)                │  ← Browser storage, crypto, redirect handling
├─────────────────────────────────────────────────┤
│ @asgardeo/javascript (Agnostic SDK)             │  ← IAMClient, OAuth2/OIDC protocol, JWT
└─────────────────────────────────────────────────┘
```

### 3.2 Component Architecture

The Vue SDK will follow the same provider hierarchy as the React SDK, translated to Vue's `provide`/`inject` system:

```
AsgardeoPlugin (app.use())
  └── provide(AsgardeoKey)           ← Core auth state & methods
      └── provide(I18nKey)           ← i18n context
          └── provide(FlowMetaKey)   ← Flow metadata
              └── provide(BrandingKey)  ← Branding preferences
                  └── provide(ThemeKey)    ← Theme context
                      └── provide(FlowKey)     ← Embedded flow state
                          └── provide(UserKey)     ← User profile
                              └── provide(OrgKey)      ← Organization context
```

In Vue, this nesting will be achieved through a **root component** (`<AsgardeoProvider>`) that wraps the application's default slot. The plugin's `install()` method will mount this provider structure.

### 3.3 Client Class

```typescript
// AsgardeoVueClient extends AsgardeoBrowserClient (same pattern as React)
class AsgardeoVueClient<T extends AsgardeoVueConfig = AsgardeoVueConfig>
  extends AsgardeoBrowserClient<T> {
  // Overrides: initialize, signIn, signOut, signUp,
  //            getUser, getUserProfile, getMyOrganizations,
  //            getAllOrganizations, getCurrentOrganization,
  //            switchOrganization, exchangeToken, etc.
}
```

### 3.4 State Management Strategy

Vue's reactivity system will be leveraged throughout:

| State Category | Reactive Primitive | Scope |
|---------------|-------------------|-------|
| Auth state (`isSignedIn`, `isLoading`, `isInitialized`) | `ref<boolean>()` | AsgardeoProvider |
| Current user | `shallowRef<User \| null>()` | AsgardeoProvider |
| User profile | `shallowRef<UserProfile \| null>()` | UserProvider |
| Current organization | `shallowRef<Organization \| null>()` | OrganizationProvider |
| My organizations | `shallowRef<Organization[]>()` | OrganizationProvider |
| Flow state | `ref()` / `reactive()` | FlowProvider |
| Theme | `reactive()` | ThemeProvider |
| Branding | `shallowRef()` | BrandingProvider |
| i18n | `reactive()` | I18nProvider |

Using `shallowRef` for complex objects avoids deep reactivity overhead while still triggering re-renders when the reference changes.

---

## 4. Project Setup & Configuration

### 4.1 Update `package.json`

Replace the entire `package.json` with a modernized version:

```jsonc
{
  "name": "@asgardeo/vue",
  "version": "1.0.0",
  "description": "Vue 3 SDK for Asgardeo - Authentication and Identity Management",
  "type": "module",
  "main": "dist/cjs/index.cjs",
  "module": "dist/esm/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/esm/index.mjs",
      "require": "./dist/cjs/index.cjs"
    }
  },
  "files": ["dist", "LICENSE", "README.md"],
  "scripts": {
    "build": "node esbuild.config.mjs",
    "dev": "node esbuild.config.mjs --watch",
    "lint": "eslint src/ --ext .ts,.vue",
    "lint:fix": "eslint src/ --ext .ts,.vue --fix",
    "typecheck": "vue-tsc --noEmit",
    "test": "vitest --passWithNoTests",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@asgardeo/browser": "workspace:*",
    "@asgardeo/i18n": "workspace:*"
  },
  "peerDependencies": {
    "vue": ">=3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.0",
    "@vue/test-utils": "^2.4.6",
    "vue": "^3.5.13",
    "vue-tsc": "^2.2.2",
    "vitest": "^3.0.8",
    "typescript": "^5.7.0",
    "esbuild": "^0.25.0",
    "esbuild-plugin-vue3": "^0.4.2"
  },
  "peerDependenciesMeta": {
    "vue": {
      "optional": false
    }
  },
  "publishConfig": {
    "access": "public"
  },
  "license": "Apache-2.0"
}
```

Key points:
- **Dependency**: `@asgardeo/browser: workspace:*` as the parent Platform SDK
- **Dependency**: `@asgardeo/i18n: workspace:*` for i18n support
- **Build**: esbuild (monorepo standard)
- Crypto operations are handled by `@asgardeo/browser`

### 4.2 Build Configuration (`esbuild.config.mjs`)

Create a new esbuild config following the monorepo pattern (reference: `packages/react/esbuild.config.mjs`). The config should:

- Output both ESM (`.mjs`) and CJS (`.cjs`) formats
- Externalize `vue`, `@asgardeo/browser`, `@asgardeo/i18n`
- Generate TypeScript declarations via `vue-tsc` or `tsc`
- Handle `.vue` SFC compilation if SFCs are used (or use pure `.ts` render functions)

### 4.3 TypeScript Configuration

Create/update `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json` aligned with the monorepo pattern.

Key compiler options:
```jsonc
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "declaration": true,
    "declarationDir": "dist",
    "outDir": "dist",
    "types": ["vue/ref-macros"],
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

---

## 5. Phase 1 — Core Authentication Layer

### 5.1 Create `AsgardeoVueClient`

**File:** `src/AsgardeoVueClient.ts`

This class extends `AsgardeoBrowserClient` and mirrors the `AsgardeoReactClient` pattern. It provides the imperative API that all composables and providers will delegate to.

```typescript
import { AsgardeoBrowserClient } from '@asgardeo/browser';
import type { AsgardeoVueConfig } from './models/config';

class AsgardeoVueClient<
  T extends AsgardeoVueConfig = AsgardeoVueConfig
> extends AsgardeoBrowserClient<T> {

  private asgardeo: AuthAPI; // Legacy AuthAPI bridge (same as React)
  private loadingState: boolean = false;
  private clientInstanceId: number;

  constructor(instanceId: number = 0) {
    super();
    this.clientInstanceId = instanceId;
    this.asgardeo = new AuthAPI(undefined, instanceId);
  }

  // Override all methods matching AsgardeoReactClient:
  // initialize(), reInitialize(), signIn(), signOut(), signUp(),
  // getUser(), getUserProfile(), getMyOrganizations(),
  // getAllOrganizations(), getCurrentOrganization(),
  // switchOrganization(), isSignedIn(), isLoading(),
  // getAccessToken(), getDecodedIdToken(), getIdToken(),
  // exchangeToken(), clearSession(), setSession(), decodeJwtToken(),
  // request(), requestAll()
}
```

**Implementation notes:**
- The internal `AuthAPI` bridge is the same legacy `AuthAPI` class used by the React SDK (imported from a shared `__temp__/api` location). This is a temporary measure until the Browser SDK's refactoring is complete.
- The `withLoading()` pattern from the React client should be replicated.
- All method signatures must match the `AsgardeoClient<T>` interface from `@asgardeo/javascript`.

### 5.2 Define Configuration Model

**File:** `src/models/config.ts`

```typescript
import type { AsgardeoBrowserConfig } from '@asgardeo/browser';

export interface AsgardeoVueConfig extends AsgardeoBrowserConfig {
  // Vue-specific config extensions can go here in the future
}
```

### 5.3 Implement the Vue Plugin

**File:** `src/plugins/AsgardeoPlugin.ts`

The plugin follows Vue 3's `Plugin` interface pattern. Per the IAM SDK specification (Section 7.2), initialization happens via `app.use(AsgardeoPlugin, config)`.

```typescript
import type { Plugin, App } from 'vue';
import type { AsgardeoVueConfig } from '../models/config';

export const AsgardeoPlugin: Plugin<AsgardeoVueConfig> = {
  install(app: App, config: AsgardeoVueConfig) {
    // 1. Validate config (throw InvalidConfigurationException on failure)
    // 2. Create AsgardeoVueClient instance
    // 3. Call client.initialize(config)
    // 4. Register the root <AsgardeoProvider> component internally
    //    - provide(ASGARDEO_KEY, ...) with reactive state
    //    - provide(I18N_KEY, ...)
    //    - provide(FLOW_META_KEY, ...)
    //    - provide(BRANDING_KEY, ...)
    //    - provide(THEME_KEY, ...)
    //    - provide(FLOW_KEY, ...)
    //    - provide(USER_KEY, ...)
    //    - provide(ORGANIZATION_KEY, ...)
    // 5. Set up watchers for auth state polling
    // 6. Handle redirect callback if auth params are in URL
  }
};
```

### 5.4 Create `<AsgardeoProvider>` Component

**File:** `src/components/AsgardeoProvider.ts` (render function component, no SFC)

This is the root provider component that sets up all injection contexts. Unlike the plugin (which provides flat injection), this component handles the nested provider hierarchy and lifecycle.

Two approaches are available for providing the contexts:

**Approach A — Plugin-level `provide` (Flat):**
All contexts are provided at plugin install time using `app.provide()`. This is simpler but doesn't support component lifecycle hooks.

**Approach B — Provider Component (Nested, Recommended):**
A `<AsgardeoProvider>` component wraps the app and manages lifecycle via `onMounted`/`onUnmounted`. The plugin registers this component globally.

**Recommended: Approach B** — This mirrors the React pattern and allows lifecycle-dependent state (polling, branding fetch, etc.) to be managed within Vue's component lifecycle.

Usage:
```vue
<!-- App.vue -->
<template>
  <AsgardeoProvider v-bind="config">
    <router-view />
  </AsgardeoProvider>
</template>
```

Or via plugin (auto-wrapping):
```typescript
// main.ts
import { createApp } from 'vue';
import { AsgardeoPlugin } from '@asgardeo/vue';

const app = createApp(App);
app.use(AsgardeoPlugin, {
  baseUrl: 'https://api.asgardeo.io/t/myorg',
  clientId: 'my-client-id',
  afterSignInUrl: 'http://localhost:3000',
  afterSignOutUrl: 'http://localhost:3000',
});
app.mount('#app');
```

### 5.5 Define Injection Keys

**File:** `src/keys.ts`

```typescript
import type { InjectionKey } from 'vue';

export const ASGARDEO_KEY: InjectionKey<AsgardeoContext> = Symbol('asgardeo');
export const USER_KEY: InjectionKey<UserContext> = Symbol('asgardeo-user');
export const ORGANIZATION_KEY: InjectionKey<OrganizationContext> = Symbol('asgardeo-organization');
export const FLOW_KEY: InjectionKey<FlowContext> = Symbol('asgardeo-flow');
export const FLOW_META_KEY: InjectionKey<FlowMetaContext> = Symbol('asgardeo-flow-meta');
export const THEME_KEY: InjectionKey<ThemeContext> = Symbol('asgardeo-theme');
export const BRANDING_KEY: InjectionKey<BrandingContext> = Symbol('asgardeo-branding');
export const I18N_KEY: InjectionKey<I18nContext> = Symbol('asgardeo-i18n');
```

### 5.6 Deliverables for Phase 1

| File | Description |
|------|-------------|
| `src/AsgardeoVueClient.ts` | Client class extending `AsgardeoBrowserClient` |
| `src/models/config.ts` | `AsgardeoVueConfig` type |
| `src/plugins/AsgardeoPlugin.ts` | Vue plugin with `install()` |
| `src/components/AsgardeoProvider.ts` | Root provider component |
| `src/keys.ts` | Typed injection keys |
| `src/index.ts` | Barrel exports |
| `package.json` | Updated dependencies & build scripts |
| `esbuild.config.mjs` | Build configuration |
| `tsconfig.json` / `tsconfig.lib.json` / `tsconfig.spec.json` | TypeScript configs |
| `vitest.config.ts` | Test configuration |

---

## 6. Phase 2 — Composables & Reactive State

### 6.1 Primary Composable: `useAsgardeo()`

**File:** `src/composables/useAsgardeo.ts`

This is the **single cohesive entry point** per the specification (Section 7.3). It injects the `ASGARDEO_KEY` context and returns all auth-related state and methods.

```typescript
export function useAsgardeo(): AsgardeoComposableReturn {
  const ctx = inject(ASGARDEO_KEY);
  if (!ctx) {
    throw new Error(
      '[Asgardeo] useAsgardeo() was called outside of <AsgardeoProvider>. ' +
      'Make sure to install the AsgardeoPlugin or wrap your app with <AsgardeoProvider>.'
    );
  }
  return ctx;
}
```

**Return type (`AsgardeoComposableReturn`):**

```typescript
interface AsgardeoComposableReturn {
  // ── Authentication State (Reactive Refs) ──
  isSignedIn: Readonly<Ref<boolean>>;
  isLoading: Readonly<Ref<boolean>>;
  isInitialized: Readonly<Ref<boolean>>;
  user: Readonly<Ref<User | null>>;

  // ── Auth Actions ──
  signIn: (options?: SignInOptions) => Promise<User>;
  signIn: (payload: EmbeddedSignInFlowHandleRequestPayload, request: EmbeddedFlowExecuteRequestConfig) => Promise<User>;
  signOut: (options?: SignOutOptions) => Promise<string>;
  signUp: (options?: SignUpOptions) => Promise<void>;
  signUp: (payload: EmbeddedFlowExecuteRequestPayload) => Promise<EmbeddedFlowExecuteResponse>;
  signInSilently: (options?: SignInOptions) => Promise<User | boolean>;

  // ── Token ──
  getAccessToken: () => Promise<string>;
  getDecodedIdToken: () => Promise<IdToken>;
  getIdToken: () => Promise<string>;
  exchangeToken: (config: TokenExchangeRequestConfig) => Promise<TokenResponse>;

  // ── Profile ──
  getUserProfile: () => Promise<UserProfile>;
  updateUserProfile: (payload: Record<string, any>) => Promise<User>;

  // ── Organizations ──
  getAllOrganizations: () => Promise<AllOrganizationsApiResponse>;
  getMyOrganizations: () => Promise<Organization[]>;
  getCurrentOrganization: () => Promise<Organization | null>;
  switchOrganization: (org: Organization) => Promise<TokenResponse>;

  // ── HTTP ──
  http: {
    request: (config: HttpRequestConfig) => Promise<HttpResponse>;
    requestAll: (configs: HttpRequestConfig[]) => Promise<HttpResponse[]>;
  };

  // ── Lifecycle ──
  reInitialize: (config: Partial<AsgardeoVueConfig>) => Promise<boolean>;
  clearSession: () => void;
}
```

### 6.2 Secondary Composables

Each secondary composable injects from its dedicated injection key and provides domain-specific reactive state.

#### `useUser()`

**File:** `src/composables/useUser.ts`

```typescript
interface UserComposableReturn {
  profile: Readonly<Ref<UserProfile | null>>;
  flattenedProfile: ComputedRef<User | null>;
  schemas: ComputedRef<Schema[]>;
  updateProfile: (payload: Record<string, any>) => Promise<User>;
  revalidateProfile: () => Promise<void>;
}
```

#### `useOrganization()`

**File:** `src/composables/useOrganization.ts`

```typescript
interface OrganizationComposableReturn {
  myOrganizations: Readonly<Ref<Organization[]>>;
  currentOrganization: Readonly<Ref<Organization | null>>;
  switchOrganization: (org: Organization) => Promise<TokenResponse>;
  getAllOrganizations: (options?: any) => Promise<AllOrganizationsApiResponse>;
  revalidateMyOrganizations: () => Promise<void>;
  createOrganization: (payload: any) => Promise<Organization>;
}
```

#### `useFlow()`

**File:** `src/composables/useFlow.ts`

```typescript
interface FlowComposableReturn {
  currentStep: Readonly<Ref<any>>;
  title: Readonly<Ref<string>>;
  subtitle: Readonly<Ref<string>>;
  messages: Readonly<Ref<any[]>>;
  isLoading: Readonly<Ref<boolean>>;
  error: Readonly<Ref<Error | null>>;
  navigateToFlow: (flow: string) => void;
  addMessage: (msg: any) => void;
  showBackButton: Readonly<Ref<boolean>>;
}
```

#### `useFlowMeta()`

**File:** `src/composables/useFlowMeta.ts`

```typescript
interface FlowMetaComposableReturn {
  meta: Readonly<Ref<FlowMetadataResponse | null>>;
}
```

#### `useTheme()`

**File:** `src/composables/useTheme.ts`

```typescript
interface ThemeComposableReturn {
  theme: Readonly<Ref<ThemeConfig>>;
  colorScheme: Readonly<Ref<'light' | 'dark'>>;
  direction: Readonly<Ref<'ltr' | 'rtl'>>;
  toggleTheme: () => void;
  isBrandingLoading: Readonly<Ref<boolean>>;
}
```

#### `useBranding()`

**File:** `src/composables/useBranding.ts`

```typescript
interface BrandingComposableReturn {
  brandingPreference: Readonly<Ref<BrandingPreference | null>>;
  theme: ComputedRef<ThemeConfig | null>;
  activeTheme: ComputedRef<any>;
  isLoading: Readonly<Ref<boolean>>;
  error: Readonly<Ref<Error | null>>;
  refetch: () => Promise<void>;
}
```

#### `useI18n()`

**File:** `src/composables/useI18n.ts`

```typescript
interface I18nComposableReturn {
  t: (key: string, params?: Record<string, string>) => string;
  currentLanguage: Readonly<Ref<string>>;
  setLanguage: (lang: string) => void;
  bundles: Readonly<Ref<Record<string, I18nBundle>>>;
  fallbackLanguage: string;
  injectBundles: (bundles: Record<string, I18nBundle>) => void;
}
```

### 6.3 Provider Components (Internal)

Each context needs a corresponding provider component that manages the state and provides it via `provide()`. These are **internal** — not exported to application developers.

| Provider Component | Injection Key | Manages |
|-------------------|--------------|---------|
| `AsgardeoProvider` | `ASGARDEO_KEY` | Auth state, client instance, sign-in/out methods |
| `UserProvider` | `USER_KEY` | User profile fetch/update, schema resolution |
| `OrganizationProvider` | `ORGANIZATION_KEY` | Organization list, current org, switching |
| `FlowProvider` | `FLOW_KEY` | Embedded flow step navigation |
| `FlowMetaProvider` | `FLOW_META_KEY` | Flow metadata fetch from `/flow/meta` |
| `ThemeProvider` | `THEME_KEY` | Theme mode detection, CSS variable injection |
| `BrandingProvider` | `BRANDING_KEY` | Branding preference fetch from server |
| `I18nProvider` | `I18N_KEY` | Language resolution, translation function |

Each provider will be implemented as a **functional component** (using `defineComponent` with a `setup()` that calls `provide()`) that renders its default `<slot>`.

### 6.4 Deliverables for Phase 2

| File | Description |
|------|-------------|
| `src/composables/useAsgardeo.ts` | Primary composable |
| `src/composables/useUser.ts` | User profile composable |
| `src/composables/useOrganization.ts` | Organization composable |
| `src/composables/useFlow.ts` | Embedded flow composable |
| `src/composables/useFlowMeta.ts` | Flow metadata composable |
| `src/composables/useTheme.ts` | Theme composable |
| `src/composables/useBranding.ts` | Branding composable |
| `src/composables/useI18n.ts` | Internationalization composable |
| `src/providers/UserProvider.ts` | User context provider |
| `src/providers/OrganizationProvider.ts` | Organization context provider |
| `src/providers/FlowProvider.ts` | Flow context provider |
| `src/providers/FlowMetaProvider.ts` | Flow metadata provider |
| `src/providers/ThemeProvider.ts` | Theme context provider |
| `src/providers/BrandingProvider.ts` | Branding context provider |
| `src/providers/I18nProvider.ts` | i18n context provider |
| `src/models/contexts.ts` | TypeScript interfaces for all context shapes |

---

## 7. Phase 3 — UI Components

### 7.1 Component Architecture

Every non-trivial component follows the **two-layer pattern** from the specification (Section 8.3):

```
Base<ComponentName>    → Unstyled, logic-only (uses <slot> for customization)
<ComponentName>        → Styled wrapper (applies default theme from ThemeProvider)
```

Components will be implemented as **Vue SFC** (`.vue`) files for template + style encapsulation, or as **render function** components where SFC is unnecessary.

### 7.2 Component Categories & List

#### Actions

| Component | Base Variant | Description |
|-----------|-------------|-------------|
| `SignInButton` | `BaseSignInButton` | Triggers `signIn()` on click |
| `SignOutButton` | `BaseSignOutButton` | Triggers `signOut()` on click |
| `SignUpButton` | `BaseSignUpButton` | Triggers `signUp()` on click |

Each action component:
- Injects `useAsgardeo()` internally
- Accepts `options` prop for passing `SignInOptions`/`SignOutOptions`/`SignUpOptions`
- Emits `success` and `error` events
- Renders a `<button>` with a default `<slot>` for custom content

#### Auth Flow

| Component | Description |
|-----------|-------------|
| `Callback` | Rendered at `afterSignInUrl`. Handles OAuth2 code exchange. Shows loading indicator during exchange. |

#### Control / Guard

| Component | Description |
|-----------|-------------|
| `SignedIn` | Renders default `<slot>` only when `isSignedIn` is `true`. Accepts `fallback` slot. |
| `SignedOut` | Renders default `<slot>` only when `isSignedIn` is `false`. Accepts `fallback` slot. |
| `Loading` | Renders default `<slot>` (or built-in spinner) while `isLoading` is `true`. |

Vue-specific pattern:
```vue
<!-- Usage -->
<Loading>
  <SignedIn>
    <Dashboard />
  </SignedIn>
  <SignedOut>
    <LandingPage />
  </SignedOut>
</Loading>
```

Implementation:
```vue
<!-- SignedIn.vue -->
<template>
  <slot v-if="isSignedIn" />
  <slot v-else name="fallback" />
</template>

<script setup lang="ts">
import { useAsgardeo } from '../composables/useAsgardeo';
const { isSignedIn } = useAsgardeo();
</script>
```

#### Presentation Components

**Authentication UI:**

| Component | Base Variant | Description |
|-----------|-------------|-------------|
| `SignIn` | `BaseSignIn` | Full sign-in form. Supports all authenticators, MFA, social. Server-driven in App-Native mode. |
| `SignUp` | `BaseSignUp` | Self-registration form. Dynamic fields from server schema. |
| `AcceptInvite` | `BaseAcceptInvite` | Invitation acceptance UI. Requires `invitationCode` prop. |
| `InviteUser` | `BaseInviteUser` | Admin invite UI. |

**User Management UI:**

| Component | Base Variant | Description |
|-----------|-------------|-------------|
| `User` | `BaseUser` | Read-only user info (name, avatar). |
| `UserDropdown` | `BaseUserDropdown` | Dropdown with user avatar, profile link, sign-out. |
| `UserProfile` | `BaseUserProfile` | Editable profile management (view/update claims, change password). |

**Organization UI:**

| Component | Base Variant | Description |
|-----------|-------------|-------------|
| `Organization` | `BaseOrganization` | Current org display (read-only). |
| `OrganizationList` | `BaseOrganizationList` | List of user's organizations. |
| `OrganizationProfile` | `BaseOrganizationProfile` | Org details view/edit. |
| `OrganizationSwitcher` | `BaseOrganizationSwitcher` | Dropdown to switch organizations. |
| `CreateOrganization` | `BaseCreateOrganization` | New sub-org creation form. |

**Other:**

| Component | Base Variant | Description |
|-----------|-------------|-------------|
| `LanguageSwitcher` | `BaseLanguageSwitcher` | Language selection control. |

#### Social / Adapter Buttons

| Component | Description |
|-----------|-------------|
| `GoogleButton` | Pre-styled Google sign-in button |
| `GitHubButton` | Pre-styled GitHub sign-in button |
| `MicrosoftButton` | Pre-styled Microsoft sign-in button |
| `FacebookButton` | Pre-styled Facebook sign-in button |

### 7.3 Primitive / Base UI Components

Matching the React SDK's primitives library:

| Primitive | Description |
|-----------|-------------|
| `Button` | Themed button with variants |
| `Card` | Container card |
| `Alert` | Status/error messages |
| `OtpField` | OTP input (multi-digit) |
| `TextField` | Text input with label/error |
| `PasswordField` | Password input with visibility toggle |
| `Select` | Dropdown select |
| `DatePicker` | Date selection input |
| `Checkbox` | Checkbox with label |
| `Typography` | Text rendering with theme typography |
| `Divider` | Visual separator |
| `Logo` | Logo with branding support |
| `Spinner` | Loading indicator |
| `Icons` | Icon set |

### 7.4 Styling Strategy

- Use **CSS-in-JS** via `@emotion/css` (matching React SDK) for consistent cross-framework theming, OR
- Use **Vue scoped styles** with CSS custom properties derived from the `ThemeProvider`
- Recommended: **CSS custom properties** approach — more Vue-idiomatic and avoids runtime CSS-in-JS overhead

The `ThemeProvider` will inject CSS variables onto a wrapper element:
```css
.asgardeo-theme {
  --asgardeo-color-primary: #ff7300;
  --asgardeo-color-background: #ffffff;
  --asgardeo-font-family: 'Inter', sans-serif;
  /* ... */
}
```

All styled components read from these variables in their scoped styles.

### 7.5 Deliverables for Phase 3

| Directory | Contents |
|-----------|----------|
| `src/components/actions/` | `SignInButton.vue`, `SignOutButton.vue`, `SignUpButton.vue` + Base variants |
| `src/components/auth/` | `Callback.vue` |
| `src/components/control/` | `SignedIn.vue`, `SignedOut.vue`, `Loading.vue` |
| `src/components/presentation/` | `SignIn.vue`, `SignUp.vue`, `User.vue`, `UserProfile.vue`, `UserDropdown.vue`, `AcceptInvite.vue`, `InviteUser.vue`, `Organization.vue`, `OrganizationList.vue`, `OrganizationProfile.vue`, `OrganizationSwitcher.vue`, `CreateOrganization.vue`, `LanguageSwitcher.vue` + all Base variants |
| `src/components/adapters/` | `GoogleButton.vue`, `GitHubButton.vue`, `MicrosoftButton.vue`, `FacebookButton.vue` |
| `src/components/primitives/` | `Button.vue`, `Card.vue`, `Alert.vue`, `OtpField.vue`, `TextField.vue`, `PasswordField.vue`, `Select.vue`, `DatePicker.vue`, `Checkbox.vue`, `Typography.vue`, `Divider.vue`, `Logo.vue`, `Spinner.vue`, `Icons.vue` |
| `src/components/factories/` | `FieldFactory.ts` — dynamic field renderer based on server schema |

---

## 8. Phase 4 — Advanced Features

### 8.1 Embedded Flow (App-Native Authentication)

The Vue SDK must support the same embedded flow handling as the React SDK:

1. **Redirect-based mode**: Standard OAuth2 Authorization Code + PKCE flow
2. **App-Native mode**: Direct API calls to `/oauth2/authorize` (with `response_mode=direct`) and `/oauth2/authn`
3. **V2 Platform mode**: Flow Execution API (`/api/server/v1/flow/execute`)

Implementation:
- The `FlowProvider` manages embedded flow state (`flowId`, `currentStep`, `flowStatus`)
- The `<SignIn>` and `<SignUp>` components detect the mode and render appropriate UI
- Step types (`AUTHENTICATOR_PROMPT`, `MULTI_OPTIONS_PROMPT`, `VIEW`, `REDIRECTION`, `WEBAUTHN`) are handled by a step renderer
- The `FieldFactory` dynamically creates form fields from server-reported `components`

### 8.2 Session Management

- Polling for sign-in status (matching React's `setInterval` at 1s)
- Silent sign-in via `prompt=none` iframe
- Session sync via OIDC iframe (when `syncSession: true`)
- Auto token refresh with Vue `watchEffect`

### 8.3 Organization Switching

- Token exchange for org-scoped access tokens
- Reactive update of `currentOrganization` after switch
- Re-fetch of user profile and org list after switch
- Support for `organizationChain` config (multi-hop org contexts)

### 8.4 Branding & Theme

- Auto-fetch branding preferences from WSO2 IAM branding API on initialization
- Merge server branding with local `preferences.theme.overrides`
- Support `inheritFromBranding: true/false` toggle
- System theme detection via `matchMedia('(prefers-color-scheme: dark)')`
- Vue `watchEffect` for reactive theme switching

### 8.5 Internationalization (i18n)

- Integration with `@asgardeo/i18n` package
- Language resolution order: URL param → stored preference → browser language → fallback
- Storage strategy: cookie (default), localStorage, or none
- Custom bundle injection via `injectBundles()`
- Reactive language switching via `setLanguage()`

### 8.6 Router Integration Helpers

Provide optional Vue Router integration utilities:

```typescript
// Route guard for protected routes
export function createAsgardeoGuard(options?: GuardOptions): NavigationGuard;

// Callback route helper
export function createCallbackRoute(options?: CallbackRouteOptions): RouteRecordRaw;
```

Usage:
```typescript
import { createAsgardeoGuard, createCallbackRoute } from '@asgardeo/vue';

const router = createRouter({
  routes: [
    createCallbackRoute({ path: '/callback' }),
    {
      path: '/dashboard',
      component: Dashboard,
      beforeEnter: createAsgardeoGuard({ redirectTo: '/login' }),
    },
  ],
});
```

### 8.7 Deliverables for Phase 4

| File | Description |
|------|-------------|
| `src/utils/handleWebAuthnAuthentication.ts` | WebAuthn ceremony handler |
| `src/utils/hasAuthParamsInUrl.ts` | Auth param detection |
| `src/utils/navigate.ts` | Navigation helper |
| `src/router/guard.ts` | Vue Router navigation guard |
| `src/router/callbackRoute.ts` | Callback route factory |
| `src/theme/getActiveTheme.ts` | Theme mode detection |
| `src/theme/themeDetection.ts` | System theme media query listener |

---

## 9. Phase 5 — Testing, Docs & Release

### 9.1 Testing Strategy

| Test Type | Tool | Scope |
|-----------|------|-------|
| Unit tests | Vitest + `@vue/test-utils` | All composables, provider components, client methods |
| Component tests | Vitest + `@vue/test-utils` | All UI components (render, interaction, slot behavior) |
| Integration tests | Vitest | Plugin install → composable usage → state updates |
| E2E tests | Playwright | Full flows (sign-in redirect, embedded flow, org switch) |

Key test scenarios:

1. **Plugin installation**: `app.use(AsgardeoPlugin, config)` provides all injection keys
2. **Composable access**: `useAsgardeo()` throws when called outside provider
3. **Redirect flow**: Initialize → `signIn()` → redirect → callback → `isSignedIn` becomes `true`
4. **Embedded flow**: Initialize → `signIn(payload, request)` → step handling → completion
5. **Token management**: `getAccessToken()` returns valid token; auto-refresh on expiry
6. **Organization switching**: `switchOrganization()` → token exchange → state update
7. **Control components**: `<SignedIn>` renders slot when authenticated, `<SignedOut>` when not
8. **Theme reactivity**: `toggleTheme()` updates CSS variables
9. **i18n**: `setLanguage('fr-FR')` → `t()` returns French translations

### 9.2 Documentation

| Document | Description |
|----------|-------------|
| `README.md` | Quick start, installation, basic usage |
| `QUICKSTART.md` | Step-by-step getting started guide |
| `docs/api-reference.md` | Full API documentation for all composables, components, types |
| `docs/advanced.md` | Embedded flows, org management, custom theming |
| `CHANGELOG.md` | Version history |

### 9.3 Release Checklist

- [ ] All unit tests pass
- [ ] All component tests pass  
- [ ] E2E tests pass for redirect and embedded flows
- [ ] TypeScript declarations are clean (`vue-tsc --noEmit`)
- [ ] Bundle size is acceptable (target: < 50KB gzipped for core, excluding UI components)
- [ ] Tree-shaking verified (unused components are eliminated)
- [ ] README and QUICKSTART are complete
- [ ] API reference documentation is generated
- [ ] CHANGELOG is up to date
- [ ] Security audit passes (`pnpm audit`)
- [ ] Peer dependency range covers Vue 3.5+
- [ ] Published to npm with `@asgardeo/vue` scope

---

## 10. File & Directory Structure

```
packages/vue/
├── .editorconfig
├── .eslintignore
├── .eslintrc.cjs
├── .gitignore
├── .prettierignore
├── CHANGELOG.md
├── esbuild.config.mjs
├── package.json
├── prettier.config.cjs
├── README.md
├── QUICKSTART.md
├── tsconfig.json
├── tsconfig.eslint.json
├── tsconfig.lib.json
├── tsconfig.spec.json
├── vitest.config.ts
└── src/
    ├── index.ts                          # Barrel exports (public API)
    ├── AsgardeoVueClient.ts              # Client extending AsgardeoBrowserClient
    ├── keys.ts                           # InjectionKey definitions
    │
    ├── __temp__/                         # Temporary bridge to AuthAPI
    │   └── api.ts                        # (shared with React SDK until browser refactor)
    │
    ├── api/                              # REST API helpers
    │   ├── getAllOrganizations.ts
    │   ├── getMeOrganizations.ts
    │   ├── getSchemas.ts
    │   ├── getScim2Me.ts
    │   ├── updateMeProfile.ts
    │   └── createOrganization.ts
    │
    ├── composables/                      # Vue composables (public API)
    │   ├── useAsgardeo.ts                # Primary composable
    │   ├── useUser.ts
    │   ├── useOrganization.ts
    │   ├── useFlow.ts
    │   ├── useFlowMeta.ts
    │   ├── useTheme.ts
    │   ├── useBranding.ts
    │   ├── useI18n.ts
    │   ├── useTranslation.ts
    │   └── useBrowserUrl.ts
    │
    ├── providers/                        # Internal provider components
    │   ├── AsgardeoProvider.ts
    │   ├── UserProvider.ts
    │   ├── OrganizationProvider.ts
    │   ├── FlowProvider.ts
    │   ├── FlowMetaProvider.ts
    │   ├── ThemeProvider.ts
    │   ├── BrandingProvider.ts
    │   └── I18nProvider.ts
    │
    ├── plugins/                          # Vue plugin
    │   └── AsgardeoPlugin.ts
    │
    ├── components/                       # UI Components
    │   ├── actions/
    │   │   ├── SignInButton.vue
    │   │   ├── BaseSignInButton.vue
    │   │   ├── SignOutButton.vue
    │   │   ├── BaseSignOutButton.vue
    │   │   ├── SignUpButton.vue
    │   │   └── BaseSignUpButton.vue
    │   ├── adapters/
    │   │   ├── GoogleButton.vue
    │   │   ├── GitHubButton.vue
    │   │   ├── MicrosoftButton.vue
    │   │   └── FacebookButton.vue
    │   ├── auth/
    │   │   └── Callback.vue
    │   ├── control/
    │   │   ├── SignedIn.vue
    │   │   ├── SignedOut.vue
    │   │   └── Loading.vue
    │   ├── presentation/
    │   │   ├── SignIn.vue
    │   │   ├── BaseSignIn.vue
    │   │   ├── SignUp.vue
    │   │   ├── BaseSignUp.vue
    │   │   ├── User.vue
    │   │   ├── BaseUser.vue
    │   │   ├── UserProfile.vue
    │   │   ├── BaseUserProfile.vue
    │   │   ├── UserDropdown.vue
    │   │   ├── BaseUserDropdown.vue
    │   │   ├── AcceptInvite.vue
    │   │   ├── BaseAcceptInvite.vue
    │   │   ├── InviteUser.vue
    │   │   ├── BaseInviteUser.vue
    │   │   ├── Organization.vue
    │   │   ├── BaseOrganization.vue
    │   │   ├── OrganizationList.vue
    │   │   ├── BaseOrganizationList.vue
    │   │   ├── OrganizationProfile.vue
    │   │   ├── BaseOrganizationProfile.vue
    │   │   ├── OrganizationSwitcher.vue
    │   │   ├── BaseOrganizationSwitcher.vue
    │   │   ├── CreateOrganization.vue
    │   │   ├── BaseCreateOrganization.vue
    │   │   ├── LanguageSwitcher.vue
    │   │   └── BaseLanguageSwitcher.vue
    │   ├── primitives/
    │   │   ├── Button.vue
    │   │   ├── Card.vue
    │   │   ├── Alert.vue
    │   │   ├── OtpField.vue
    │   │   ├── TextField.vue
    │   │   ├── PasswordField.vue
    │   │   ├── Select.vue
    │   │   ├── DatePicker.vue
    │   │   ├── Checkbox.vue
    │   │   ├── Typography.vue
    │   │   ├── Divider.vue
    │   │   ├── Logo.vue
    │   │   ├── Spinner.vue
    │   │   └── Icons.ts
    │   └── factories/
    │       └── FieldFactory.ts
    │
    ├── models/                           # TypeScript types
    │   ├── config.ts                     # AsgardeoVueConfig
    │   ├── contexts.ts                   # All context/composable return types
    │   └── adapters.ts                   # Adapter props interfaces
    │
    ├── router/                           # Vue Router integration
    │   ├── guard.ts                      # Navigation guard factory
    │   └── callbackRoute.ts             # Callback route factory
    │
    ├── theme/                            # Theme utilities
    │   ├── getActiveTheme.ts
    │   └── themeDetection.ts
    │
    ├── utils/                            # Utility functions
    │   ├── handleWebAuthnAuthentication.ts
    │   ├── hasAuthParamsInUrl.ts
    │   ├── navigate.ts
    │   └── http.ts
    │
    └── __tests__/                        # Tests
        ├── AsgardeoVueClient.test.ts
        ├── AsgardeoPlugin.test.ts
        ├── composables/
        │   ├── useAsgardeo.test.ts
        │   ├── useUser.test.ts
        │   ├── useOrganization.test.ts
        │   └── ...
        ├── components/
        │   ├── SignedIn.test.ts
        │   ├── SignedOut.test.ts
        │   ├── SignInButton.test.ts
        │   └── ...
        └── providers/
            ├── AsgardeoProvider.test.ts
            └── ...
```

---

## 11. API Surface Reference

### 11.1 Exports from `@asgardeo/vue`

```typescript
// ── Plugin ──
export { AsgardeoPlugin } from './plugins/AsgardeoPlugin';

// ── Provider Component ──
export { AsgardeoProvider } from './providers/AsgardeoProvider';

// ── Composables (Public API) ──
export { useAsgardeo } from './composables/useAsgardeo';
export { useUser } from './composables/useUser';
export { useOrganization } from './composables/useOrganization';
export { useFlow } from './composables/useFlow';
export { useFlowMeta } from './composables/useFlowMeta';
export { useTheme } from './composables/useTheme';
export { useBranding } from './composables/useBranding';
export { useI18n } from './composables/useI18n';

// ── UI Components — Actions ──
export { default as SignInButton } from './components/actions/SignInButton.vue';
export { default as BaseSignInButton } from './components/actions/BaseSignInButton.vue';
export { default as SignOutButton } from './components/actions/SignOutButton.vue';
export { default as BaseSignOutButton } from './components/actions/BaseSignOutButton.vue';
export { default as SignUpButton } from './components/actions/SignUpButton.vue';
export { default as BaseSignUpButton } from './components/actions/BaseSignUpButton.vue';

// ── UI Components — Auth Flow ──
export { default as Callback } from './components/auth/Callback.vue';

// ── UI Components — Control ──
export { default as SignedIn } from './components/control/SignedIn.vue';
export { default as SignedOut } from './components/control/SignedOut.vue';
export { default as Loading } from './components/control/Loading.vue';

// ── UI Components — Presentation ──
export { default as SignIn } from './components/presentation/SignIn.vue';
export { default as BaseSignIn } from './components/presentation/BaseSignIn.vue';
export { default as SignUp } from './components/presentation/SignUp.vue';
export { default as BaseSignUp } from './components/presentation/BaseSignUp.vue';
export { default as User } from './components/presentation/User.vue';
export { default as BaseUser } from './components/presentation/BaseUser.vue';
export { default as UserProfile } from './components/presentation/UserProfile.vue';
export { default as BaseUserProfile } from './components/presentation/BaseUserProfile.vue';
export { default as UserDropdown } from './components/presentation/UserDropdown.vue';
export { default as BaseUserDropdown } from './components/presentation/BaseUserDropdown.vue';
export { default as OrganizationSwitcher } from './components/presentation/OrganizationSwitcher.vue';
export { default as BaseOrganizationSwitcher } from './components/presentation/BaseOrganizationSwitcher.vue';
export { default as OrganizationList } from './components/presentation/OrganizationList.vue';
export { default as BaseOrganizationList } from './components/presentation/BaseOrganizationList.vue';
export { default as CreateOrganization } from './components/presentation/CreateOrganization.vue';
export { default as BaseCreateOrganization } from './components/presentation/BaseCreateOrganization.vue';
export { default as LanguageSwitcher } from './components/presentation/LanguageSwitcher.vue';
export { default as BaseLanguageSwitcher } from './components/presentation/BaseLanguageSwitcher.vue';

// ── UI Components — Adapters ──
export { default as GoogleButton } from './components/adapters/GoogleButton.vue';
export { default as GitHubButton } from './components/adapters/GitHubButton.vue';
export { default as MicrosoftButton } from './components/adapters/MicrosoftButton.vue';
export { default as FacebookButton } from './components/adapters/FacebookButton.vue';

// ── Router Helpers ──
export { createAsgardeoGuard } from './router/guard';
export { createCallbackRoute } from './router/callbackRoute';

// ── Types ──
export type { AsgardeoVueConfig } from './models/config';
export type {
  AsgardeoComposableReturn,
  UserComposableReturn,
  OrganizationComposableReturn,
  FlowComposableReturn,
  FlowMetaComposableReturn,
  ThemeComposableReturn,
  BrandingComposableReturn,
  I18nComposableReturn,
} from './models/contexts';

// ── Re-exports from @asgardeo/browser ──
export type {
  User,
  UserProfile,
  Organization,
  SignInOptions,
  SignOutOptions,
  SignUpOptions,
  IdToken,
  TokenResponse,
  TokenExchangeRequestConfig,
  HttpRequestConfig,
  HttpResponse,
  BrandingPreference,
  EmbeddedFlowExecuteRequestPayload,
  EmbeddedFlowExecuteResponse,
  EmbeddedSignInFlowHandleRequestPayload,
  EmbeddedFlowExecuteRequestConfig,
  FlowMetadataResponse,
} from '@asgardeo/browser';
```

### 11.2 Developer-Facing Usage

#### Basic Sign-In (Redirect Mode)

```typescript
// main.ts
import { createApp } from 'vue';
import { AsgardeoPlugin } from '@asgardeo/vue';
import App from './App.vue';

const app = createApp(App);

app.use(AsgardeoPlugin, {
  baseUrl: 'https://api.asgardeo.io/t/myorg',
  clientId: 'YOUR_CLIENT_ID',
  afterSignInUrl: window.location.origin,
  afterSignOutUrl: window.location.origin,
  scopes: ['openid', 'profile', 'email'],
});

app.mount('#app');
```

```vue
<!-- App.vue -->
<template>
  <Loading>
    <template #default>
      <SignedIn>
        <p>Welcome, {{ user?.displayName }}</p>
        <SignOutButton />
      </SignedIn>
      <SignedOut>
        <SignInButton />
      </SignedOut>
    </template>
  </Loading>
</template>

<script setup lang="ts">
import { useAsgardeo, SignedIn, SignedOut, Loading, SignInButton, SignOutButton } from '@asgardeo/vue';

const { user } = useAsgardeo();
</script>
```

#### Programmatic Sign-In

```vue
<script setup lang="ts">
import { useAsgardeo } from '@asgardeo/vue';

const { signIn, signOut, isSignedIn, user, getAccessToken } = useAsgardeo();

async function handleSignIn() {
  await signIn({ prompt: 'login' });
}

async function callApi() {
  const token = await getAccessToken();
  const response = await fetch('https://api.example.com/data', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
</script>
```

#### Organization Switching

```vue
<script setup lang="ts">
import { useOrganization } from '@asgardeo/vue';

const { myOrganizations, currentOrganization, switchOrganization } = useOrganization();

async function handleSwitch(org) {
  await switchOrganization(org);
}
</script>

<template>
  <div>
    <p>Current: {{ currentOrganization?.name }}</p>
    <ul>
      <li v-for="org in myOrganizations" :key="org.id">
        <button @click="handleSwitch(org)">{{ org.name }}</button>
      </li>
    </ul>
  </div>
</template>
```

#### Embedded (App-Native) Mode

```vue
<template>
  <AsgardeoProvider v-bind="config">
    <SignIn />
  </AsgardeoProvider>
</template>

<script setup lang="ts">
import { AsgardeoProvider, SignIn } from '@asgardeo/vue';

const config = {
  baseUrl: 'https://api.asgardeo.io/t/myorg',
  clientId: 'YOUR_CLIENT_ID',
  afterSignInUrl: window.location.origin,
  platform: 'AsgardeoV2',
  applicationId: 'YOUR_APP_UUID',
};
</script>
```

#### Protected Routes with Vue Router

```typescript
import { createRouter, createWebHistory } from 'vue-router';
import { createAsgardeoGuard, createCallbackRoute } from '@asgardeo/vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    createCallbackRoute({ path: '/callback' }),
    {
      path: '/dashboard',
      component: Dashboard,
      beforeEnter: createAsgardeoGuard({ redirectTo: '/' }),
    },
  ],
});
```

---

## 12. Dependencies

### 12.1 Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@asgardeo/browser` | `workspace:*` | Platform SDK (parent layer) |
| `@asgardeo/i18n` | `workspace:*` | Translation bundles |

### 12.2 Peer Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vue` | `>=3.5.0` | Vue 3 framework |

### 12.3 Dev Dependencies

| Package | Purpose |
|---------|---------|
| `@vue/test-utils` | Component testing |
| `@vitejs/plugin-vue` | Vue SFC compilation |
| `vue-tsc` | TypeScript checking for Vue files |
| `vitest` | Test runner |
| `typescript` | Type checking |
| `esbuild` | Bundling |

### 12.4 Optional Peer Dependencies

| Package | Purpose |
|---------|---------|
| `vue-router` | Required only for `createAsgardeoGuard` and `createCallbackRoute` |

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Browser SDK's `AuthAPI` is temporary** | Vue client depends on the same bridge (`__temp__/api`) as React | Accept this as temporary. Structure the Vue client identically to React so that when `@asgardeo/browser` is fully refactored, the migration is mechanical. |
| **Vue SFC build complexity** | `.vue` files require special compilation in esbuild | Use `esbuild-plugin-vue3` or consider render-function-only components for portability. Alternatively, use Vite for build (since Vue recommends it). |
| **Bundle size with full UI library** | Including all components increases bundle | Ensure tree-shaking works correctly. Export components individually. Consider lazy loading for heavy presentation components. |
| **React SDK is actively evolving** | Parity target is a moving target | Establish a feature matrix checklist and periodically sync. Prioritize core auth functionality first; UI components can follow iteratively. |
| **Nuxt SDK currently bypasses Vue SDK** | Nuxt SDK uses `@asgardeo/node` directly | After Vue SDK is complete, evaluate whether Nuxt SDK should be refactored to build on `@asgardeo/vue` for client-side features while keeping `@asgardeo/node` for server-side. |

---

## 14. Appendix: React ↔ Vue Mapping

### Provider/Context Mapping

| React SDK | Vue SDK |
|-----------|---------|
| `<AsgardeoProvider config={...}>` | `app.use(AsgardeoPlugin, config)` or `<AsgardeoProvider v-bind="config">` |
| `AsgardeoContext` + `createContext()` | `ASGARDEO_KEY` + `provide()` / `inject()` |
| `useAsgardeo()` hook | `useAsgardeo()` composable |
| `<AsgardeoContext.Provider value={...}>` | `provide(ASGARDEO_KEY, ...)` in `setup()` |
| `useContext(AsgardeoContext)` | `inject(ASGARDEO_KEY)` |

### State Management Mapping

| React SDK | Vue SDK |
|-----------|---------|
| `useState<boolean>(false)` | `ref<boolean>(false)` |
| `useState<User \| null>(null)` | `shallowRef<User \| null>(null)` |
| `useMemo(() => value, [deps])` | `computed(() => value)` |
| `useCallback(fn, [deps])` | Plain function (no memoization needed in Vue) |
| `useEffect(() => { ... }, [deps])` | `watch(deps, () => { ... })` or `watchEffect(() => { ... })` |
| `useEffect(() => { ... }, [])` | `onMounted(() => { ... })` |
| `useRef(false)` | `let flag = false` (plain variable in `setup()`) |
| `setInterval` in `useEffect` | `setInterval` in `onMounted` + `clearInterval` in `onUnmounted` |

### Component Mapping

| React Component Pattern | Vue Component Pattern |
|------------------------|----------------------|
| `FC<PropsWithChildren<P>>` | `defineComponent` with `<slot>` |
| `{children}` | `<slot />` |
| `{condition && <Child />}` | `<Child v-if="condition" />` |
| `{condition ? <A /> : <B />}` | `<A v-if="condition" />` `<B v-else />` |
| `useMemo(() => contextValue, [deps])` | `computed(() => contextValue)` or `reactive({})` |
| Event handler `onClick={handler}` | `@click="handler"` |
| `className={styles.container}` | `:class="$style.container"` or scoped styles |
| `style={{ color: 'red' }}` | `:style="{ color: 'red' }"` |

### Lifecycle Mapping

| React SDK Lifecycle | Vue SDK Lifecycle |
|-------------------|------------------|
| `AsgardeoProvider` mount → `useEffect([], ...)` → `initialize()` | `AsgardeoProvider` → `onMounted()` → `initialize()` |
| Polling via `setInterval` in `useEffect` | Polling via `setInterval` in `onMounted` |
| Cleanup via `useEffect` return function | Cleanup via `onUnmounted` |
| Re-render prevention via `useRef` | Not needed (Vue `setup()` runs once) |
| `useMemo` for context value stability | `computed` or `reactive` (Vue tracks dependencies automatically) |

---

## Implementation Priority Order

| Priority | Phase | Description | Dependency |
|----------|-------|-------------|------------|
| **P0** | Phase 1 | Core auth layer (client, plugin, provider, config) | None |
| **P0** | Phase 2.1 | `useAsgardeo()` composable | Phase 1 |
| **P1** | Phase 2.2 | `useUser()`, `useOrganization()` composables | Phase 2.1 |
| **P1** | Phase 3.1 | Control components (`SignedIn`, `SignedOut`, `Loading`) | Phase 2.1 |
| **P1** | Phase 3.2 | Action components (`SignInButton`, `SignOutButton`, `SignUpButton`) | Phase 2.1 |
| **P2** | Phase 2.3 | `useFlow()`, `useFlowMeta()` composables | Phase 2.1 |
| **P2** | Phase 2.4 | `useTheme()`, `useBranding()`, `useI18n()` composables | Phase 2.1 |
| **P2** | Phase 3.3 | Auth flow component (`Callback`) | Phase 2.1 |
| **P2** | Phase 3.4 | Presentation components (SignIn, SignUp, UserProfile, etc.) | Phase 2.3, 2.4 |
| **P2** | Phase 3.5 | Primitive components (Button, TextField, etc.) | Phase 2.4 |
| **P3** | Phase 4.1 | Embedded flow support | Phase 2.3 |
| **P3** | Phase 4.2 | Router integration helpers | Phase 2.1 |
| **P3** | Phase 4.3 | Organization switching | Phase 2.2 |
| **P3** | Phase 4.4 | Branding & theme system | Phase 2.4 |
| **P4** | Phase 5 | Testing, documentation, release | All phases |

---

*End of plan — `@asgardeo/vue` SDK v1.0.0*
