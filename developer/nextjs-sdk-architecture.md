# Asgardeo Next.js SDK — Developer & Contributor Guide

**Package:** `@asgardeo/nextjs`
**Location:** `packages/nextjs/`
**Peer dependencies:** Next.js ≥ 15.3.8, React ≥ 19.1.4

---

## Table of Contents

- [Asgardeo Next.js SDK — Developer \& Contributor Guide](#asgardeo-nextjs-sdk--developer--contributor-guide)
  - [Table of Contents](#table-of-contents)
  - [1. Where This SDK Sits in the Stack](#1-where-this-sdk-sits-in-the-stack)
  - [2. Repository Layout](#2-repository-layout)
  - [3. Architecture Deep-Dive](#3-architecture-deep-dive)
    - [3.1 The Two Rendering Worlds](#31-the-two-rendering-worlds)
    - [3.2 The Singleton Client — `AsgardeoNextClient`](#32-the-singleton-client--asgardeonextclient)
    - [3.3 Session Management](#33-session-management)
      - [Cookie 1: Temporary Session Cookie](#cookie-1-temporary-session-cookie)
      - [Cookie 2: Session Cookie](#cookie-2-session-cookie)
    - [3.4 The Server Provider — `AsgardeoProvider` (RSC)](#34-the-server-provider--asgardeoprovider-rsc)
    - [3.5 The Client Provider — `AsgardeoClientProvider`](#35-the-client-provider--asgardeoclientprovider)
    - [3.6 Server Actions](#36-server-actions)
    - [3.7 Middleware — `asgardeoMiddleware`](#37-middleware--asgardeomiddleware)
    - [3.8 Client Components](#38-client-components)
  - [4. Data Flow: Sign-In End-to-End](#4-data-flow-sign-in-end-to-end)
    - [4.1 Redirect-Based Sign-In](#41-redirect-based-sign-in)
    - [4.2 Embedded (App-Native) Sign-In](#42-embedded-app-native-sign-in)
  - [5. Data Flow: Request Lifecycle](#5-data-flow-request-lifecycle)
  - [6. Configuration](#6-configuration)
    - [6.1 Code-Level Config](#61-code-level-config)
    - [6.2 Environment Variable Fallbacks](#62-environment-variable-fallbacks)
  - [7. Package Exports](#7-package-exports)
  - [8. Key Design Decisions (and Why)](#8-key-design-decisions-and-why)
    - [Why a singleton client?](#why-a-singleton-client)
    - [Why JWT cookies instead of server-session storage?](#why-jwt-cookies-instead-of-server-session-storage)
    - [Why two cookies (temp + session)?](#why-two-cookies-temp--session)
    - [Why does `AsgardeoServerProvider` run on every request?](#why-does-asgardeoserverprovider-run-on-every-request)
    - [Why are Server Actions used instead of API Routes?](#why-are-server-actions-used-instead-of-api-routes)
  - [9. Contributing: Where to Add What](#9-contributing-where-to-add-what)
  - [10. Testing](#10-testing)
  - [11. Building the Package](#11-building-the-package)

---

## 1. Where This SDK Sits in the Stack

The codebase follows a strict four-layer SDK hierarchy. The Next.js SDK sits at the **Framework Specific** layer — the topmost layer — and builds directly on the three layers beneath it:

```
┌─────────────────────────────────────────────────────────────┐
│  @asgardeo/nextjs          Framework Specific Layer         │
│  Next.js App Router · SSR · Server Actions · Middleware     │
├─────────────────────────────────────────────────────────────┤
│  @asgardeo/react           Core Lib Layer                   │
│  AsgardeoProvider · Contexts · UI Components                │
├─────────────────────────────────────────────────────────────┤
│  @asgardeo/node            Platform Layer                   │
│  Server-side sessions · Cookie storage · Node.js runtime   │
├─────────────────────────────────────────────────────────────┤
│  @asgardeo/javascript      Agnostic Layer                   │
│  OAuth2/OIDC protocol · JWT · Token exchange                │
└─────────────────────────────────────────────────────────────┘
```

**What each layer contributes to the Next.js SDK:**

| Package | Contributes |
|---------|-------------|
| `@asgardeo/javascript` | The abstract `AsgardeoJavaScriptClient` base class defining the full `IAMClient` interface. All OAuth2/OIDC protocol logic, PKCE generation, token exchange utilities, embedded flow API calls, SCIM2 API calls. |
| `@asgardeo/node` | `AsgardeoNodeClient` (extends the JS client). The legacy `LegacyAsgardeoNodeClient` that holds in-memory token storage keyed by `sessionId`. Cookie config models. Session ID generation. |
| `@asgardeo/react` | All UI components (`SignIn`, `SignUp`, `UserProfile`, `OrganizationSwitcher`, etc.). All React Contexts (`ThemeProvider`, `I18nProvider`, `FlowProvider`, `UserProvider`, `OrganizationProvider`, `BrandingProvider`). `AsgardeoProviderProps` type. `BaseSignInButton` and all other base unstyled components. |
| `@asgardeo/nextjs` | Everything Next.js-specific: `AsgardeoNextClient` singleton, JWT-based session cookies, Next.js Server Actions, RSC `AsgardeoProvider`, `asgardeoMiddleware`, `createRouteMatcher`, Next.js-aware UI component wrappers, and `useAsgardeo` hook. |

---

## 2. Repository Layout

```
packages/nextjs/src/
│
├── AsgardeoNextClient.ts          ← The singleton client class (most important file)
├── index.ts                       ← Package root export (re-exports server + client)
│
├── models/
│   ├── config.ts                  ← AsgardeoNextConfig type alias
│   └── api.ts                     ← Internal API route path types
│
├── configs/
│   └── InternalAuthAPIRoutesConfig.ts  ← Default internal route paths
│
├── utils/
│   ├── SessionManager.ts          ← JWT session cookie creation/verification (jose)
│   ├── sessionUtils.ts            ← Next.js request-level session helpers
│   ├── decorateConfigWithNextEnv.ts  ← Merges env vars into config object
│   ├── logger.ts                  ← Internal debug/error logger
│   └── generateSessionId.ts       ← (from @asgardeo/node, re-exported)
│
├── server/                        ← Everything here runs on the SERVER only
│   ├── index.ts                   ← server sub-path export
│   ├── asgardeo.ts                ← Convenience async helper for server components
│   ├── AsgardeoProvider.tsx       ← Root RSC provider (async Server Component)
│   │
│   ├── actions/                   ← Next.js Server Actions ('use server')
│   │   ├── signInAction.ts        ← Handles both redirect and embedded sign-in
│   │   ├── signOutAction.ts       ← Revokes tokens, clears cookies
│   │   ├── signUpAction.ts        ← Embedded sign-up flow
│   │   ├── handleOAuthCallbackAction.ts  ← Code exchange after OAuth redirect
│   │   ├── getSessionId.ts        ← Reads session ID from JWT cookie
│   │   ├── getSessionPayload.ts   ← Reads+verifies full JWT session payload
│   │   ├── isSignedIn.ts          ← Checks for valid access token
│   │   ├── getUserAction.ts       ← Fetches user object server-side
│   │   ├── getUserProfileAction.ts
│   │   ├── getBrandingPreference.ts
│   │   ├── getCurrentOrganizationAction.ts
│   │   ├── getMyOrganizations.ts
│   │   ├── getAllOrganizations.ts
│   │   ├── createOrganization.ts
│   │   ├── getOrganizationAction.ts
│   │   ├── switchOrganization.ts
│   │   ├── updateUserProfileAction.ts
│   │   ├── getAccessToken.ts
│   │   └── getClientOrigin.ts
│   │
│   └── middleware/
│       ├── asgardeoMiddleware.ts   ← Next.js edge-compatible middleware factory
│       └── createRouteMatcher.ts  ← Glob pattern → RegExp route matcher
│
└── client/                        ← Everything here runs CLIENT-SIDE ('use client')
    ├── index.ts                   ← client sub-path export
    │
    ├── contexts/
    │   └── Asgardeo/
    │       ├── AsgardeoContext.ts     ← React context definition
    │       ├── AsgardeoProvider.tsx   ← Client-side context provider
    │       └── useAsgardeo.ts         ← The hook developers use
    │
    └── components/
        ├── actions/
        │   ├── SignInButton/          ← Calls signIn server action
        │   ├── SignOutButton/         ← Calls signOut server action
        │   └── SignUpButton/          ← Calls signUp server action
        ├── control/
        │   ├── SignedIn/              ← Renders children only when isSignedIn
        │   ├── SignedOut/             ← Renders children only when !isSignedIn
        │   └── Loading/              ← Renders while isLoading
        └── presentation/
            ├── SignIn/               ← Full sign-in form (re-exports from @asgardeo/react)
            ├── SignUp/               ← Full sign-up form
            ├── User/
            ├── UserDropdown/
            ├── UserProfile/
            ├── Organization/
            ├── OrganizationList/
            ├── OrganizationProfile/
            ├── OrganizationSwitcher/
            └── CreateOrganization/
```

---

## 3. Architecture Deep-Dive

### 3.1 The Two Rendering Worlds

The most important concept in this SDK is that Next.js has **two separate JavaScript runtimes** and the SDK has code in both:

```
┌──────────────────────────────────────────────────────────────────┐
│                        SERVER (Node.js)                          │
│                                                                  │
│  AsgardeoNextClient (singleton)          ← owns token storage    │
│  AsgardeoProvider.tsx (RSC)              ← reads auth state SSR  │
│  Server Actions (signInAction, etc.)     ← mutate session        │
│  SessionManager (JWT cookies)            ← secures session       │
│  asgardeoMiddleware                      ← edge route protection  │
└──────────────────┬───────────────────────────────────────────────┘
                   │  Serializable props only (no functions as-is;
                   │  Server Actions are serialized as references)
┌──────────────────▼───────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│                                                                  │
│  AsgardeoClientProvider ('use client')   ← React context root    │
│  AsgardeoContext                         ← auth state in memory  │
│  useAsgardeo()                           ← hook for components   │
│  SignInButton, SignedIn, etc.            ← React components      │
└──────────────────────────────────────────────────────────────────┘
```

**Critical rule:** The token storage lives entirely on the **server** inside `LegacyAsgardeoNodeClient` (in-memory, keyed by `sessionId`). The browser never receives raw tokens; it only receives a signed JWT cookie that contains the `sessionId` and user metadata. The SDK enforces this boundary through the server action pattern.

---

### 3.2 The Singleton Client — `AsgardeoNextClient`

**File:** `src/AsgardeoNextClient.ts`

`AsgardeoNextClient` is the core of the SDK. It is:
- A **singleton** (one instance per server process lifetime) — `AsgardeoNextClient.getInstance()`
- Extended from `AsgardeoNodeClient` → `AsgardeoJavaScriptClient` (the abstract interface)
- Responsible for **all actual IAM API calls** (sign-in, token exchange, user info, organizations, etc.)

The client maintains an `isInitialized: boolean` flag. Until `initialize()` is called (which happens inside `AsgardeoServerProvider` on every server render), all methods throw a descriptive error.

```
AsgardeoNextClient
    │ extends
    ▼
AsgardeoNodeClient          (@asgardeo/node)
    │ extends
    ▼
AsgardeoJavaScriptClient    (@asgardeo/javascript)
    │ implements
    ▼
AsgardeoClient<T>           (interface — abstract contract)
```

Internally it holds a `LegacyAsgardeoNodeClient` instance (also from `@asgardeo/node`) as a private delegate. The `LegacyAsgardeoNodeClient` manages the per-session token storage (access token, refresh token, ID token) keyed by `sessionId` string. When the Next.js client calls `getAccessToken(sessionId)`, it delegates directly to this legacy client's in-memory store.

**Important overrides in `AsgardeoNextClient`:**

| Override | What it does differently |
|----------|--------------------------|
| `initialize()` | Calls `decorateConfigWithNextEnv()` to merge env vars, derives `organizationHandle` from `baseUrl` if not provided, resolves the server's `origin` URL, disables PKCE flag on the legacy client (PKCE is handled at the server action layer). |
| `getUser()` | First tries SCIM2 `/Me` endpoint with bearer token; falls back to decoding the ID token. |
| `getUserProfile()` | Same SCIM2 → ID token fallback pattern. |
| `updateUserProfile()` | Calls SCIM2 PATCH via `updateMeProfile()` from `@asgardeo/javascript`. |
| `reInitialize()` | Delegates to legacy client; used for organization switching. |

---

### 3.3 Session Management

**Files:** `src/utils/SessionManager.ts`, `src/utils/sessionUtils.ts`

The SDK uses **two HttpOnly cookie types** to track authentication state, both signed as JWTs using the `ASGARDEO_SECRET` environment variable (via the `jose` library):

#### Cookie 1: Temporary Session Cookie
- **Name:** retrieved via `SessionManager.getTempSessionCookieName()`
- **Lifetime:** 15 minutes
- **Purpose:** Bridges the gap between sign-in initiation and OAuth callback. When a user clicks "Sign In", a `sessionId` is generated and stored here before redirecting to the IdP. On callback, this cookie is read to retrieve the correct `sessionId` to associate the token response with.
- **Payload:** `{ sessionId: string, type: "temp" }`

#### Cookie 2: Session Cookie
- **Name:** retrieved via `SessionManager.getSessionCookieName()`
- **Lifetime:** Matches the access token expiry (default 1 hour)
- **Purpose:** Proves the user is authenticated and carries metadata needed for server renders without a database lookup.
- **Payload:** `{ sub: string, sessionId: string, scopes: string, organizationId?: string, accessToken: string, type: "session" }`

**Why JWT cookies instead of server-side session storage?**
Next.js deployments are often stateless (Vercel, containers). The JWT cookie approach means no external session store (Redis, database) is required. The actual tokens are still stored server-side in the `LegacyAsgardeoNodeClient` in-memory store, but the `sessionId` inside the JWT is the key to retrieve them. The JWT just needs to be valid to trust the `sessionId`.

**Session lifecycle:**

```
Sign-In Initiated
      ↓
Generate sessionId → create tmp cookie (JWT, 15 min)
      ↓
OAuth redirect / Embedded flow completes
      ↓
Exchange code for tokens → store in LegacyAsgardeoNodeClient[sessionId]
      ↓
Delete tmp cookie → create session cookie (JWT with sub + sessionId)
      ↓
On each request:
  - Read session cookie
  - Verify JWT signature (ASGARDEO_SECRET)
  - Extract sessionId
  - Call getAccessToken(sessionId) → LegacyAsgardeoNodeClient returns token
      ↓
Sign-Out
  - Call signOut(sessionId) → revoke refresh token at IAM server
  - Delete session cookie + tmp cookie
```

---

### 3.4 The Server Provider — `AsgardeoProvider` (RSC)

**File:** `src/server/AsgardeoProvider.tsx`

This is an `async` React Server Component — it runs on every server request. It is the entry point for the entire SDK from the developer's perspective:

```tsx
// app/layout.tsx (developer's code)
import { AsgardeoProvider } from '@asgardeo/nextjs/server';

export default function RootLayout({ children }) {
  return (
    <AsgardeoProvider config={{ baseUrl: '...', clientId: '...' }}>
      {children}
    </AsgardeoProvider>
  );
}
```

**What it does on every render:**

1. **Initialize** `AsgardeoNextClient` singleton with the provided config (idempotent — skips if already initialized).
2. **Read session** — calls `getSessionPayload()` to verify the JWT session cookie and extract `sessionId`.
3. **Determine `isSignedIn`** — from JWT presence, or by calling `isSignedIn(sessionId)` which checks for a valid access token in the memory store.
4. **Fetch user data server-side** — if signed in, concurrently fetches user, userProfile, currentOrganization, myOrganizations.
5. **Fetch branding** — if `preferences.theme.inheritFromBranding` is not false, fetches the IAM branding preference.
6. **Render `AsgardeoClientProvider`** — passes all the fetched data and Server Action references down to the client-side context as props.

Because this is a Server Component, **all the data fetching happens at request time on the server** — there is no client-side loading state for initial auth data. The `isSignedIn`, `user`, and `userProfile` values are known synchronously by the time React renders on the client.

---

### 3.5 The Client Provider — `AsgardeoClientProvider`

**File:** `src/client/contexts/Asgardeo/AsgardeoProvider.tsx`

This is a `'use client'` React component. It receives all the server-fetched data as props and makes it available to the component tree via `AsgardeoContext`. It also:

- Wraps children with React SDK providers from `@asgardeo/react`: `ThemeProvider`, `I18nProvider`, `BrandingProvider`, `FlowProvider`, `UserProvider`, `OrganizationProvider`.
- Handles client-side OAuth callback processing (watches for `?code=` in URL and calls `handleOAuthCallbackAction`).
- Provides the `useAsgardeo()` hook's data.

**Prop flow from server to client:**

```
AsgardeoServerProvider (RSC)
  └── fetches: user, userProfile, isSignedIn, organizations, branding
  └── passes down: signIn (ServerAction ref), signOut (ref), signUp (ref),
                   handleOAuthCallback (ref), createOrganization (ref),
                   switchOrganization (ref), updateProfile (ref)
      ↓ props
  AsgardeoClientProvider ('use client')
    └── stores in React context
    └── components read via useAsgardeo()
```

---

### 3.6 Server Actions

**Directory:** `src/server/actions/`

All mutations (sign-in, sign-out, profile updates) are **Next.js Server Actions** — functions marked `'use server'` that run on the server but are called from client components. This is how the client side safely performs auth operations without exposing tokens to the browser.

Each action follows the same pattern: call the `AsgardeoNextClient` singleton, read/write the session cookie, and return a serializable result object `{ success: boolean, data?: ..., error?: string }`.

Key actions and their responsibilities:

| Action | Responsibility |
|--------|----------------|
| `signInAction` | If no payload → redirect mode: generates authorize URL and returns it. If payload → embedded mode: drives the multi-step sign-in flow, exchanges the authorization code, creates a JWT session cookie. |
| `signOutAction` | Revokes the refresh token via IAM server, deletes both session cookies. |
| `signUpAction` | Drives the embedded registration flow via the Flow Execution API. |
| `handleOAuthCallbackAction` | Called after OAuth redirect returns. Reads temp session cookie, exchanges `code` for tokens, creates the permanent JWT session cookie. |
| `getSessionPayload` | Reads and verifies the JWT session cookie; returns the decoded payload. |
| `isSignedIn` | Verifies session cookie + checks for valid access token in memory store. |
| `getUserAction` | Fetches SCIM2 user profile using the bearer token from the memory store. |
| `switchOrganization` | Performs RFC 8693 token exchange for org-scoped token; updates session cookie. |

---

### 3.7 Middleware — `asgardeoMiddleware`

**File:** `src/server/middleware/asgardeoMiddleware.ts`

The middleware runs at the **Next.js edge** (before any page renders). It reads the session cookie from the request and provides route protection.

```typescript
// middleware.ts
import { asgardeoMiddleware, createRouteMatcher } from '@asgardeo/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

export default asgardeoMiddleware(async (asgardeo, req) => {
  if (isProtectedRoute(req)) {
    await asgardeo.protectRoute(); // Redirects to signInUrl if not authenticated
  }
});
```

The `asgardeoMiddleware` function:
1. Receives an optional user-provided handler.
2. Builds an `AsgardeoMiddlewareContext` object with `isSignedIn()`, `getSession()`, `getSessionId()`, and `protectRoute()` helpers.
3. Calls the user's handler (if provided) with this context and the `NextRequest`.
4. Returns a `NextResponse`.

> **Important:** The middleware does NOT have access to the `AsgardeoNextClient` singleton because the middleware runs in the Next.js edge runtime, not the Node.js runtime. It only reads cookies and verifies the JWT signature. It cannot call IAM APIs.

`createRouteMatcher` converts glob-style patterns (`/dashboard(.*)`) to `RegExp` objects and returns a function that tests a `NextRequest`'s pathname against them.

---

### 3.8 Client Components

**Directory:** `src/client/components/`

Components are grouped into three categories:

**Actions** (`actions/`) — trigger server actions:
- `SignInButton` — on click, calls `signIn()` from context (the server action reference). In redirect mode, uses the returned `signInUrl` to do a full page navigation. In embedded mode, renders the embedded `<SignIn>` form.
- `SignOutButton` — calls `signOut()`.
- `SignUpButton` — calls `signUp()`.

**Control** (`control/`) — guard components based on auth state:
- `SignedIn` — reads `isSignedIn` from `useAsgardeo()`. Renders `children` if true, `fallback` if false.
- `SignedOut` — inverse of `SignedIn`.
- `Loading` — renders while `isLoading` is true.

**Presentation** (`presentation/`) — display and form UI components. Most are thin wrappers that import the actual implementation from `@asgardeo/react` and wire it to the Next.js context. The Next.js-specific wrappers use `useRouter()` from `next/navigation` instead of `window.location` for navigation.

---

## 4. Data Flow: Sign-In End-to-End

### 4.1 Redirect-Based Sign-In

```
[Browser] User clicks <SignInButton>
    ↓
[Client] useAsgardeo().signIn() called
    ↓
[Server Action] signInAction(undefined, undefined)
    - No payload → redirect mode
    - Generates sessionId (random UUID)
    - Creates temp JWT cookie (15min) with sessionId
    - Calls AsgardeoNextClient.getAuthorizeRequestUrl({}, sessionId)
    - Returns { data: { signInUrl: "https://api.asgardeo.io/oauth2/authorize?..." }, success: true }
    ↓
[Client] Receives signInUrl → router.push(signInUrl)
    ↓
[Browser] Full page redirect to Asgardeo login page
    ↓
[User] Enters credentials, authenticates
    ↓
[Browser] Redirected to afterSignInUrl with ?code=...&state=...
    ↓
[Client] AsgardeoClientProvider detects code+state in URL params
    ↓
[Server Action] handleOAuthCallbackAction(code, state, sessionState)
    - Reads temp cookie → verifies JWT → extracts sessionId
    - Calls LegacyAsgardeoNodeClient.signIn({ code, state, session_state }, {}, sessionId)
    - Exchanges code for tokens (access_token, refresh_token, id_token)
    - Tokens stored in LegacyAsgardeoNodeClient memory store[sessionId]
    - Decodes ID token → extracts sub (userId)
    - Creates permanent JWT session cookie (with sub, sessionId, scopes, accessToken)
    - Deletes temp cookie
    - Returns { success: true, redirectUrl: afterSignInUrl }
    ↓
[Client] router.replace(afterSignInUrl) — removes code/state from URL
    ↓
[Server] Next page render → AsgardeoServerProvider reads JWT cookie → isSignedIn = true
```

### 4.2 Embedded (App-Native) Sign-In

```
[Browser] User enters username/password in <SignIn> component
    ↓
[Client] Form submit → useAsgardeo().signIn(payload, request)
    ↓
[Server Action] signInAction(payload, request)
    - Reads/creates sessionId from temp cookie
    - Calls AsgardeoNextClient.signIn(payload, request, sessionId)
      → delegates to LegacyAsgardeoNodeClient
      → calls POST /oauth2/authorize?response_mode=direct
      → returns { flowStatus: "INCOMPLETE", nextStep: {...} }
    ↓
    IF flowStatus === "INCOMPLETE":
      Returns { data: { ...flowStep }, success: true }
      → Client renders next step UI (MFA prompt, social redirect, etc.)
      → Each step calls signInAction again with new payload
    ↓
    IF flowStatus === "SUCCESS_COMPLETED":
      Calls signIn again with { code, state, session_state } from authData
      → Exchanges code for tokens
      → Creates JWT session cookie
      Returns { data: { afterSignInUrl }, success: true }
    ↓
[Client] router.push(afterSignInUrl)
```

---

## 5. Data Flow: Request Lifecycle

What happens on every server render after the user is authenticated:

```
Browser → GET /dashboard
    ↓
[Middleware] asgardeoMiddleware
    - Reads "asgardeo.session" cookie from request
    - Verifies JWT signature (ASGARDEO_SECRET)
    - If expired or missing + route is protected → redirect to signInUrl
    - If valid → allow request through (NextResponse.next())
    ↓
[Server] app/layout.tsx renders
    ↓
[RSC] AsgardeoServerProvider renders (async)
    - Reads "asgardeo.session" cookie via next/headers cookies()
    - Verifies JWT → extracts { sessionId, sub, organizationId }
    - isSignedIn = true
    - Fetches user, userProfile, organizations, branding (all server-side)
    - Renders AsgardeoClientProvider with prefetched data as props
    ↓
[Client] AsgardeoClientProvider hydrates
    - Stores all prefetched data in React context
    - No loading states for initial auth data (already available)
    ↓
[Components] useAsgardeo() returns pre-populated context
```

---

## 6. Configuration

### 6.1 Code-Level Config

`AsgardeoNextConfig` is a type alias for `AsgardeoNodeConfig` (from `@asgardeo/node`), which in turn extends the base `Config` from `@asgardeo/javascript`. Pass it to `<AsgardeoProvider config={...}>`.

```typescript
import { AsgardeoProvider } from '@asgardeo/nextjs/server';

// app/layout.tsx
<AsgardeoProvider
  baseUrl="https://api.asgardeo.io/t/myorg"
  clientId="xxxxxxxxxxxxxxxxxxx"
  afterSignInUrl="/dashboard"
  afterSignOutUrl="/"
  scopes={["openid", "profile", "email"]}
>
```

### 6.2 Environment Variable Fallbacks

**File:** `src/utils/decorateConfigWithNextEnv.ts`

`decorateConfigWithNextEnv()` is called during `initialize()`. Any config field not provided in code is filled from the corresponding environment variable. This allows zero-config setups:

| Config Field | Environment Variable | Visibility |
|---|---|---|
| `baseUrl` | `NEXT_PUBLIC_ASGARDEO_BASE_URL` | Public (exposed to browser) |
| `clientId` | `NEXT_PUBLIC_ASGARDEO_CLIENT_ID` | Public |
| `clientSecret` | `ASGARDEO_CLIENT_SECRET` | **Server-only** (no `NEXT_PUBLIC_`) |
| `afterSignInUrl` | `NEXT_PUBLIC_ASGARDEO_AFTER_SIGN_IN_URL` | Public |
| `afterSignOutUrl` | `NEXT_PUBLIC_ASGARDEO_AFTER_SIGN_OUT_URL` | Public |
| `signInUrl` | `NEXT_PUBLIC_ASGARDEO_SIGN_IN_URL` | Public |
| `signUpUrl` | `NEXT_PUBLIC_ASGARDEO_SIGN_UP_URL` | Public |
| `scopes` | `NEXT_PUBLIC_ASGARDEO_SCOPES` | Public |
| `applicationId` | `NEXT_PUBLIC_ASGARDEO_APPLICATION_ID` | Public |
| `organizationHandle` | `NEXT_PUBLIC_ASGARDEO_ORGANIZATION_HANDLE` | Public |

Additionally, `ASGARDEO_SECRET` (server-only) is required for JWT session cookie signing in production. If not set, the SDK uses a development fallback and logs a warning.

---

## 7. Package Exports

The package exposes two export paths, mapped in `package.json` `exports`:

```json
{
  ".":         "@asgardeo/nextjs"        // root: imports from both server + client
  "./server":  "@asgardeo/nextjs/server" // server-only: RSC, actions, middleware
}
```

**From `@asgardeo/nextjs`** (root):
```typescript
// The singleton client class (used internally, rarely in app code)
export { AsgardeoNext }

// Sub-path re-exports
export * from './server'   // AsgardeoProvider, asgardeo(), asgardeoMiddleware
export * from './client'   // useAsgardeo, SignIn, SignedIn, etc.
```

**From `@asgardeo/nextjs/server`**:
```typescript
export { asgardeo }              // Convenience helper for Server Components
export { AsgardeoProvider }      // Root RSC provider (<AsgardeoProvider config={...}>)
export { asgardeoMiddleware }    // Middleware factory
export { createRouteMatcher }    // Route pattern utility
```

**From `@asgardeo/nextjs` client exports**:
```typescript
export { useAsgardeo }           // The hook
export { SignIn, SignUp }        // Auth flow forms
export { SignedIn, SignedOut, Loading }  // Guard components
export { SignInButton, SignOutButton, SignUpButton }  // Action buttons
export { User, UserDropdown, UserProfile }
export { Organization, OrganizationList, OrganizationProfile,
         OrganizationSwitcher, CreateOrganization }
```

---

## 8. Key Design Decisions (and Why)

### Why a singleton client?

Next.js server renders can be concurrent (multiple requests at once). A singleton `AsgardeoNextClient` means the OAuth2 configuration is only resolved and validated once per process lifetime, not on every request. Token storage is per-`sessionId` (multi-tenant safe), so a single client instance is not a security concern.

### Why JWT cookies instead of server-session storage?

Stateless deployments (Vercel, Docker without persistent storage) cannot rely on server-side session stores. JWT cookies allow the session to be verified anywhere without a centralized store. The actual tokens remain server-side in memory; only a cryptographically signed reference (the `sessionId`) is sent to the browser.

### Why two cookies (temp + session)?

The OAuth redirect flow is stateful: you need to remember the `sessionId` between the moment the user clicks "Sign In" and the moment the authorization code arrives at the callback URL. The **temp cookie** (15 min) holds this pre-auth `sessionId`. The **session cookie** is only created after successful token exchange, ensuring no session exists for failed or abandoned sign-in attempts.

### Why does `AsgardeoServerProvider` run on every request?

As a Server Component, it is the mechanism for SSR auth data. Running it on every request ensures the auth state (isSignedIn, user, organizations) in the initial render is always accurate. React's built-in caching (via `fetch` deduplication and React cache) prevents redundant API calls within the same render pass.

### Why are Server Actions used instead of API Routes?

Next.js App Router Server Actions are **type-safe, co-located, and require no manual endpoint management**. They run on the server with full access to cookies and the singleton client. They are serializable as references and can be passed as props from Server Components to Client Components — which is exactly how `signIn`, `signOut`, etc. are passed from `AsgardeoServerProvider` to `AsgardeoClientProvider`.

---

## 9. Contributing: Where to Add What

| Task | Where to make changes |
|------|----------------------|
| New server-side auth operation | Add a new file in `src/server/actions/` with `'use server'` directive. Expose it via `AsgardeoServerProvider.tsx` props and wire it into `AsgardeoClientProvider`. |
| New client-side component | Add to `src/client/components/` in the appropriate category (`actions/`, `control/`, `presentation/`). Use `useAsgardeo()` for auth state. Export from `src/client/index.ts`. |
| New config field | Add to `AsgardeoNodeConfig` in `@asgardeo/node` (or base config in `@asgardeo/javascript`). Add the env variable mapping in `src/utils/decorateConfigWithNextEnv.ts`. |
| Change session cookie behavior | Modify `src/utils/SessionManager.ts`. Ensure both the action layer (`signInAction`, `signOutAction`, `handleOAuthCallbackAction`) and the middleware layer (`sessionUtils.ts`) are updated consistently. |
| Change middleware auth logic | Modify `src/server/middleware/asgardeoMiddleware.ts`. The middleware runs in the edge runtime — do not use Node.js-specific APIs here. |
| Add a new IAM API call | Low-level API functions live in `@asgardeo/javascript/src/api/`. Add the fetch function there, then call it from `AsgardeoNextClient` with the bearer token from `getAccessToken(sessionId)`. |
| Extend `useAsgardeo()` return value | Add properties to `AsgardeoContextProps` in `src/client/contexts/Asgardeo/AsgardeoContext.ts`. Populate them in `AsgardeoClientProvider.tsx`. The type is derived from the React SDK's `AsgardeoReactContextProps`. |

---

## 10. Testing

Tests live in `src/server/actions/__tests__/`. The test setup uses `vitest` (configured in `vitest.config.ts`).

Run tests:
```bash
pnpm --filter @asgardeo/nextjs test
```

Since server actions depend on Next.js internals (`next/headers`, `cookies()`), tests mock these using `vitest` module mocks. The `AsgardeoNextClient` singleton is typically reset between tests to avoid state leakage.

When writing tests for new actions:
1. Mock `AsgardeoNextClient.getInstance()` to return a test double.
2. Mock `cookies()` from `next/headers` to return controlled cookie values.
3. Mock `SessionManager` methods to return pre-set JWT payloads.

---

## 11. Building the Package

```bash
# Build (from repo root)
pnpm --filter @asgardeo/nextjs build

# The build script runs:
#   1. node esbuild.config.mjs  → compiles to dist/esm/ and dist/cjs/
#   2. tsc -p tsconfig.lib.json → generates type declarations in dist/types/
```

The `esbuild.config.mjs` uses the `esbuild-plugin-preserve-directives` plugin to retain `'use client'` and `'use server'` directive strings in the compiled output — these are interpreted at runtime by Next.js and must be preserved through the build step.

**tsconfig files:**

| File | Purpose |
|------|---------|
| `tsconfig.json` | Base config for IDE/editor support |
| `tsconfig.lib.json` | Extends base; used for the production build (declaration emit only) |
| `tsconfig.spec.json` | Extends base; used by vitest for test files |
| `tsconfig.eslint.json` | Extends base; includes test files for ESLint type-aware linting |

---

*This guide reflects the SDK as of `@asgardeo/nextjs` v0.1.x targeting Next.js ≥ 15.3.8 and React ≥ 19.1.4.*
