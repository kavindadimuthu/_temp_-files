# Multi-Instance Follow-Up: Three Key Questions

> **Companion to:** `docs/developer/nextjs-multi-instance.md`

---

## Question 1: Does the Node SDK Need Multi-Instance Support Too?

### Short answer

**No — the Node SDK does not need changes to support the Next.js SDK's multi-instance feature,** but it would benefit from an optional *keyed instance registry* if it is ever used directly in multi-tenant server scenarios.

### Why the Node SDK is different from the Browser SDK

In the browser world, `AsgardeoSPAClient` is a singleton per instance ID:

```
AsgardeoSPAClient._instances: Map<number, AsgardeoSPAClient>
  0 → AsgardeoSPAClient (orgA)
  1 → AsgardeoSPAClient (orgB)
```

This registry is needed because browser storage (`sessionStorage`, `localStorage`) is shared across the entire page. Without it, two browser clients writing to the same storage keys would corrupt each other's data. The numeric instance ID is threaded through as a namespace prefix on all storage keys.

The Node SDK (`LegacyAsgardeoNodeClient`, which is `AsgardeoNodeClient` from `packages/node/src/__legacy__/client.ts`) was never a singleton. It is a plain instantiable class:

```typescript
export class AsgardeoNodeClient<T> {
  private authCore: AsgardeoNodeCore<T>;

  constructor() {} // no registry, no static instance map

  public async initialize(config: AuthClientConfig<T>, store?: Storage): Promise<boolean> {
    this.authCore = new AsgardeoNodeCore(config, store);
    // AsgardeoNodeCore creates its own MemoryCacheStore internally
    return Promise.resolve(true);
  }
}
```

Each `new LegacyAsgardeoNodeClient()` call creates a completely independent object with its own private `AsgardeoNodeCore`, which in turn creates its own `MemoryCacheStore`. On the server, each request has its own memory space — there is no shared storage to namespace. Isolation is structural, not namespace-based.

### Why no Node SDK changes are needed for multi-instance Next.js

In the proposed multi-instance Next.js design, `AsgardeoNextClient.getInstance('org-admin')` creates a new `AsgardeoNextClient`. Inside that client's constructor:

```typescript
private constructor(instanceId: string = 'default') {
  super();
  this.instanceId = instanceId;
  this.asgardeo = new LegacyAsgardeoNodeClient(); // brand new instance, no sharing
}
```

Each named Next.js client gets its own `LegacyAsgardeoNodeClient`. Since `LegacyAsgardeoNodeClient` is already naturally isolatable through instantiation, nothing in the Node SDK needs to change. The isolation is achieved by the Next.js layer, not by the Node layer.

### When the Node SDK itself would need multi-instance support

If someone uses `@asgardeo/node` **directly** in their own Express.js or Fastify server — not through `@asgardeo/nextjs` — and they want to manage multiple authentication configurations, they have to manage instances manually:

```typescript
// Without a registry (current state) — developer manages it
const orgAClient = new LegacyAsgardeoNodeClient();
await orgAClient.initialize({ baseUrl: 'https://api.asgardeo.io/t/orgA', ... });

const orgBClient = new LegacyAsgardeoNodeClient();
await orgBClient.initialize({ baseUrl: 'https://api.asgardeo.io/t/orgB', ... });
```

This works but is cumbersome. If the Node SDK added a keyed registry pattern similar to the Next.js proposal, it would look like:

```typescript
// Proposed Node SDK enhancement (not currently needed for Next.js)
class AsgardeoNodeClient<T> {
  private static instances: Map<string, AsgardeoNodeClient<any>> = new Map();

  public static getInstance(instanceId: string = 'default'): AsgardeoNodeClient<any> {
    if (!this.instances.has(instanceId)) {
      this.instances.set(instanceId, new AsgardeoNodeClient());
    }
    return this.instances.get(instanceId)!;
  }
}
```

