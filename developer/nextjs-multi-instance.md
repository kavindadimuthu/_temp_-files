# Multi-Instance Client Support in the Next.js SDK

> **Status:** Feasibility Analysis & Implementation Design  
> **Target:** `@asgardeo/nextjs`  
> **Related packages:** `@asgardeo/react`, `@asgardeo/node`

---

## 1. The Use Case

In B2B enterprise applications, a single web application often needs to manage **concurrent, isolated authentication sessions** against multiple identity providers or multiple organizational tenants simultaneously. Common scenarios:

- **Super-admin portal:** One section of the app is authenticated as a platform admin (root org), another section as a member of a child organization — both sessions active at the same time.
- **Multi-tenant workspace UI:** A "teamspace" app where a user is simultaneously logged into `acme-corp.myapp.com` context and `beta-org.myapp.com` context in the same browser tab — each with its own access token and organization scope.
- **Partner access:** A user authenticates via two separate Asgardeo instances (or two organizations) and the app exposes both contexts side by side in the UI.

The React SDK already handles this through its `instanceId` prop on `AsgardeoProvider`. The Next.js SDK currently does not, due to its architecture.

---

## 2. How the React SDK Handles Multiple Instances

The React SDK supports multi-instance because it runs entirely in the browser, where **storage is already isolated by namespace**.

```
AsgardeoProvider (instanceId=0)          AsgardeoProvider (instanceId=1)
       |                                         |
AsgardeoReactClient(instanceId=0)    AsgardeoReactClient(instanceId=1)
       |                                         |
  AuthAPI(instanceId=0)                  AuthAPI(instanceId=1)
       |                                         |
AsgardeoSPAClient.getInstance(0)     AsgardeoSPAClient.getInstance(1)
       |                                         |
  sessionStorage["asgardeo_0_*"]       sessionStorage["asgardeo_1_*"]
```

Each `AsgardeoReactClient` is instantiated fresh (not a singleton) with a numeric `instanceId`. The underlying `AsgardeoSPAClient` uses that ID to namespace all browser storage keys, giving full isolation per instance.

```typescript
// packages/react/src/AsgardeoReactClient.ts
constructor(instanceId: number = 0) {
  super();
  this.clientInstanceId = instanceId;
  this.asgardeo = new AuthAPI(undefined, instanceId); // isolated storage
}
```

```tsx
// App can mount two providers with distinct identities
<AsgardeoProvider baseUrl="https://api.asgardeo.io/t/orgA" clientId="clientA" instanceId={0}>
  <AdminSection />
</AsgardeoProvider>

<AsgardeoProvider baseUrl="https://api.asgardeo.io/t/orgB" clientId="clientB" instanceId={1}>
  <MemberSection />
</AsgardeoProvider>
```

The browser's own per-origin storage makes this work naturally. The instances never contend.

---

## 3. What the Next.js SDK Has Today (The Singleton Architecture)

The Next.js SDK was designed around a different constraint: **the server has no per-user global memory**. Authentication state must be carried in HTTP cookies. The current implementation solves this with a single, global singleton client and a single, global session cookie.

### 3.1 The Hard Singleton

```typescript
// packages/nextjs/src/AsgardeoNextClient.ts
class AsgardeoNextClient<T> extends AsgardeoNodeClient<T> {
  private static instance: AsgardeoNextClient<any>; // ← one global instance

  private constructor() {
    this.asgardeo = new LegacyAsgardeoNodeClient(); // one in-memory token store
  }

  public static getInstance<T>(): AsgardeoNextClient<T> {
    if (!AsgardeoNextClient.instance) {
      AsgardeoNextClient.instance = new AsgardeoNextClient<T>();
    }
    return AsgardeoNextClient.instance;
  }
}
```

Every server action, every RSC render, and every middleware call routes through this single instance.

### 3.2 The Global Cookie Names

