# Next.js SDK Multi-Instance Implementation Plan

> **Status:** Implementation Plan  
> **Scope:** `@asgardeo/nextjs` package only — no changes to `@asgardeo/node`, `@asgardeo/javascript`, `@asgardeo/browser`, or `@asgardeo/react`  
> **instanceId type:** `number` (consistent with all upstream SDKs)  
> **Context approach:** Single `AsgardeoContext` with React tree shadowing — NO context registry

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Design Decisions](#2-design-decisions)
3. [File Change Summary](#3-file-change-summary)
4. [Step 1: AsgardeoNextClient — Singleton to Multiton](#step-1)
5. [Step 2: SessionManager — Instance-Scoped Cookie Names](#step-2)
6. [Step 3: sessionUtils — Instance-Aware Session Utilities](#step-3)
7. [Step 4: Server Actions — Thread instanceId Through](#step-4)
8. [Step 5: AsgardeoServerProvider — Accept and Forward instanceId](#step-5)
9. [Step 6: AsgardeoClientProvider — Accept instanceId Prop](#step-6)
10. [Step 7: useAsgardeo — No Changes Needed](#step-7)
11. [Step 8: asgardeo() Helper — Instance-Aware](#step-8)
12. [Step 9: Middleware — Multi-Instance Session Validation](#step-9)
13. [Step 10: Exports and Types](#step-10)
14. [Step 11: Tests](#step-11)
15. [Step 12: Manual Verification Checklist](#step-12)

---

## 1. Architecture Overview

### Current Architecture (Singleton)

```
AsgardeoServerProvider (RSC)
  └─ AsgardeoNextClient.getInstance()          ← single static instance
       └─ new LegacyAsgardeoNodeClient()       ← single node client
  └─ SessionManager.getSessionCookieName()      ← "__asgardeo__session" (hardcoded)
  └─ AsgardeoClientProvider ('use client')
       └─ <AsgardeoContext.Provider value={...}>
            └─ useAsgardeo() → useContext(AsgardeoContext)
```

### Target Architecture (Multiton)

```
<AsgardeoServerProvider instanceId={0} baseUrl="orgA" clientId="...">   ← Instance 0 (default)
  <AdminPanel />  {/* useAsgardeo() → orgA data */}
</AsgardeoServerProvider>

<AsgardeoServerProvider instanceId={1} baseUrl="orgB" clientId="...">   ← Instance 1
  <PartnerPanel /> {/* useAsgardeo() → orgB data */}
</AsgardeoServerProvider>
```

Each `AsgardeoServerProvider` with a different `instanceId`:
- Gets its own `AsgardeoNextClient` from a `Map<number, AsgardeoNextClient>`
- Writes/reads its own session cookie (`__asgardeo__session` for 0, `__asgardeo__session.1` for 1, etc.)
- Creates its own `LegacyAsgardeoNodeClient` internally (already isolated by design)
- Pushes its own data into `<AsgardeoContext.Provider value={...}>`
- Components inside use `useAsgardeo()` (no arguments) — nearest ancestor's data via React context shadowing

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| instanceId type | `number` | Base `Config` type in `@asgardeo/javascript` defines `instanceId?: number`. `AsgardeoServerProviderProps` extends `Partial<AsgardeoProviderProps>` which inherits this type. Using `string` would cause a TypeScript conflict. |
| Default instanceId | `0` | Matches `AsgardeoSPAClient.getInstance(id: number = 0)` in browser SDK. Default instance cookie has no suffix for backward compatibility. |
| Context approach | Single context + shadowing | Same approach as React SDK. `useAsgardeo()` takes no arguments, reads nearest ancestor. No context registry. Accepts limitation: cannot cross-read between provider boundaries. |
| Node SDK | No changes | `LegacyAsgardeoNodeClient` is already a plain non-singleton class. Each `new LegacyAsgardeoNodeClient()` is independent. |
| Cookie naming | `__asgardeo__session` (id=0), `__asgardeo__session.{id}` (id>0) | id=0 has no suffix for backward compatibility with existing single-instance deployments. |
| Server actions | Accept optional `instanceId` parameter | Server actions are closures created per-provider. The `instanceId` is captured at creation time in the server provider. |

---

## 3. File Change Summary

Files are listed in implementation order. Each step modifies one logical unit.

| Step | File | Change Type | Description |
|---|---|---|---|
| 1 | `src/AsgardeoNextClient.ts` | **Modify** | Singleton → Multiton (`Map<number, AsgardeoNextClient>`) |
| 2 | `src/utils/SessionManager.ts` | **Modify** | Cookie name methods accept `instanceId` parameter |
| 3 | `src/utils/sessionUtils.ts` | **Modify** | Session utility functions accept `instanceId` parameter |
| 4a | `src/server/actions/getSessionId.ts` | **Modify** | Accept `instanceId`, use instance-scoped cookie name |
| 4b | `src/server/actions/getSessionPayload.ts` | **Modify** | Accept `instanceId`, use instance-scoped cookie name |
| 4c | `src/server/actions/getAccessToken.ts` | **Modify** | Accept `instanceId`, use instance-scoped cookie name |
| 4d | `src/server/actions/signInAction.ts` | **Modify** | Accept `instanceId`, use instance-scoped cookies and client |
| 4e | `src/server/actions/signOutAction.ts` | **Modify** | Accept `instanceId`, use instance-scoped cookies and client |
| 4f | `src/server/actions/handleOAuthCallbackAction.ts` | **Modify** | Accept `instanceId`, use instance-scoped cookies and client |
| 4g | `src/server/actions/isSignedIn.ts` | **Modify** | Accept `instanceId`, use instance-scoped cookies and client |
| 4h | `src/server/actions/getUserAction.ts` | **Modify** | Accept `instanceId` to `getInstance()` |
| 4i | `src/server/actions/getUserProfileAction.ts` | **Modify** | Accept `instanceId` to `getInstance()` |
| 4j | `src/server/actions/signUpAction.ts` | **Modify** | Accept `instanceId` to `getInstance()` |
| 4k | `src/server/actions/switchOrganization.ts` | **Modify** | Accept `instanceId`, use instance-scoped cookies and client |
| 4l | `src/server/actions/createOrganization.ts` | **Modify** | Accept `instanceId` to `getInstance()` |
| 4m | `src/server/actions/getAllOrganizations.ts` | **Modify** | Accept `instanceId` to `getInstance()` |
| 4n | `src/server/actions/getMyOrganizations.ts` | **Modify** | Accept `instanceId` to `getInstance()` |
| 4o | `src/server/actions/getCurrentOrganizationAction.ts` | **Modify** | Accept `instanceId` to `getInstance()` |
| 4p | `src/server/actions/getOrganizationAction.ts` | **Modify** | Accept `instanceId` to `getInstance()` |
| 4q | `src/server/actions/updateUserProfileAction.ts` | **Modify** | Accept `instanceId` to `getInstance()` |
| 5 | `src/server/AsgardeoProvider.tsx` | **Modify** | Accept `instanceId` prop, create bound server actions |
| 6 | `src/client/contexts/Asgardeo/AsgardeoProvider.tsx` | **Minor** | No structural changes needed — already receives props from server provider |
| 7 | `src/client/contexts/Asgardeo/useAsgardeo.ts` | **None** | No changes — `useAsgardeo()` already uses nearest-ancestor pattern |
| 8 | `src/server/asgardeo.ts` | **Modify** | Accept `instanceId` parameter |
| 9 | `src/server/middleware/asgardeoMiddleware.ts` | **Modify** | Support multi-instance session validation |
| 10 | `src/models/config.ts` | **Optional** | Verify `AsgardeoNextConfig` inherits `instanceId` from upstream |

---

<a id="step-1"></a>
## Step 1: AsgardeoNextClient — Singleton to Multiton

### File: `src/AsgardeoNextClient.ts`

### Prompt for AI Assistant

```
Modify the file `packages/nextjs/src/AsgardeoNextClient.ts` to convert the singleton pattern to a multiton pattern using a Map<number, AsgardeoNextClient>.

CHANGES REQUIRED:

1. Replace the static `instance` field:
   BEFORE:
     private static instance: AsgardeoNextClient<any>;
   AFTER:
     private static instances: Map<number, AsgardeoNextClient<any>> = new Map();

2. Add an `instanceId` field to the class:
     private instanceId: number;

3. Update the private constructor to accept `instanceId`:
   BEFORE:
     private constructor() {
       super();
       this.asgardeo = new LegacyAsgardeoNodeClient();
     }
   AFTER:
     private constructor(instanceId: number = 0) {
       super();
       this.instanceId = instanceId;
       this.asgardeo = new LegacyAsgardeoNodeClient();
     }

4. Update `getInstance()` to accept an `instanceId` parameter:
   BEFORE:
     public static getInstance<T extends AsgardeoNextConfig = AsgardeoNextConfig>(): AsgardeoNextClient<T> {
       if (!AsgardeoNextClient.instance) {
         AsgardeoNextClient.instance = new AsgardeoNextClient<T>();
       }
       return AsgardeoNextClient.instance as AsgardeoNextClient<T>;
     }
   AFTER:
     public static getInstance<T extends AsgardeoNextConfig = AsgardeoNextConfig>(instanceId: number = 0): AsgardeoNextClient<T> {
       if (!AsgardeoNextClient.instances.has(instanceId)) {
         AsgardeoNextClient.instances.set(instanceId, new AsgardeoNextClient<T>(instanceId));
       }
       return AsgardeoNextClient.instances.get(instanceId) as AsgardeoNextClient<T>;
     }

5. Add a getter method to expose the instanceId:
     public getInstanceId(): number {
       return this.instanceId;
     }

6. Add a static `hasInstance()` method:
     public static hasInstance(instanceId: number = 0): boolean {
       return AsgardeoNextClient.instances.has(instanceId);
     }

7. Add a static `destroyInstance()` method:
     public static destroyInstance(instanceId: number = 0): boolean {
       return AsgardeoNextClient.instances.delete(instanceId);
     }

Do NOT change any other methods in the class. All existing methods (initialize, getUser, getUserProfile, signIn, signOut, getAccessToken, etc.) remain unchanged. They already operate on `this.asgardeo` which is instance-specific.
```

### Verification

After this step:
- `AsgardeoNextClient.getInstance()` still works (defaults to `instanceId=0`) — backward compatible
- `AsgardeoNextClient.getInstance(1)` creates a separate instance
- Each instance has its own `LegacyAsgardeoNodeClient` and `isInitialized` state

### Manual Check

```typescript
// This should pass conceptually:
const client0 = AsgardeoNextClient.getInstance(0);
const client1 = AsgardeoNextClient.getInstance(1);
assert(client0 !== client1);
assert(client0.getInstanceId() === 0);
assert(client1.getInstanceId() === 1);
assert(AsgardeoNextClient.getInstance() === client0); // default is 0
```

---

<a id="step-2"></a>
## Step 2: SessionManager — Instance-Scoped Cookie Names

### File: `src/utils/SessionManager.ts`

### Prompt for AI Assistant

```
Modify the file `packages/nextjs/src/utils/SessionManager.ts` to support instance-scoped cookie names.

CHANGES REQUIRED:

1. Update `getSessionCookieName()` to accept an optional `instanceId` parameter:
   BEFORE:
     static getSessionCookieName(): string {
       return CookieConfig.SESSION_COOKIE_NAME;
     }
   AFTER:
     static getSessionCookieName(instanceId: number = 0): string {
       if (instanceId === 0) {
         return CookieConfig.SESSION_COOKIE_NAME;
       }
       return `${CookieConfig.SESSION_COOKIE_NAME}.${instanceId}`;
     }

2. Update `getTempSessionCookieName()` to accept an optional `instanceId` parameter:
   BEFORE:
     static getTempSessionCookieName(): string {
       return CookieConfig.TEMP_SESSION_COOKIE_NAME;
     }
   AFTER:
     static getTempSessionCookieName(instanceId: number = 0): string {
       if (instanceId === 0) {
         return CookieConfig.TEMP_SESSION_COOKIE_NAME;
       }
       return `${CookieConfig.TEMP_SESSION_COOKIE_NAME}.${instanceId}`;
     }

Do NOT change any other methods (createTempSession, createSessionToken, verifySessionToken, verifyTempSession, getSessionCookieOptions, getTempSessionCookieOptions, getSecret). They remain unchanged.

The key backward-compatibility requirement: instanceId=0 returns the SAME cookie name as before (no suffix), so existing single-instance deployments are unaffected.
```

### Verification

After this step:
- `SessionManager.getSessionCookieName()` → `"__asgardeo__session"` (unchanged)
- `SessionManager.getSessionCookieName(0)` → `"__asgardeo__session"` (same)
- `SessionManager.getSessionCookieName(1)` → `"__asgardeo__session.1"`
- `SessionManager.getTempSessionCookieName()` → `"__asgardeo__temp.session"` (unchanged)
- `SessionManager.getTempSessionCookieName(1)` → `"__asgardeo__temp.session.1"`

---

<a id="step-3"></a>
## Step 3: sessionUtils — Instance-Aware Session Utilities

### File: `src/utils/sessionUtils.ts`

### Prompt for AI Assistant

```
Modify the file `packages/nextjs/src/utils/sessionUtils.ts` to accept an optional `instanceId` parameter in all exported functions and pass it to SessionManager cookie name methods.

CHANGES REQUIRED:

1. Update `hasValidSession`:
   BEFORE:
     export const hasValidSession = async (request: NextRequest): Promise<boolean> => {
       try {
         const sessionToken: string | undefined = request.cookies.get(SessionManager.getSessionCookieName())?.value;
   AFTER:
     export const hasValidSession = async (request: NextRequest, instanceId: number = 0): Promise<boolean> => {
       try {
         const sessionToken: string | undefined = request.cookies.get(SessionManager.getSessionCookieName(instanceId))?.value;

2. Update `getSessionFromRequest`:
   BEFORE:
     export const getSessionFromRequest = async (request: NextRequest): Promise<SessionTokenPayload | undefined> => {
       try {
         const sessionToken: string | undefined = request.cookies.get(SessionManager.getSessionCookieName())?.value;
   AFTER:
     export const getSessionFromRequest = async (request: NextRequest, instanceId: number = 0): Promise<SessionTokenPayload | undefined> => {
       try {
         const sessionToken: string | undefined = request.cookies.get(SessionManager.getSessionCookieName(instanceId))?.value;

3. Update `getSessionIdFromRequest`:
   BEFORE:
     export const getSessionIdFromRequest = async (request: NextRequest): Promise<string | undefined> => {
       try {
         const sessionPayload: SessionTokenPayload | undefined = await getSessionFromRequest(request);
   AFTER:
     export const getSessionIdFromRequest = async (request: NextRequest, instanceId: number = 0): Promise<string | undefined> => {
       try {
         const sessionPayload: SessionTokenPayload | undefined = await getSessionFromRequest(request, instanceId);

4. Update `getTempSessionFromRequest`:
   BEFORE:
     export const getTempSessionFromRequest = async (request: NextRequest): Promise<string | undefined> => {
       try {
         const tempToken: string | undefined = request.cookies.get(SessionManager.getTempSessionCookieName())?.value;
   AFTER:
     export const getTempSessionFromRequest = async (request: NextRequest, instanceId: number = 0): Promise<string | undefined> => {
       try {
         const tempToken: string | undefined = request.cookies.get(SessionManager.getTempSessionCookieName(instanceId))?.value;

All parameters default to 0, so existing callers without the parameter continue to work unchanged.
```

### Verification

All existing callers still work because `instanceId` defaults to `0`.

---

<a id="step-4"></a>
## Step 4: Server Actions — Thread instanceId Through

This is the largest step. Each server action needs to:
1. Accept an `instanceId` parameter (default `0`)
2. Pass `instanceId` to `AsgardeoNextClient.getInstance(instanceId)`
3. Pass `instanceId` to `SessionManager.getSessionCookieName(instanceId)` and `SessionManager.getTempSessionCookieName(instanceId)` where applicable

### Important Pattern

Server actions are called from the client provider. The server provider will create **bound** versions of these actions with `instanceId` pre-filled using `.bind()`. This is how the `instanceId` is threaded through without the client needing to know about it.

### Step 4a: `src/server/actions/getSessionId.ts`

#### Prompt for AI Assistant

```
Modify `packages/nextjs/src/server/actions/getSessionId.ts` to accept an optional `instanceId` parameter.

CHANGES REQUIRED:

Update the function signature and pass instanceId to SessionManager:

BEFORE:
  const getSessionId = async (): Promise<string | undefined> => {
    const cookieStore: ReadonlyRequestCookies = await cookies();
    const sessionToken: string | undefined = cookieStore.get(SessionManager.getSessionCookieName())?.value;

AFTER:
  const getSessionId = async (instanceId: number = 0): Promise<string | undefined> => {
    const cookieStore: ReadonlyRequestCookies = await cookies();
    const sessionToken: string | undefined = cookieStore.get(SessionManager.getSessionCookieName(instanceId))?.value;

Everything else in the function body remains the same.
```

---

### Step 4b: `src/server/actions/getSessionPayload.ts`

#### Prompt for AI Assistant

```
Modify `packages/nextjs/src/server/actions/getSessionPayload.ts` to accept an optional `instanceId` parameter.

CHANGES REQUIRED:

BEFORE:
  const getSessionPayload = async (): Promise<SessionTokenPayload | undefined> => {
    const cookieStore: ReadonlyRequestCookies = await cookies();
    const sessionToken: string | undefined = cookieStore.get(SessionManager.getSessionCookieName())?.value;

AFTER:
  const getSessionPayload = async (instanceId: number = 0): Promise<SessionTokenPayload | undefined> => {
    const cookieStore: ReadonlyRequestCookies = await cookies();
    const sessionToken: string | undefined = cookieStore.get(SessionManager.getSessionCookieName(instanceId))?.value;

Everything else remains the same.
```

---

### Step 4c: `src/server/actions/getAccessToken.ts`

#### Prompt for AI Assistant

```
Modify `packages/nextjs/src/server/actions/getAccessToken.ts` to accept an optional `instanceId` parameter.

CHANGES REQUIRED:

BEFORE:
  const getAccessToken = async (): Promise<string | undefined> => {
    const cookieStore: ReadonlyRequestCookies = await cookies();
    const sessionToken: string | undefined = cookieStore.get(SessionManager.getSessionCookieName())?.value;

AFTER:
  const getAccessToken = async (instanceId: number = 0): Promise<string | undefined> => {
    const cookieStore: ReadonlyRequestCookies = await cookies();
    const sessionToken: string | undefined = cookieStore.get(SessionManager.getSessionCookieName(instanceId))?.value;

Everything else remains the same.
```

---

### Step 4d: `src/server/actions/signInAction.ts`

#### Prompt for AI Assistant

```
Modify `packages/nextjs/src/server/actions/signInAction.ts` to accept an optional `instanceId` parameter.

CHANGES REQUIRED:

1. Update the function signature to accept `instanceId`:
   BEFORE:
     const signInAction = async (
       payload?: EmbeddedSignInFlowHandleRequestPayload,
       request?: EmbeddedFlowExecuteRequestConfig,
     ): Promise<{...}> => {
   AFTER:
     const signInAction = async (
       payload?: EmbeddedSignInFlowHandleRequestPayload,
       request?: EmbeddedFlowExecuteRequestConfig,
       instanceId: number = 0,
     ): Promise<{...}> => {

2. Update getInstance() call:
   BEFORE: const client: AsgardeoNextClient = AsgardeoNextClient.getInstance();
   AFTER:  const client: AsgardeoNextClient = AsgardeoNextClient.getInstance(instanceId);

3. Update ALL SessionManager cookie name calls to pass instanceId:
   - SessionManager.getSessionCookieName()     → SessionManager.getSessionCookieName(instanceId)
   - SessionManager.getTempSessionCookieName()  → SessionManager.getTempSessionCookieName(instanceId)

Search the entire function for these patterns and replace ALL occurrences. There are multiple occurrences of both in this file.

Do NOT change any other logic in the function.
```

---

### Step 4e: `src/server/actions/signOutAction.ts`

#### Prompt for AI Assistant

```
Modify `packages/nextjs/src/server/actions/signOutAction.ts` to accept an optional `instanceId` parameter.

CHANGES REQUIRED:

1. Update the function signature:
   BEFORE:
     const signOutAction = async (): Promise<{data?: {afterSignOutUrl?: string}; error?: unknown; success: boolean}> => {
   AFTER:
     const signOutAction = async (instanceId: number = 0): Promise<{data?: {afterSignOutUrl?: string}; error?: unknown; success: boolean}> => {

2. Update getInstance() call:
   BEFORE: const client: AsgardeoNextClient = AsgardeoNextClient.getInstance();
   AFTER:  const client: AsgardeoNextClient = AsgardeoNextClient.getInstance(instanceId);

3. Update the getSessionId call to pass instanceId:
   BEFORE: const sessionId: string | undefined = await getSessionId();
   AFTER:  const sessionId: string | undefined = await getSessionId(instanceId);

4. Update all SessionManager cookie name calls in the clearSessionCookies inner function:
   - SessionManager.getSessionCookieName()     → SessionManager.getSessionCookieName(instanceId)
   - SessionManager.getTempSessionCookieName()  → SessionManager.getTempSessionCookieName(instanceId)
```

---

### Step 4f: `src/server/actions/handleOAuthCallbackAction.ts`

#### Prompt for AI Assistant

```
Modify `packages/nextjs/src/server/actions/handleOAuthCallbackAction.ts` to accept an optional `instanceId` parameter.

CHANGES REQUIRED:

1. Update the function signature — add instanceId as the last parameter:
   BEFORE:
     const handleOAuthCallbackAction = async (
       code: string,
       state: string,
       sessionState?: string,
     ): Promise<{...}> => {
   AFTER:
     const handleOAuthCallbackAction = async (
       code: string,
       state: string,
       sessionState?: string,
       instanceId: number = 0,
     ): Promise<{...}> => {

2. Update getInstance() call:
   BEFORE: const asgardeoClient: AsgardeoNextClient = AsgardeoNextClient.getInstance();
   AFTER:  const asgardeoClient: AsgardeoNextClient = AsgardeoNextClient.getInstance(instanceId);

3. Update ALL SessionManager cookie name calls:
   - SessionManager.getSessionCookieName()     → SessionManager.getSessionCookieName(instanceId)
   - SessionManager.getTempSessionCookieName()  → SessionManager.getTempSessionCookieName(instanceId)
   - SessionManager.getSessionCookieOptions() stays the same (cookie options are not instance-specific)

DO NOT change any other logic.
```

---

### Step 4g: `src/server/actions/isSignedIn.ts`

#### Prompt for AI Assistant

```
Modify `packages/nextjs/src/server/actions/isSignedIn.ts` to accept an optional `instanceId` parameter.

CHANGES REQUIRED:

1. Update the function signature:
   BEFORE:
     const isSignedIn = async (sessionId?: string): Promise<boolean> => {
   AFTER:
     const isSignedIn = async (sessionId?: string, instanceId: number = 0): Promise<boolean> => {

2. Update ALL getInstance() calls (there are TWO in this file):
   BEFORE: const client: AsgardeoNextClient = AsgardeoNextClient.getInstance();
   AFTER:  const client: AsgardeoNextClient = AsgardeoNextClient.getInstance(instanceId);

3. Update the getSessionPayload call:
   BEFORE: const sessionPayload: SessionTokenPayload | undefined = await getSessionPayload();
   AFTER:  const sessionPayload: SessionTokenPayload | undefined = await getSessionPayload(instanceId);

4. Update the getSessionId call:
   BEFORE: const resolvedSessionId: string | undefined = sessionId || (await getSessionId());
   AFTER:  const resolvedSessionId: string | undefined = sessionId || (await getSessionId(instanceId));
```

---

### Step 4h–4q: Simple Server Actions

These server actions only need `instanceId` passed to `getInstance()`. They follow the same simple pattern.

#### Prompt for AI Assistant (batch for 4h–4q)

```
Modify the following server action files to accept an optional `instanceId` parameter and pass it to `AsgardeoNextClient.getInstance()`.

For each file, the pattern is the same:
1. Add `instanceId: number = 0` as the LAST parameter in the function signature
2. Change `AsgardeoNextClient.getInstance()` to `AsgardeoNextClient.getInstance(instanceId)`
3. If the function calls `getSessionId()`, change it to `getSessionId(instanceId)` and ensure `getSessionId` import is available

FILES AND SPECIFIC CHANGES:

--- packages/nextjs/src/server/actions/getUserAction.ts ---
BEFORE: const getUserAction = async (sessionId: string): Promise<...> => {
AFTER:  const getUserAction = async (sessionId: string, instanceId: number = 0): Promise<...> => {
AND: AsgardeoNextClient.getInstance() → AsgardeoNextClient.getInstance(instanceId)

--- packages/nextjs/src/server/actions/getUserProfileAction.ts ---
BEFORE: const getUserProfileAction = async (sessionId: string): Promise<...> => {
AFTER:  const getUserProfileAction = async (sessionId: string, instanceId: number = 0): Promise<...> => {
AND: AsgardeoNextClient.getInstance() → AsgardeoNextClient.getInstance(instanceId)

--- packages/nextjs/src/server/actions/signUpAction.ts ---
BEFORE: const signUpAction = async (payload?: ...): Promise<...> => {
AFTER:  const signUpAction = async (payload?: ..., instanceId: number = 0): Promise<...> => {
NOTE: instanceId goes after payload. Keep the `payload` as optional.
AND: AsgardeoNextClient.getInstance() → AsgardeoNextClient.getInstance(instanceId)

--- packages/nextjs/src/server/actions/switchOrganization.ts ---
BEFORE: const switchOrganization = async (organization: Organization, sessionId: string | undefined): Promise<...> => {
AFTER:  const switchOrganization = async (organization: Organization, sessionId: string | undefined, instanceId: number = 0): Promise<...> => {
AND: AsgardeoNextClient.getInstance() → AsgardeoNextClient.getInstance(instanceId)
AND: SessionManager.getSessionCookieName()  → SessionManager.getSessionCookieName(instanceId)
AND: getSessionId()  → getSessionId(instanceId)

--- packages/nextjs/src/server/actions/createOrganization.ts ---
BEFORE: const createOrganization = async (payload: CreateOrganizationPayload, sessionId: string): Promise<...> => {
AFTER:  const createOrganization = async (payload: CreateOrganizationPayload, sessionId: string, instanceId: number = 0): Promise<...> => {
AND: AsgardeoNextClient.getInstance() → AsgardeoNextClient.getInstance(instanceId)
AND: getSessionId()  → getSessionId(instanceId)

--- packages/nextjs/src/server/actions/getAllOrganizations.ts ---
BEFORE: const getAllOrganizations = async (options?: any, sessionId?: string | undefined): Promise<...> => {
AFTER:  const getAllOrganizations = async (options?: any, sessionId?: string | undefined, instanceId: number = 0): Promise<...> => {
AND: AsgardeoNextClient.getInstance() → AsgardeoNextClient.getInstance(instanceId)
AND: getSessionId()  → getSessionId(instanceId)

--- packages/nextjs/src/server/actions/getMyOrganizations.ts ---
BEFORE: const getMyOrganizations = async (options?: any, sessionId?: string | undefined): Promise<...> => {
AFTER:  const getMyOrganizations = async (options?: any, sessionId?: string | undefined, instanceId: number = 0): Promise<...> => {
AND: AsgardeoNextClient.getInstance() → AsgardeoNextClient.getInstance(instanceId)
AND inside the dynamic import fallback: getSessionId()  → getSessionId(instanceId) (the dynamic import of getSessionId inside this file)

--- packages/nextjs/src/server/actions/getCurrentOrganizationAction.ts ---
BEFORE: const getCurrentOrganizationAction = async (sessionId: string): Promise<...> => {
AFTER:  const getCurrentOrganizationAction = async (sessionId: string, instanceId: number = 0): Promise<...> => {
AND: AsgardeoNextClient.getInstance() → AsgardeoNextClient.getInstance(instanceId)

--- packages/nextjs/src/server/actions/getOrganizationAction.ts ---
BEFORE: const getOrganizationAction = async (organizationId: string, sessionId: string): Promise<...> => {
AFTER:  const getOrganizationAction = async (organizationId: string, sessionId: string, instanceId: number = 0): Promise<...> => {
AND: AsgardeoNextClient.getInstance() → AsgardeoNextClient.getInstance(instanceId)

--- packages/nextjs/src/server/actions/updateUserProfileAction.ts ---
BEFORE: const updateUserProfileAction = async (payload: UpdateMeProfileConfig, sessionId?: string): Promise<...> => {
AFTER:  const updateUserProfileAction = async (payload: UpdateMeProfileConfig, sessionId?: string, instanceId: number = 0): Promise<...> => {
AND: AsgardeoNextClient.getInstance() → AsgardeoNextClient.getInstance(instanceId)
```

### Verification After Step 4

Run TypeScript compilation:
```bash
cd packages/nextjs && npx tsc --noEmit
```

There should be no type errors. All `instanceId` parameters default to `0`, so all existing callers remain valid.

---

<a id="step-5"></a>
## Step 5: AsgardeoServerProvider — Accept and Forward instanceId

### File: `src/server/AsgardeoProvider.tsx`

This is the most critical step. The server provider needs to:
1. Accept `instanceId` as a prop
2. Use `AsgardeoNextClient.getInstance(instanceId)` instead of `AsgardeoNextClient.getInstance()`
3. Create **bound** versions of all server actions that include the `instanceId`
4. Pass those bound actions to the client provider

### Prompt for AI Assistant

```
Modify `packages/nextjs/src/server/AsgardeoProvider.tsx` to support multi-instance via `instanceId` prop.

CHANGES REQUIRED:

1. The `AsgardeoServerProviderProps` type already inherits `instanceId?: number` from `Partial<AsgardeoProviderProps>`, so the type does NOT need to be modified. Just verify in the source that this inherited type exists.

2. In the component function signature, destructure `instanceId`:
   BEFORE:
     const AsgardeoServerProvider: FC<PropsWithChildren<AsgardeoServerProviderProps>> = async ({
       children,
       afterSignInUrl,
       afterSignOutUrl,
       ..._config
     }: PropsWithChildren<AsgardeoServerProviderProps>): Promise<ReactElement> => {
   AFTER:
     const AsgardeoServerProvider: FC<PropsWithChildren<AsgardeoServerProviderProps>> = async ({
       children,
       afterSignInUrl,
       afterSignOutUrl,
       instanceId = 0,
       ..._config
     }: PropsWithChildren<AsgardeoServerProviderProps>): Promise<ReactElement> => {

3. Update getInstance() call:
   BEFORE: const asgardeoClient: AsgardeoNextClient = AsgardeoNextClient.getInstance();
   AFTER:  const asgardeoClient: AsgardeoNextClient = AsgardeoNextClient.getInstance(instanceId);

4. Update getSessionPayload call:
   BEFORE: const sessionPayload: SessionTokenPayload | undefined = await getSessionPayload();
   AFTER:  const sessionPayload: SessionTokenPayload | undefined = await getSessionPayload(instanceId);

5. Update getSessionId call:
   BEFORE: const sessionId: string = sessionPayload?.sessionId || (await getSessionId()) || '';
   AFTER:  const sessionId: string = sessionPayload?.sessionId || (await getSessionId(instanceId)) || '';

6. Update isSignedIn call:
   BEFORE: const signedIn: boolean = sessionPayload ? true : await isSignedIn(sessionId);
   AFTER:  const signedIn: boolean = sessionPayload ? true : await isSignedIn(sessionId, instanceId);

7. Update getMyOrganizations call:
   BEFORE: myOrganizations = await getMyOrganizations({}, sessionId);
   AFTER:  myOrganizations = await getMyOrganizations({}, sessionId, instanceId);

8. Update getUserAction call:
   BEFORE: await getUserAction(sessionId);
   AFTER:  await getUserAction(sessionId, instanceId);

9. Update getUserProfileAction call:
   BEFORE: await getUserProfileAction(sessionId);
   AFTER:  await getUserProfileAction(sessionId, instanceId);

10. Update getCurrentOrganizationAction call:
    BEFORE: await getCurrentOrganizationAction(sessionId);
    AFTER:  await getCurrentOrganizationAction(sessionId, instanceId);

11. Create BOUND server actions that capture instanceId. Before the return JSX, add:
    // Create instance-bound server actions
    const boundSignIn = async (
      payload?: EmbeddedSignInFlowHandleRequestPayload,
      request?: EmbeddedFlowExecuteRequestConfig,
    ) => signInAction(payload, request, instanceId);

    const boundSignOut = async () => signOutAction(instanceId);

    const boundSignUp = async (payload?: any) => signUpAction(payload, instanceId);

    const boundHandleOAuthCallback = async (code: string, state: string, sessionState?: string) =>
      handleOAuthCallbackAction(code, state, sessionState, instanceId);

    const boundSwitchOrganization = async (organization: Organization, sessionId?: string) =>
      switchOrganization(organization, sessionId, instanceId);

    const boundGetAllOrganizations = async (options?: any, sessionId?: string) =>
      getAllOrganizations(options, sessionId, instanceId);

    const boundCreateOrganization = async (payload: CreateOrganizationPayload, sessionId: string) =>
      createOrganization(payload, sessionId, instanceId);

    const boundUpdateUserProfile = async (payload: any, sessionId?: string) =>
      updateUserProfileAction(payload, sessionId, instanceId);

12. Update the JSX return to use bound actions:
    Replace the direct action references with the bound versions:
    - signIn={signInAction}              → signIn={boundSignIn}
    - signOut={signOutAction}            → signOut={boundSignOut}
    - signUp={signUpAction}              → signUp={boundSignUp}
    - handleOAuthCallback={handleOAuthCallbackAction} → handleOAuthCallback={boundHandleOAuthCallback}
    - switchOrganization={switchOrganization}         → switchOrganization={boundSwitchOrganization}
    - getAllOrganizations={getAllOrganizations}        → getAllOrganizations={boundGetAllOrganizations}
    - createOrganization={createOrganization}         → createOrganization={boundCreateOrganization}
    - updateProfile={updateUserProfileAction}         → updateProfile={boundUpdateUserProfile}

Make sure to import the required types for the bound function signatures (EmbeddedSignInFlowHandleRequestPayload, EmbeddedFlowExecuteRequestConfig, Organization, CreateOrganizationPayload) from '@asgardeo/node'. Some may already be imported.

Do NOT change AsgardeoClientProvider or AsgardeoContext — they don't need instance awareness because they use React context shadowing.
```

### Verification

After this step, the server provider:
- Defaults to `instanceId=0` if not specified (backward compatible)
- Creates the correct `AsgardeoNextClient` instance for the given `instanceId`
- Reads/writes the correct instance-scoped cookies
- Passes bound server actions that know their `instanceId`

Run:
```bash
cd packages/nextjs && npx tsc --noEmit
```

---

<a id="step-6"></a>
## Step 6: AsgardeoClientProvider — No Structural Changes

### File: `src/client/contexts/Asgardeo/AsgardeoProvider.tsx`

### Why No Changes

The client provider already receives all its data and actions as **props** from the server provider. The server provider already creates bound actions. The client provider renders `<AsgardeoContext.Provider value={contextValue}>` wrapping its children.

When two server providers with different `instanceId` values render their respective client providers at different positions in the React tree, React's context shadowing ensures each subtree gets the correct context value.

### Prompt for AI Assistant

```
No changes are needed to `packages/nextjs/src/client/contexts/Asgardeo/AsgardeoProvider.tsx`.

VERIFICATION ONLY: Read this file and confirm that:
1. It receives signIn, signOut, signUp, handleOAuthCallback, etc. as PROPS (not imported directly)
2. It renders <AsgardeoContext.Provider value={contextValue}> wrapping {children}
3. It does NOT import or call AsgardeoNextClient.getInstance() directly
4. It does NOT import or call SessionManager directly

If all of the above are true, no changes are needed. The multi-instance support flows through the bound actions passed as props from the server provider.
```

---

<a id="step-7"></a>
## Step 7: useAsgardeo — No Changes Needed

### File: `src/client/contexts/Asgardeo/useAsgardeo.ts`

### Why No Changes

`useAsgardeo()` uses `useContext(AsgardeoContext)` which returns the nearest ancestor's context value. This is the tree-shadowing approach. Components under different providers automatically get different data.

### Prompt for AI Assistant

```
No changes are needed to `packages/nextjs/src/client/contexts/Asgardeo/useAsgardeo.ts`.

VERIFICATION ONLY: Read this file and confirm:
1. It calls useContext(AsgardeoContext) with NO instanceId parameter
2. It returns the context value as-is

This is correct for the "nearest ancestor wins" approach. No changes needed.
```

---

<a id="step-8"></a>
## Step 8: asgardeo() Helper — Instance-Aware

### File: `src/server/asgardeo.ts`

### Prompt for AI Assistant

```
Modify `packages/nextjs/src/server/asgardeo.ts` to accept an optional `instanceId` parameter and pass it to `AsgardeoNextClient.getInstance()` and related calls.

CHANGES REQUIRED:

1. Update the function signature:
   BEFORE:
     const asgardeo = async (): Promise<{...}> => {
   AFTER:
     const asgardeo = async (instanceId: number = 0): Promise<{...}> => {

2. Update all getInstance() calls inside the function:
   BEFORE: const client: AsgardeoNextClient = AsgardeoNextClient.getInstance();
   AFTER:  const client: AsgardeoNextClient = AsgardeoNextClient.getInstance(instanceId);

3. Update the getSessionId call:
   BEFORE: const getSessionId = async (): Promise<string | undefined> => getSessionIdAction();
   AFTER:  const getSessionId = async (): Promise<string | undefined> => getSessionIdAction(instanceId);

All three inner functions (getAccessToken, getSessionId, exchangeToken, reInitialize) should use the getInstance(instanceId) call.
```

### Verification

After this step:
```typescript
// Single instance (backward compatible)
const { getAccessToken, getSessionId } = await asgardeo();

// Multi-instance
const { getAccessToken: getAdminToken } = await asgardeo(0);
const { getAccessToken: getPartnerToken } = await asgardeo(1);
```

---

<a id="step-9"></a>
## Step 9: Middleware — Multi-Instance Session Validation

### File: `src/server/middleware/asgardeoMiddleware.ts`

The middleware needs the most careful handling because it intercepts requests at the edge (before the React tree exists). For multi-instance, the middleware needs to check sessions for specific instances.

### Prompt for AI Assistant

```
Modify `packages/nextjs/src/server/middleware/asgardeoMiddleware.ts` to support multi-instance session validation.

CHANGES REQUIRED:

1. Add `instanceId` to `AsgardeoMiddlewareOptions`:
   Find the existing type:
     export type AsgardeoMiddlewareOptions = Partial<AsgardeoNextConfig>;
   Change to:
     export type AsgardeoMiddlewareOptions = Partial<AsgardeoNextConfig> & {
       /** Instance ID for multi-instance support. Defaults to 0. */
       instanceId?: number;
     };

2. Add `instanceId` to `AsgardeoMiddlewareContext` so the user's handler can access it:
   Add to the AsgardeoMiddlewareContext type:
     /** The instance ID this middleware context is configured for */
     instanceId: number;

3. Inside the `asgardeoMiddleware` function body, extract instanceId from resolvedOptions:
   After the line:
     const resolvedOptions: AsgardeoMiddlewareOptions = typeof options === 'function' ? options(request) : options || {};
   Add:
     const instanceId: number = resolvedOptions.instanceId ?? 0;

4. Update the `hasValidSession` call (the local one that wraps the imported function):
   The local `hasValidSession` function at the top of the file calls the imported `hasValidJWTSession`. 
   
   BEFORE (the local wrapper):
     const hasValidSession = async (request: NextRequest): Promise<boolean> => {
       try {
         return await hasValidJWTSession(request);
       } catch {
         return Promise.resolve(false);
       }
     };
   
   This local wrapper is called once. However, because it's defined outside the middleware closure, we need a different approach. Instead, inline the instanceId into the calls.
   
   In the middleware body, change:
   BEFORE:
     const isAuthenticated: boolean = await hasValidSession(request);
   AFTER:
     const isAuthenticated: boolean = await hasValidJWTSession(request, instanceId).catch(() => false);
   
   And also update:
   BEFORE: 
     const sessionId: string | undefined = await getSessionIdFromRequestMiddleware(request);
   AFTER:
     const sessionId: string | undefined = await getSessionIdFromRequest(request, instanceId);
   
   Note: you may need to adjust the imports. Use `getSessionIdFromRequest` directly from `../../utils/sessionUtils` and `hasValidSession as hasValidJWTSession` from the same file.

5. Update the OAuth callback validation that checks the temp session:
   BEFORE:
     const tempSessionToken: string | undefined = request.cookies.get(
       SessionManager.getTempSessionCookieName(),
     )?.value;
   AFTER:
     const tempSessionToken: string | undefined = request.cookies.get(
       SessionManager.getTempSessionCookieName(instanceId),
     )?.value;

6. Add `instanceId` to the asgardeo context object:
   Inside the asgardeo context object literal, add:
     instanceId,

7. Update the `getSession` method in the context:
   BEFORE: return await getSessionFromRequest(request);
   AFTER:  return await getSessionFromRequest(request, instanceId);

8. Update the `getSessionId` method in the context:
   BEFORE: getSessionId: (): string | undefined => sessionId,
   (This uses the variable computed earlier, which is now already instance-aware from change #4, so no change needed here)

Make sure imports are adjusted appropriately. The key import changes:
- Import `getSessionIdFromRequest` directly from `../../utils/sessionUtils`
- Import `hasValidSession as hasValidJWTSession` and `getSessionFromRequest` from `../../utils/sessionUtils`
- Import `SessionManager` from `../../utils/SessionManager`
```

### Verification

The middleware should still work with default `instanceId=0`. For multi-instance:

```typescript
// middleware.ts
export default asgardeoMiddleware(
  async (asgardeo, req) => {
    if (isAdminRoute(req)) {
      await asgardeo.protectRoute();
    }
  },
  { instanceId: 0 }  // or omit for default
);
```

For protecting routes across multiple instances, users can compose middleware:

```typescript
// middleware.ts
const adminMiddleware = asgardeoMiddleware(
  async (asgardeo, req) => {
    if (isAdminRoute(req)) await asgardeo.protectRoute();
  },
  { instanceId: 0 }
);

const partnerMiddleware = asgardeoMiddleware(
  async (asgardeo, req) => {
    if (isPartnerRoute(req)) await asgardeo.protectRoute();
  },
  { instanceId: 1 }
);
```

---

<a id="step-10"></a>
## Step 10: Exports and Types

### File: `src/models/config.ts`

### Prompt for AI Assistant

```
Read `packages/nextjs/src/models/config.ts` and verify that `AsgardeoNextConfig` inherits `instanceId?: number` from `AsgardeoNodeConfig`.

The current definition is:
  export type AsgardeoNextConfig = AsgardeoNodeConfig;

AsgardeoNodeConfig extends the base Config which has `instanceId?: number`.

VERIFICATION: Trace the type chain:
1. AsgardeoNextConfig = AsgardeoNodeConfig (in nextjs/src/models/config.ts)
2. AsgardeoNodeConfig includes/extends types from @asgardeo/node
3. Which ultimately uses Config from @asgardeo/javascript which has `instanceId?: number`

If the type is correctly inherited, no changes needed. If not, explicitly add instanceId.
```

### File: `src/index.ts`

No changes needed — `AsgardeoNext` (the class) is already exported, and consumers will use `AsgardeoNextClient.getInstance(instanceId)`.

---

<a id="step-11"></a>
## Step 11: Tests

### Prompt for AI Assistant — Unit Tests for AsgardeoNextClient

```
Create or update tests for the multiton pattern in AsgardeoNextClient.

Create a test file at `packages/nextjs/src/__tests__/AsgardeoNextClient.test.ts` with the following test cases:

1. "getInstance returns the same instance for the same instanceId"
   - Call getInstance(0) twice, assert they are the same reference
   - Call getInstance(1) twice, assert they are the same reference

2. "getInstance returns different instances for different instanceIds"
   - Call getInstance(0) and getInstance(1), assert they are different references

3. "getInstance defaults to instanceId 0"
   - Call getInstance() (no args) and getInstance(0), assert same reference

4. "hasInstance returns true for created instances"
   - Call getInstance(0)
   - Assert hasInstance(0) === true
   - Assert hasInstance(99) === false

5. "destroyInstance removes the instance"
   - Call getInstance(1)
   - Assert hasInstance(1) === true
   - Call destroyInstance(1)
   - Assert hasInstance(1) === false

6. "getInstanceId returns the correct id"
   - const client = getInstance(5)
   - Assert client.getInstanceId() === 5

Note: You will need to call destroyInstance between tests or use beforeEach to clean up, since the Map is static.

Use vitest (already configured in the project). Mock LegacyAsgardeoNodeClient from '@asgardeo/node'.
```

### Prompt for AI Assistant — Unit Tests for SessionManager

```
Create or update tests for the instance-scoped cookie names in SessionManager.

Create a test file at `packages/nextjs/src/__tests__/SessionManager.test.ts` (or update existing) with:

1. "getSessionCookieName returns base name for instanceId 0"
   - Assert SessionManager.getSessionCookieName(0) === '__asgardeo__session'

2. "getSessionCookieName returns base name when called without args"
   - Assert SessionManager.getSessionCookieName() === '__asgardeo__session'

3. "getSessionCookieName returns suffixed name for instanceId > 0"
   - Assert SessionManager.getSessionCookieName(1) === '__asgardeo__session.1'
   - Assert SessionManager.getSessionCookieName(42) === '__asgardeo__session.42'

4. "getTempSessionCookieName returns base name for instanceId 0"
   - Assert SessionManager.getTempSessionCookieName(0) === '__asgardeo__temp.session'

5. "getTempSessionCookieName returns suffixed name for instanceId > 0"
   - Assert SessionManager.getTempSessionCookieName(1) === '__asgardeo__temp.session.1'

Use vitest.
```

### Prompt for AI Assistant — Update Existing Server Action Tests  

```
Check the existing test files under `packages/nextjs/src/server/actions/__tests__/` and update them if they call any of the modified server actions.

For each test:
1. Verify the test still passes with the default instanceId (backward compatibility)
2. Add a test case that passes a non-zero instanceId and verifies the correct AsgardeoNextClient instance is used

The key assertion pattern:
- When instanceId=1 is passed, AsgardeoNextClient.getInstance should be called with 1
- When no instanceId is passed, AsgardeoNextClient.getInstance should be called with 0
```

---

<a id="step-12"></a>
## Step 12: Manual Verification Checklist

After all code changes are complete, verify the following:

### 12.1 TypeScript Compilation

```bash
cd packages/nextjs && npx tsc --noEmit
```

Expected: Zero errors.

### 12.2 Unit Tests

```bash
cd packages/nextjs && npx vitest run
```

Expected: All tests pass.

### 12.3 Backward Compatibility — Single Instance

Create a test Next.js app with a SINGLE `AsgardeoProvider` (no `instanceId` prop):

```tsx
// layout.tsx
import { AsgardeoProvider } from '@asgardeo/nextjs/server';

export default function RootLayout({ children }) {
  return (
    <AsgardeoProvider baseUrl="..." clientId="..." clientSecret="...">
      {children}
    </AsgardeoProvider>
  );
}
```

Verify:
- [ ] App starts without errors
- [ ] Sign-in flow works
- [ ] Sign-out flow works
- [ ] Session cookie name is `__asgardeo__session` (no suffix)
- [ ] `useAsgardeo()` returns correct user data
- [ ] Middleware `asgardeoMiddleware()` works with no options
- [ ] `asgardeo()` helper works with no arguments

### 12.4 Multi-Instance — Two Providers

```tsx
// layout.tsx
import { AsgardeoProvider } from '@asgardeo/nextjs/server';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AsgardeoProvider instanceId={0} baseUrl="https://api.asgardeo.io/t/orgA" clientId="clientA" clientSecret="secretA">
          <nav>
            <AdminNav />  {/* useAsgardeo() → orgA session */}
          </nav>
        </AsgardeoProvider>

        <AsgardeoProvider instanceId={1} baseUrl="https://api.asgardeo.io/t/orgB" clientId="clientB" clientSecret="secretB">
          <main>
            <PartnerContent />  {/* useAsgardeo() → orgB session */}
          </main>
        </AsgardeoProvider>
      </body>
    </html>
  );
}
```

Verify:
- [ ] Both providers initialize without errors
- [ ] Two separate session cookies appear: `__asgardeo__session` and `__asgardeo__session.1`
- [ ] Signing in via instance 0 does NOT affect instance 1's session
- [ ] Signing out of instance 1 only clears `__asgardeo__session.1`
- [ ] `useAsgardeo()` inside `<AdminNav>` returns orgA user data
- [ ] `useAsgardeo()` inside `<PartnerContent>` returns orgB user data
- [ ] Each instance can independently sign in and sign out

### 12.5 Multi-Instance — Nested Providers (Shadowing)

```tsx
<AsgardeoProvider instanceId={0} baseUrl="orgA" clientId="clientA" clientSecret="secretA">
  <OuterComponent />  {/* useAsgardeo() → orgA */}
  <AsgardeoProvider instanceId={1} baseUrl="orgB" clientId="clientB" clientSecret="secretB">
    <InnerComponent />  {/* useAsgardeo() → orgB (shadows orgA) */}
  </AsgardeoProvider>
</AsgardeoProvider>
```

Verify:
- [ ] `OuterComponent`'s `useAsgardeo()` returns orgA data
- [ ] `InnerComponent`'s `useAsgardeo()` returns orgB data (NOT orgA)
- [ ] This confirms context shadowing works correctly

### 12.6 Middleware Multi-Instance

```typescript
// middleware.ts
import { asgardeoMiddleware, createRouteMatcher } from '@asgardeo/nextjs/server';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default asgardeoMiddleware(
  async (asgardeo, req) => {
    if (isAdminRoute(req)) {
      await asgardeo.protectRoute();
    }
  },
  { instanceId: 0 }
);
```

Verify:
- [ ] Middleware correctly checks instance 0's session cookie
- [ ] Unauthenticated users on `/admin` are redirected

### 12.7 asgardeo() Helper Multi-Instance

```typescript
// In a server component or server action
import { asgardeo } from '@asgardeo/nextjs/server';

const { getAccessToken } = await asgardeo(1); // partner instance
const token = await getAccessToken(sessionId);
```

Verify:
- [ ] Returns the access token from instance 1's session
- [ ] Does not interfere with instance 0

---

## Appendix A: Complete List of `AsgardeoNextClient.getInstance()` Call Sites

These are ALL the places in the current codebase where `getInstance()` is called. Every one needs `instanceId` threaded through.

| File | Current Call | After Change |
|---|---|---|
| `server/AsgardeoProvider.tsx` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/asgardeo.ts` | `AsgardeoNextClient.getInstance()` (×3) | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/signInAction.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/signOutAction.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/handleOAuthCallbackAction.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/isSignedIn.ts` | `AsgardeoNextClient.getInstance()` (×2) | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/getUserAction.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/getUserProfileAction.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/signUpAction.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/switchOrganization.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/createOrganization.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/getAllOrganizations.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/getMyOrganizations.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/getCurrentOrganizationAction.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/getOrganizationAction.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |
| `server/actions/updateUserProfileAction.ts` | `AsgardeoNextClient.getInstance()` | `AsgardeoNextClient.getInstance(instanceId)` |

## Appendix B: Complete List of Cookie Name Call Sites

| File | Current Call | After Change |
|---|---|---|
| `utils/SessionManager.ts` | `getSessionCookieName()` / `getTempSessionCookieName()` | Accept `instanceId` parameter |
| `utils/sessionUtils.ts` | `SessionManager.getSessionCookieName()` | `SessionManager.getSessionCookieName(instanceId)` |
| `utils/sessionUtils.ts` | `SessionManager.getTempSessionCookieName()` | `SessionManager.getTempSessionCookieName(instanceId)` |
| `server/actions/getSessionId.ts` | `SessionManager.getSessionCookieName()` | `SessionManager.getSessionCookieName(instanceId)` |
| `server/actions/getSessionPayload.ts` | `SessionManager.getSessionCookieName()` | `SessionManager.getSessionCookieName(instanceId)` |
| `server/actions/getAccessToken.ts` | `SessionManager.getSessionCookieName()` | `SessionManager.getSessionCookieName(instanceId)` |
| `server/actions/signInAction.ts` | `SessionManager.getSessionCookieName()` (×2) | `SessionManager.getSessionCookieName(instanceId)` |
| `server/actions/signInAction.ts` | `SessionManager.getTempSessionCookieName()` (×3) | `SessionManager.getTempSessionCookieName(instanceId)` |
| `server/actions/signOutAction.ts` | `SessionManager.getSessionCookieName()` | `SessionManager.getSessionCookieName(instanceId)` |
| `server/actions/signOutAction.ts` | `SessionManager.getTempSessionCookieName()` | `SessionManager.getTempSessionCookieName(instanceId)` |
| `server/actions/handleOAuthCallbackAction.ts` | `SessionManager.getSessionCookieName()` | `SessionManager.getSessionCookieName(instanceId)` |
| `server/actions/handleOAuthCallbackAction.ts` | `SessionManager.getTempSessionCookieName()` (×2) | `SessionManager.getTempSessionCookieName(instanceId)` |
| `server/actions/switchOrganization.ts` | `SessionManager.getSessionCookieName()` | `SessionManager.getSessionCookieName(instanceId)` |
| `server/middleware/asgardeoMiddleware.ts` | `SessionManager.getTempSessionCookieName()` | `SessionManager.getTempSessionCookieName(instanceId)` |

## Appendix C: Sequence Diagram — Multi-Instance Sign-In Flow

```
User clicks "Sign In" in Instance 1 section
    │
    ▼
AsgardeoClientProvider (instance 1)
    │  calls boundSignIn(payload, request)
    │  (which calls signInAction(payload, request, instanceId=1))
    │
    ▼
signInAction (server action, instanceId=1)
    │  AsgardeoNextClient.getInstance(1) → isolated client
    │  SessionManager.getTempSessionCookieName(1) → "__asgardeo__temp.session.1"
    │  SessionManager.getSessionCookieName(1) → "__asgardeo__session.1"
    │  ... completes OAuth flow ...
    │  Sets cookie "__asgardeo__session.1" with JWT session token
    │
    ▼
Browser has TWO cookies:
    "__asgardeo__session"    ← instance 0 (if signed in)
    "__asgardeo__session.1"  ← instance 1 (just signed in)
    │
    ▼
Page reloads → AsgardeoServerProvider (instanceId=1)
    │  getSessionPayload(1) → reads "__asgardeo__session.1"
    │  AsgardeoNextClient.getInstance(1) → same isolated client
    │  Fetches user data via instance 1's access token
    │
    ▼
AsgardeoClientProvider receives instance 1's user data as props
    │
    ▼
<AsgardeoContext.Provider value={instance1Data}>
    │
    ▼
useAsgardeo() → returns instance 1's data (nearest ancestor)
```