**This is a quality-of-life improvement for direct Node SDK users, not a requirement for Next.js SDK multi-instance.** These are independent enhancements that can be done separately.

### Summary table

| Concern | Requires Node SDK Change? | Reason |
|---|---|---|
| Next.js SDK multi-instance | **No** | `LegacyAsgardeoNodeClient` is already non-singleton; each Next.js instance creates its own |
| Express/Fastify direct multi-tenant | Optional | Would improve DX but not required; developers can instantiate manually |
| Node SDK keyed instance registry | Future enhancement | Mirrors browser SDK pattern; not on the critical path |

---

## Question 2: Why Doesn't the React SDK Need a Context Registry?

### The root cause: React context uses the tree, not an ID

React's context system has one fundamental rule:

> `useContext(MyContext)` returns the value from the **nearest ancestor `<MyContext.Provider>`** in the component tree.

This means that a single `createContext()` can serve multiple isolated regions of the tree simultaneously. Different subtrees get different values — there is no conflict. Each `AsgardeoProvider` renders its own `<AsgardeoContext.Provider value={...}>` wrapping its children, and those children will see that provider's value, not a parent provider's value.

```
<AsgardeoContext.Provider value={orgAState}>      ← orgA scope
  <ComponentA />   {/* useAsgardeo() → orgA data */}
  <AsgardeoContext.Provider value={orgBState}>    ← orgB scope (shadows orgA)
    <ComponentB /> {/* useAsgardeo() → orgB data */}
  </AsgardeoContext.Provider>
</AsgardeoContext.Provider>
```

React's context tree IS the registry. The tree structure manages which value a consumer gets. There is no separate data structure needed.

The React SDK's `instanceId` is used ONLY for namespacing browser storage keys (e.g., `sessionStorage['asgardeo_1_access_token']`). It has no role in deciding which context value a component reads. The context tree hierarchy handles that entirely.

### Why the React SDK's multi-instance pattern is limited

Because the React SDK relies on tree-based context shadowing, a component can only access the context from its **nearest ancestor provider**. It cannot "reach across" and read a sibling or parent provider's data:

```tsx
<AsgardeoProvider instanceId={0} baseUrl="orgA">
  <AsgardeoProvider instanceId={1} baseUrl="orgB">
    <Dashboard />
    {/* Dashboard can call useAsgardeo() → gets orgB data */}
    {/* Dashboard CANNOT call useAsgardeo() to get orgA data */}
  </AsgardeoProvider>
</AsgardeoProvider>
```

The `useAsgardeo()` hook in React SDK takes no arguments. Multi-instance in the React SDK is only useful for rendering **separate independent sections** of the page under separate providers, not for **simultaneously reading both contexts in one component**.

### Why the Next.js SDK needs a context registry

The Next.js SDK has a design problem that the React SDK doesn't face: **client components in Next.js App Router are not statically nested the same way as React components**. 

In Next.js, the server provider (`AsgardeoServerProvider`) is an async RSC that runs on the server and passes pre-fetched data as props to the client provider (`AsgardeoClientProvider`). The client provider is a `'use client'` component. If two server providers wrap the same client subtree, the React tree on the client still has the same single-context shadowing behavior — but the developer experience problem is:

**A component deep in the tree may want to read from a specific named instance regardless of which provider is the nearest ancestor.** This is the B2B use case: a sidebar always reads `org-admin` context, a main panel reads `partner` context, and they may be arbitrarily positioned in the tree without strict nesting.

```tsx
// This pattern doesn't work with the shadowing approach:
<AsgardeoProvider instanceId="org-admin">
  <Sidebar />     {/* wants org-admin */}
  <AsgardeoProvider instanceId="partner">
    <MainPanel /> {/* wants partner */}
    <Footer />    {/* wants org-admin (not partner!) */}
                  {/* ← impossible with shadowing alone */}
  </AsgardeoProvider>
</AsgardeoProvider>
```

The context registry solves this by giving each instance a **distinct context object**, so the consumer can name which one it wants:

```typescript
const adminCtx   = useAsgardeo('org-admin'); // reads from AsgardeoContext_orgAdmin
const partnerCtx = useAsgardeo('partner');   // reads from AsgardeoContext_partner
```

Both work from the same component regardless of tree position.

### Can the Next.js SDK avoid the context registry?

**Yes, if you accept the same limitation as the React SDK.**

If the only use case is "separate independent sections of the page under separate providers" (no cross-section access), then the simple approach works:

```typescript
// No context registry — use shadowing just like React SDK
const AsgardeoClientProvider = ({ children, ...props }) => {
  return (
    <AsgardeoContext.Provider value={contextValue}>
      {children}
    </AsgardeoContext.Provider>
  );
};

// useAsgardeo takes no instanceId argument
const useAsgardeo = (): AsgardeoContextProps => {
  return useContext(AsgardeoContext);
};
```

**This works perfectly if providers are at the layout level and never cross-read.** The admin section is wrapped in one provider; the partner section is wrapped in another; neither section's components need to read the other's data. This is probably the most common B2B use case.

The context registry is only needed when a component in one provider's subtree needs to read data from a different named instance. This is the more advanced "cross-section" use case.

**Recommendation:** Start with the simpler no-registry approach (matches React SDK behavior). Add the registry as a follow-up if the cross-section access pattern becomes a real requirement. The simpler approach is:
- Fewer moving parts
- Consistent with how the React SDK works
- Still fully supports the primary multi-org B2B pattern

---

## Question 3: Number vs String Instance ID

### The short answer

**Use `number` for type compatibility.** The entire existing SDK stack uses `number` for `instanceId`, and the `AsgardeoServerProviderProps` type inherits from `Partial<AsgardeoProviderProps>` which already defines `instanceId?: number` from `packages/javascript/src/models/config.ts`.

### The type chain that forces this

The type definition ancestry for `instanceId`:

```
packages/javascript/src/models/config.ts
  └─ Config { instanceId?: number }            ← canonical definition

packages/browser/src/models/config.ts
  └─ AsgardeoBrowserConfig = Config<...>       ← inherits number

packages/react/src/models/config.ts
  └─ AsgardeoReactConfig = AsgardeoBrowserConfig ← inherits number

packages/react/src/contexts/Asgardeo/AsgardeoProvider.tsx
  └─ AsgardeoProviderProps = AsgardeoReactConfig ← instanceId: number

packages/nextjs/src/server/AsgardeoProvider.tsx
  └─ AsgardeoServerProviderProps = Partial<AsgardeoProviderProps> & { ... }
                                             ← instanceId already typed as number
```

If `AsgardeoServerProviderProps` adds `instanceId: string`, it conflicts with `Partial<AsgardeoProviderProps>` which already declares `instanceId?: number`. TypeScript would raise a type error because `string` is not assignable to `number | undefined`.

Using `string` would mean either:
1. Overriding the inherited `instanceId` type with `instanceId: number | string` — a widening that changes the contract for all SDK users
2. Naming the prop something else (e.g., `contextId`) — breaking consistency

Neither is clean.

### How `number` maps to cookie names and storage

When using `number` as the instance ID, the cookie name scheme becomes:

```typescript
static getSessionCookieName(instanceId: number = 0): string {
  if (instanceId === 0) {
    return CookieConfig.SESSION_COOKIE_NAME; // "__asgardeo__session" — backward compat
  }
  return `${CookieConfig.SESSION_COOKIE_NAME}.${instanceId}`;
}
```

Result:
```
instanceId=0 → __asgardeo__session           (existing default, backward compat)
instanceId=1 → __asgardeo__session.1
instanceId=2 → __asgardeo__session.2
```

And the instance registry:
```typescript
private static instances: Map<number, AsgardeoNextClient<any>> = new Map();

public static getInstance<T>(instanceId: number = 0): AsgardeoNextClient<T> {
  if (!AsgardeoNextClient.instances.has(instanceId)) {
    AsgardeoNextClient.instances.set(instanceId, new AsgardeoNextClient<T>(instanceId));
  }
  return AsgardeoNextClient.instances.get(instanceId) as AsgardeoNextClient<T>;
}
```