```typescript
// packages/node/src/constants/CookieConfig.ts
class CookieConfig {
  static readonly SESSION_COOKIE_NAME  = `__asgardeo__session`;
  static readonly TEMP_SESSION_COOKIE_NAME = `__asgardeo__temp.session`;
}
```

```typescript
// packages/nextjs/src/utils/SessionManager.ts
static getSessionCookieName(): string {
  return CookieConfig.SESSION_COOKIE_NAME; // always the same name
}
```

There is only ever one session cookie. A second `AsgardeoServerProvider` mounted with different config would silently overwrite it.

### 3.3 The Action-Singleton Coupling

Every server action is hardcoded to call `AsgardeoNextClient.getInstance()` — the global singleton — with no way to target a different instance:

```typescript
// packages/nextjs/src/server/actions/signInAction.ts
const client: AsgardeoNextClient = AsgardeoNextClient.getInstance();

// packages/nextjs/src/server/actions/getUserAction.ts
const client: AsgardeoNextClient = AsgardeoNextClient.getInstance();

// packages/nextjs/src/server/asgardeo.ts
const client: AsgardeoNextClient = AsgardeoNextClient.getInstance();
```

### 3.4 The `AsgardeoServerProvider` RSC Always Uses the Singleton

```typescript
// packages/nextjs/src/server/AsgardeoProvider.tsx
const AsgardeoServerProvider = async ({ children, ..._config }) => {
  const asgardeoClient: AsgardeoNextClient = AsgardeoNextClient.getInstance(); // ← singleton
  await asgardeoClient.initialize(_config);
  // ...fetches session, user, orgs — all from one global context
};
```

If two `AsgardeoServerProvider` components with different configs are placed anywhere in the app, the second one's `initialize()` call is silently ignored:

```typescript
override async initialize(config: T): Promise<boolean> {
  if (this.isInitialized) {
    return Promise.resolve(true); // ← early exit, ignores second config
  }
  // ...
}
```

---

## 4. Why Multi-Instance Is Hard in Next.js (Root Cause Analysis)

| Dimension | React SDK | Next.js SDK Today |
|---|---|---|
| **Client storage** | Browser `sessionStorage` / `localStorage` (namespaced by `instanceId`) | In-memory server `Map` + HTTP cookies |
| **Session carrier** | Per-storage-key isolation | One global `httpOnly` cookie |
| **Server actions** | N/A (all client-side) | Hardcoded to singleton |
| **Config isolation** | Each `AsgardeoReactClient` holds its own config | One shared `LegacyAsgardeoNodeClient` |
| **React context** | Separate context trees per `AsgardeoProvider` | One `AsgardeoContext` global |

The core challenge is **two constraints that conflict**:

1. **HTTP cookies are per-origin, shared** — a browser sends all matching cookies with every request. You cannot scope a cookie to "only instance 1". You CAN use distinct cookie names.
2. **Server Actions are module-level exports** — Next.js Server Actions cannot be dynamically generated per-instance at module load time. They must be statically importable.

Multi-instance is possible, but it requires a **systematic refactor across 5 layers** of the SDK.

---

## 5. The Feasibility Verdict

> **Yes, it is feasible and implementable without breaking changes to the public API.**

The following design makes multi-instance work in the Next.js SDK by addressing each of the 5 constraint layers.

---

## 6. Proposed Architecture for Multi-Instance Support

### 6.1 Layer 1: Replace the Singleton with a Named Instance Registry

**Current:**
```typescript
private static instance: AsgardeoNextClient<any>;

public static getInstance<T>(): AsgardeoNextClient<T> {
  if (!AsgardeoNextClient.instance) {
    AsgardeoNextClient.instance = new AsgardeoNextClient<T>();
  }
  return AsgardeoNextClient.instance;
}
```

**Proposed:**
```typescript
private static instances: Map<string, AsgardeoNextClient<any>> = new Map();

/** Instance ID for this client. Defaults to 'default' for backward compatibility. */
public readonly instanceId: string;

private constructor(instanceId: string = 'default') {
  super();
  this.instanceId = instanceId;
  this.asgardeo = new LegacyAsgardeoNodeClient();
}

/**
 * Get a named instance of AsgardeoNextClient.
 * Passing no instanceId returns the default instance (backward compatible).
 */
public static getInstance<T extends AsgardeoNextConfig = AsgardeoNextConfig>(
  instanceId: string = 'default',
): AsgardeoNextClient<T> {
  if (!AsgardeoNextClient.instances.has(instanceId)) {
    AsgardeoNextClient.instances.set(instanceId, new AsgardeoNextClient<T>(instanceId));
  }
  return AsgardeoNextClient.instances.get(instanceId) as AsgardeoNextClient<T>;
}

/**
 * Remove a named instance (e.g., on sign-out of that context).
 */
public static removeInstance(instanceId: string): void {
  AsgardeoNextClient.instances.delete(instanceId);
}
```

This is **backward-compatible**: `AsgardeoNextClient.getInstance()` returns the same `'default'` instance as today.

---

### 6.2 Layer 2: Instance-Scoped Cookie Names in `SessionManager`

**Goal:** Each client instance has its own set of cookies, so two concurrent sessions never collide.

**Current:**
```typescript
static getSessionCookieName(): string {
  return CookieConfig.SESSION_COOKIE_NAME; // "__asgardeo__session"
}
```

**Proposed:**
```typescript
static getSessionCookieName(instanceId: string = 'default'): string {
  if (instanceId === 'default') {
    return CookieConfig.SESSION_COOKIE_NAME; // backward compat
  }
  return `${CookieConfig.SESSION_COOKIE_NAME}.${instanceId}`;
  // e.g., "__asgardeo__session.org-admin"
}

static getTempSessionCookieName(instanceId: string = 'default'): string {
  if (instanceId === 'default') {
    return CookieConfig.TEMP_SESSION_COOKIE_NAME;
  }
  return `${CookieConfig.TEMP_SESSION_COOKIE_NAME}.${instanceId}`;
}
```

Result — two concurrent instances would produce these cookies in the browser:
```
__asgardeo__session           ← default instance (existing behavior)
__asgardeo__session.org-admin ← "org-admin" instance
__asgardeo__session.partner   ← "partner" instance
```

---

### 6.3 Layer 3: Instance-Aware Server Actions

Server actions are the trickiest layer because they are statically exported module functions. They cannot be factory-generated per instance at module level.

**Solution:** Add an optional `instanceId` parameter to every server action, defaulting to `'default'`. This is backward-compatible — existing call sites pass nothing and get the existing behavior.

**Pattern (applies to all server actions):**

```typescript
// packages/nextjs/src/server/actions/signInAction.ts
const signInAction = async (
  payload?: EmbeddedSignInFlowHandleRequestPayload,
  request?: EmbeddedFlowExecuteRequestConfig,
  instanceId: string = 'default', // ← NEW parameter
): Promise<{...}> => {
  const client: AsgardeoNextClient = AsgardeoNextClient.getInstance(instanceId);
  const cookieStore = await cookies();

  // Use instance-scoped cookie names
  const sessionCookieName = SessionManager.getSessionCookieName(instanceId);
  const tempCookieName    = SessionManager.getTempSessionCookieName(instanceId);

  const existingSessionToken = cookieStore.get(sessionCookieName)?.value;
  // ...rest of logic unchanged
};
```

```typescript
// packages/nextjs/src/server/actions/getSessionPayload.ts
const getSessionPayload = async (
  instanceId: string = 'default', // ← NEW parameter
): Promise<SessionTokenPayload | undefined> => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SessionManager.getSessionCookieName(instanceId))?.value;
  if (!sessionToken) return undefined;
  try {
    return await SessionManager.verifySessionToken(sessionToken);
  } catch {
    return undefined;
  }
};
```