This mirrors exactly how `AsgardeoSPAClient` works in the browser SDK:
```typescript
protected static _instances: Map<number, AsgardeoSPAClient> = new Map();

public static getInstance(id: number = 0): AsgardeoSPAClient {
  if (!this._instances.has(id)) {
    this._instances.set(id, new AsgardeoSPAClient(id));
  }
  return this._instances.get(id)!;
}
```

### The ergonomics argument for string (and why it doesn't win)

The appeal of `string` is readability:

```tsx
<AsgardeoProvider instanceId="org-admin" ... />  // clear intent
vs.
<AsgardeoProvider instanceId={1} ... />           // magic number
```

And in hooks:
```typescript
useAsgardeo('org-admin')   // vs.   useAsgardeo(1)
```

However, this is a documentation and convention problem, not a type problem. The ecosystem convention (going from `@asgardeo/javascript` → `@asgardeo/browser` → `@asgardeo/react` → `@asgardeo/nextjs`) is firmly `number`. Introducing `string` at the Next.js level would:

1. **Break type compatibility** with the React SDK's `AsgardeoProviderProps` that the Next.js provider extends
2. **Fragment the API** — the same concept (`instanceId`) has different types depending on which SDK you use
3. **Add no functional benefit** — conventions like `const ORG_ADMIN_INSTANCE = 1` solve the readability concern at zero type cost

### Revised developer API using `number`

```tsx
// layout.tsx
const ADMIN_INSTANCE  = 0; // default, for backward compat
const PARTNER_INSTANCE = 1;

<AsgardeoProvider instanceId={ADMIN_INSTANCE}   baseUrl="..." clientId="...">
  <AsgardeoProvider instanceId={PARTNER_INSTANCE} baseUrl="..." clientId="...">
    {children}
  </AsgardeoProvider>
</AsgardeoProvider>
```

```tsx
// dashboard.tsx — with context registry approach
const adminCtx   = useAsgardeo(0);  // ADMIN_INSTANCE
const partnerCtx = useAsgardeo(1);  // PARTNER_INSTANCE
```

```typescript
// middleware.ts
asgardeoMiddleware(async (asgardeo, req) => {
  if (isAdminRoute(req))   await asgardeo.protectRoute({ instanceId: 0 });
  if (isPartnerRoute(req)) await asgardeo.protectRoute({ instanceId: 1 });
});
```

### Summary of all three corrections to the original document

The original multi-instance analysis document proposed using `string` for `instanceId`. The corrected decisions are:

| Layer | Original proposal | Corrected design | Reason |
|---|---|---|---|
| `AsgardeoNextClient.getInstance()` | `Map<string, client>` | `Map<number, client>` | Type compatibility with all upstream SDKs |
| `SessionManager.getSessionCookieName()` | `instanceId: string = 'default'` | `instanceId: number = 0` | Numeric `0` is the backward-compatible default |
| Cookie name for default | `__asgardeo__session` (special-cased by `'default'`) | `__asgardeo__session` (special-cased by `=== 0`) | Same backward-compat result |
| `AsgardeoServerProvider` prop | `instanceId?: string` | `instanceId?: number` | Inherits from `AsgardeoProviderProps` typed as `number` |
| `useAsgardeo()` hook argument | `instanceId: string = 'default'` | `instanceId: number = 0` | Consistency; readable via named constants |
| Middleware option | `instanceIds?: string[]` | `instanceIds?: number[]` | Consistency |
| Node SDK | Needs multi-instance support | **No changes needed** | `LegacyAsgardeoNodeClient` is already a non-singleton |
| Context registry | Required | **Optional** — only needed if cross-provider access is required | Simpler no-registry approach (tree shadowing) works for the primary use case |