The same applies to: `getAccessToken`, `signOutAction`, `switchOrganization`, `getUserAction`, `getUserProfileAction`, `getMyOrganizations`, `getCurrentOrganizationAction`, `getAllOrganizations`, `getBrandingPreference`, `handleOAuthCallbackAction`, `isSignedIn`, `getSessionId`, `updateUserProfileAction`.

---

### 6.4 Layer 4: Instance-Aware `AsgardeoServerProvider`

The RSC provider needs an `instanceId` prop. All internal action calls are bound to that `instanceId` before being passed as props to the client provider.

```typescript
// packages/nextjs/src/server/AsgardeoProvider.tsx
export type AsgardeoServerProviderProps = Partial<AsgardeoProviderProps> & {
  clientSecret?: string;
  instanceId?: string; // ← NEW prop
};

const AsgardeoServerProvider = async ({
  children,
  instanceId = 'default', // ← defaults to 'default' for backward compat
  ..._config
}: PropsWithChildren<AsgardeoServerProviderProps>) => {
  const asgardeoClient = AsgardeoNextClient.getInstance(instanceId);

  await asgardeoClient.initialize(_config as AsgardeoNextConfig);

  // All actions now pass the instanceId
  const sessionPayload = await getSessionPayload(instanceId);
  const sessionId      = sessionPayload?.sessionId || (await getSessionId(instanceId)) || '';
  const signedIn       = sessionPayload ? true : await isSignedIn(sessionId, instanceId);

  // ...fetch user, profile, orgs etc. with instanceId

  // Bind actions with instanceId before passing to client provider
  const boundSignIn  = (payload, request) => signInAction(payload, request, instanceId);
  const boundSignOut = ()                  => signOutAction(instanceId);
  const boundSwitch  = (org, sid)          => switchOrganization(org, sid, instanceId);
  // ... etc.

  return (
    <AsgardeoClientProvider
      {...propsFromConfig}
      instanceId={instanceId}   // ← passed to client
      signIn={boundSignIn}
      signOut={boundSignOut}
      switchOrganization={boundSwitch}
      isSignedIn={signedIn}
      user={user}
      // ...rest
    >
      {children}
    </AsgardeoClientProvider>
  );
};
```

---

### 6.5 Layer 5: React Context Isolation in the Client Provider

This is the most subtle layer. Currently one global `AsgardeoContext` exists. If two `AsgardeoClientProvider`s are nested in the same React tree, the inner one shadows the outer one. `useAsgardeo()` would always return the innermost provider's data.

**Solution: Context registry keyed by `instanceId`**

```typescript
// packages/nextjs/src/client/contexts/Asgardeo/AsgardeoContextRegistry.ts
import {createContext} from 'react';
import {AsgardeoContextProps} from './AsgardeoContext';

const contextRegistry = new Map<string, React.Context<AsgardeoContextProps>>();

export function getAsgardeoContext(
  instanceId: string = 'default',
): React.Context<AsgardeoContextProps> {
  if (!contextRegistry.has(instanceId)) {
    contextRegistry.set(instanceId, createContext<AsgardeoContextProps>({} as AsgardeoContextProps));
  }
  return contextRegistry.get(instanceId)!;
}
```

```typescript
// packages/nextjs/src/client/contexts/Asgardeo/AsgardeoProvider.tsx
const AsgardeoClientProvider = ({ instanceId = 'default', ...props }) => {
  const InstanceContext = getAsgardeoContext(instanceId);
  // ...all existing state logic...
  return (
    <InstanceContext.Provider value={contextValue}>
      {children}
    </InstanceContext.Provider>
  );
};
```

```typescript
// packages/nextjs/src/client/contexts/Asgardeo/useAsgardeo.ts
const useAsgardeo = (instanceId: string = 'default'): AsgardeoContextProps => {
  const InstanceContext = getAsgardeoContext(instanceId);
  return useContext(InstanceContext);
};
```

With this, components inside instance A's provider tree call `useAsgardeo('org-admin')` and get that instance's state. Components inside instance B's tree call `useAsgardeo('partner')`. They never interfere.

---

### 6.6 Layer 6: Instance-Aware Middleware

The middleware needs to know which instance to check when protecting routes, OR to check any valid instance.

```typescript
// packages/nextjs/src/server/middleware/asgardeoMiddleware.ts

export type AsgardeoMiddlewareOptions = Partial<AsgardeoNextConfig> & {
  /**
   * Which instance(s) to check for authentication.
   * Defaults to ['default'] for backward compatibility.
   * Pass multiple to require auth from ANY of the listed instances.
   */
  instanceIds?: string[];
};

const hasValidSession = async (
  request: NextRequest,
  instanceIds: string[] = ['default'],
): Promise<boolean> => {
  // Authenticated if ANY of the specified instances has a valid session
  for (const instanceId of instanceIds) {
    try {
      const valid = await hasValidJWTSession(request, instanceId);
      if (valid) return true;
    } catch {
      // continue checking other instances
    }
  }
  return false;
};
```

And in `sessionUtils.ts`, `hasValidSession` accepts an optional `instanceId` to know which cookie to check:

```typescript
export const hasValidSession = async (
  request: NextRequest,
  instanceId: string = 'default',
): Promise<boolean> => {
  const cookieName  = SessionManager.getSessionCookieName(instanceId);
  const sessionToken = request.cookies.get(cookieName)?.value;
  if (!sessionToken) return false;
  await SessionManager.verifySessionToken(sessionToken);
  return true;
};
```

This enables route-level access control per instance:

```typescript
// middleware.ts
const isAdminRoute  = createRouteMatcher(['/admin(.*)']);
const isPartnerRoute = createRouteMatcher(['/partner(.*)']);

export default asgardeoMiddleware(async (asgardeo, req) => {
  if (isAdminRoute(req)) {
    await asgardeo.protectRoute({ instanceId: 'org-admin' });
  }
  if (isPartnerRoute(req)) {
    await asgardeo.protectRoute({ instanceId: 'partner' });
  }
});
```

---

## 7. What the Developer API Looks Like After the Change

### `layout.tsx` — Concurrent multi-org session

```tsx
// app/layout.tsx
import { AsgardeoProvider } from '@asgardeo/nextjs/server';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* Default instance — root org admin context */}
        <AsgardeoProvider
          instanceId="org-admin"
          baseUrl="https://api.asgardeo.io/t/root-org"
          clientId={process.env.NEXT_PUBLIC_ADMIN_CLIENT_ID}
        >
          {/* Partner org context nested independently */}
          <AsgardeoProvider
            instanceId="partner"
            baseUrl="https://api.asgardeo.io/t/partner-org"
            clientId={process.env.NEXT_PUBLIC_PARTNER_CLIENT_ID}
          >
            {children}
          </AsgardeoProvider>
        </AsgardeoProvider>
      </body>
    </html>
  );
}
```

### `dashboard/page.tsx` — Consuming both contexts

```tsx
'use client';
import { useAsgardeo } from '@asgardeo/nextjs';

export default function Dashboard() {
  const adminCtx   = useAsgardeo('org-admin');
  const partnerCtx = useAsgardeo('partner');

  return (
    <div>
      <section>
        <h2>Admin Context</h2>
        <p>Signed in: {adminCtx.isSignedIn ? adminCtx.user?.username : 'No'}</p>
      </section>
      <section>
        <h2>Partner Context</h2>
        <p>Signed in: {partnerCtx.isSignedIn ? partnerCtx.user?.username : 'No'}</p>
      </section>
    </div>
  );
}
```

### `middleware.ts` — Route protection per instance

```typescript
import { asgardeoMiddleware, createRouteMatcher } from '@asgardeo/nextjs/server';

const isAdminRoute   = createRouteMatcher(['/admin(.*)']);
const isPartnerRoute = createRouteMatcher(['/partner(.*)']);

export default asgardeoMiddleware(async (asgardeo, req) => {
  if (isAdminRoute(req))   await asgardeo.protectRoute({ instanceId: 'org-admin' });
  if (isPartnerRoute(req)) await asgardeo.protectRoute({ instanceId: 'partner' });
});
```

---

## 8. What Doesn't Change (Backward Compatibility)

The `instanceId` parameter defaults to `'default'` at every layer:

| API Surface | Before | After |
|---|---|---|
| `AsgardeoNextClient.getInstance()` | Returns singleton | Returns `instances.get('default')` — same instance |
| `AsgardeoProvider` (no `instanceId` prop) | Works | Works — uses `'default'` internally |
| `useAsgardeo()` | Returns default context | Returns `'default'` context — same data |
| `asgardeoMiddleware()` | Checks default cookie | Checks `instanceIds: ['default']` — same cookie |
| Session cookies | `__asgardeo__session` | `__asgardeo__session` — unchanged for default |

Existing applications that use a single `AsgardeoProvider` with no `instanceId` will continue to work exactly as before.

---

## 9. Remaining Constraints and Limitations

### 9.1 Refresh Token Isolation Is Per-Instance But Still In-Memory

Each named instance has its own `LegacyAsgardeoNodeClient` (in-memory `Map`). Refresh tokens are still only in that map. On a serverless cold start, they are lost — per instance. This is the same limitation as the current single-instance SDK. The mitigation (access token embedded in JWT cookie) applies per-instance.

### 9.2 Server Action Signatures Change

All server actions gain an optional `instanceId` trailing parameter. This is additive (non-breaking) but callers that import and call these actions directly (bypassing the provider) need to be updated. Apps that only use the `AsgardeoProvider` + `useAsgardeo` API are unaffected.

### 9.3 `getAsgardeoContext` Must Be Stable Across Renders

The context registry (`Map<string, React.Context>`) is a module-level singleton. In Next.js App Router, this works correctly because module-level state in user code persists across RSC re-renders on the server (it's a server module singleton). On the client, the context registry is recreated when the page loads, which is correct.

**Edge case:** If `instanceId` is a dynamic string (e.g., including a user ID or timestamp), the registry will grow unboundedly. `instanceId` should always be a fixed application-level identifier, not a dynamic value.

### 9.4 Cookie Size

Each instance adds one 200–400 byte JWT to the cookie jar. With 3 concurrent instances that is roughly 600–1200 bytes of cookies — well within the 4096-byte per-cookie limit since each cookie is separate.

### 9.5 The `isInitialized` Guard Per Instance

The current `initialize()` guard is:
```typescript
if (this.isInitialized) {
  return Promise.resolve(true);
}
```
With named instances, this guard is per-instance (each `LegacyAsgardeoNodeClient` is its own object), so it works correctly. The "second call is silently ignored" problem only existed because the singleton was truly global. With named instances, each instance is initialized exactly once with its own config.

---

## 10. Implementation Roadmap

The changes required are surgical and can be done incrementally. Below is a recommended sequence to avoid regressions.

### Phase 1 — Client Registry (No API change, no user impact)
- Modify `AsgardeoNextClient` to use `Map<string, AsgardeoNextClient>` internally
- `getInstance()` with no args returns `instances.get('default')` — identical to today
- Add `instanceId` as a public readonly field on the class

### Phase 2 — Cookie Name Scoping
- Modify `SessionManager.getSessionCookieName(instanceId?)` and `getTempSessionCookieName(instanceId?)`
- Default `instanceId` returns the existing constant name — backward compat
- Add tests verifying default behavior is unchanged

### Phase 3 — Server Action Signatures
- Add optional `instanceId: string = 'default'` as the last parameter to every server action
- Route the client and cookie name lookups through `instanceId`
- All existing call sites pass no `instanceId` — they continue to work

### Phase 4 — `AsgardeoServerProvider` prop
- Add `instanceId?: string` to `AsgardeoServerProviderProps`
- All internal calls use `instanceId`
- Bound action functions created per `instanceId` and passed to `AsgardeoClientProvider`
- Pass `instanceId` prop to `AsgardeoClientProvider`

### Phase 5 — Context Registry and `useAsgardeo`
- Create `AsgardeoContextRegistry.ts`
- Modify `AsgardeoClientProvider` to use `getAsgardeoContext(instanceId)`
- Modify `useAsgardeo` to accept `instanceId` — defaults to `'default'`

### Phase 6 — Middleware `instanceId` Support
- Add `instanceIds?: string[]` to `AsgardeoMiddlewareOptions`
- `hasValidSession` checks all listed instance cookies
- `protectRoute` accepts `instanceId` option

### Phase 7 — Integration Tests
- Test that default behavior (no `instanceId`) is unchanged
- Test two providers with different `instanceIds` render independently
- Test `useAsgardeo('instance-a')` and `useAsgardeo('instance-b')` return independent state
- Test middleware protecting routes per-instance

---

## 11. Files to Modify

| File | Change |
|---|---|
| `packages/nextjs/src/AsgardeoNextClient.ts` | Replace singleton with named instance registry |
| `packages/nextjs/src/utils/SessionManager.ts` | Add `instanceId` to `getSessionCookieName`, `getTempSessionCookieName` |
| `packages/nextjs/src/utils/sessionUtils.ts` | Add `instanceId` to `hasValidSession`, `getSessionFromRequest`, `getSessionIdFromRequest` |
| `packages/nextjs/src/server/AsgardeoProvider.tsx` | Add `instanceId` prop; bind all actions with it |
| `packages/nextjs/src/server/middleware/asgardeoMiddleware.ts` | Add `instanceIds` option; per-instance route protection |
| `packages/nextjs/src/server/actions/signInAction.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/signOutAction.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/getSessionPayload.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/getSessionId.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/getAccessToken.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/isSignedIn.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/getUserAction.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/getUserProfileAction.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/getMyOrganizations.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/getCurrentOrganizationAction.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/getAllOrganizations.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/getBrandingPreference.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/switchOrganization.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/handleOAuthCallbackAction.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/actions/updateUserProfileAction.ts` | Add `instanceId` param |
| `packages/nextjs/src/server/asgardeo.ts` | Add `instanceId` param to all exported functions |
| `packages/nextjs/src/client/contexts/Asgardeo/AsgardeoProvider.tsx` | Use context registry; accept `instanceId` prop |
| `packages/nextjs/src/client/contexts/Asgardeo/useAsgardeo.ts` | Accept optional `instanceId` |
| `packages/nextjs/src/client/contexts/Asgardeo/AsgardeoContext.ts` | Add `instanceId` to context props |
| `packages/nextjs/src/models/config.ts` | (No change needed — config is already per-instance) |

New file to create:

| File | Purpose |
|---|---|
| `packages/nextjs/src/client/contexts/Asgardeo/AsgardeoContextRegistry.ts` | Module-level `Map<string, React.Context>` registry |

---

## 12. Summary

| Question | Answer |
|---|---|
| Is this feasible? | **Yes.** The architecture supports it through a named instance registry. |
| Is it backward compatible? | **Yes.** All `instanceId` parameters default to `'default'`. Existing code changes nothing. |
| What is the core change? | Replace the hard singleton with a `Map<string, AsgardeoNextClient>`. Everything else derives from that. |
| What is the trickiest part? | React context isolation. Solved by a module-level context registry (`Map<string, React.Context>`). |
| What are the limitations? | Refresh tokens still in-memory per instance. `instanceId` must be a static string, not dynamic. |
| How many files change? | ~25 files, all additive changes (new optional parameters). |
| Does middleware need a change? | Yes — to support per-instance route protection and multi-instance session checking. |
