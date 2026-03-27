# React SDK — App-Native Authentication Flow (Reference Architecture)

> **Scope**: Complete technical reference of how the `@asgardeo/react` SDK implements the
> app-native (embedded) authentication flow for Asgardeo V2 / Thunder.  
> **Audience**: SDK engineers aligning the Vue SDK to feature-parity.

---

## 1. Layered Package Architecture

```
┌──────────────────────────────────┐
│        @asgardeo/react           │  ← React-specific providers, hooks, components
├──────────────────────────────────┤
│       @asgardeo/browser          │  ← Thin wrapper: extends JS client w/ browser storage
├──────────────────────────────────┤
│      @asgardeo/javascript        │  ← Core: HTTP client, session mgmt, V2 flow APIs
└──────────────────────────────────┘
```

All V2 flow execution lives in `@asgardeo/javascript`; framework SDKs consume the same
`executeEmbeddedSignInFlowV2`, `executeEmbeddedSignUpFlowV2`, and
`executeEmbeddedUserOnboardingFlowV2` functions.

---

## 2. Key Modules (with file paths)

| Module | File | Responsibility |
|--------|------|----------------|
| **AsgardeoReactClient** | `packages/react/src/AsgardeoReactClient.ts` | Framework client: routes `signIn()`/`signUp()` to V2 embedded APIs, manages assertion→session conversion |
| **AsgardeoProvider** | `packages/react/src/contexts/Asgardeo/AsgardeoProvider.tsx` | Root provider: init, polling, auth-state broadcast, V2 `?code=` / `?authId=` handling |
| **AsgardeoContext** | `packages/react/src/contexts/Asgardeo/AsgardeoContext.ts` | TypeScript interface for all provided auth state + actions |
| **useAsgardeo** | `packages/react/src/contexts/Asgardeo/useAsgardeo.ts` | Consumer hook — also injects `meta` and `resolveFlowTemplateLiterals` from FlowMeta + I18n contexts |
| **FlowMetaProvider** | `packages/react/src/contexts/FlowMeta/FlowMetaProvider.tsx` | Fetches `/flow/meta`, injects i18n translations, surfaces `meta` Ref |
| **FlowProvider** | `packages/react/src/contexts/Flow/FlowProvider.tsx` | UI-level flow state: current step, title, messages, navigation |
| **UserProvider** | `packages/react/src/contexts/User/UserProvider.tsx` | SCIM2 user profile + schemas |
| **SignIn (V2)** | `packages/react/src/components/presentation/auth/SignIn/v2/SignIn.tsx` | Lifecycle wrapper: init flow → render steps → complete → session |
| **BaseSignIn (V2)** | `packages/react/src/components/presentation/auth/SignIn/v2/BaseSignIn.tsx` | Core render logic: passkey, OAuth callback, step timeout, form |
| **SignUp (V2)** | `packages/react/src/components/presentation/auth/SignUp/v2/SignUp.tsx` | Lifecycle wrapper for registration flow (`EmbeddedFlowType.Registration`) |
| **BaseSignUp (V2)** | `packages/react/src/components/presentation/auth/SignUp/v2/BaseSignUp.tsx` | Core render logic: heading extraction, OAuth callback, multi-step registration |
| **AcceptInvite (V2)** | `packages/react/src/components/presentation/auth/AcceptInvite/v2/AcceptInvite.tsx` | End-user invite acceptance: extracts `flowId`/`inviteToken` from URL, renders password form |
| **BaseAcceptInvite (V2)** | `packages/react/src/components/presentation/auth/AcceptInvite/v2/BaseAcceptInvite.tsx` | Token validation → OAuth callback → flow execution → password set |
| **InviteUser (V2)** | `packages/react/src/components/presentation/auth/InviteUser/v2/InviteUser.tsx` | Admin invite flow: authenticated requests via `http.request()`, `EmbeddedFlowType.UserOnboarding` |
| **BaseInviteUser (V2)** | `packages/react/src/components/presentation/auth/InviteUser/v2/BaseInviteUser.tsx` | User type selection → details form → invite link generation |
| **AuthOptionFactory** | `packages/react/src/components/presentation/auth/AuthOptionFactory.tsx` | Universal V2 component renderer: TEXT, INPUT, ACTION, BLOCK, STACK, CONSENT, IMAGE, etc. (~850 lines) |
| **useOAuthCallback** | `packages/react/src/hooks/v2/useOAuthCallback.ts` | Reusable hook: detects `?code=` in URL, resolves flowId, submits to server, cleans URL |
| **flowTransformer** | `packages/react/src/utils/v2/flowTransformer.ts` | Transforms flat V2 API response into renderable component tree |
| **passkey** | `packages/react/src/utils/v2/passkey.ts` | WebAuthn `navigator.credentials.create/get` wrappers |
| **buildThemeConfigFromFlowMeta** | `packages/react/src/utils/v2/buildThemeConfigFromFlowMeta.ts` | Converts `/flow/meta` theme into `ThemeConfig` for `createTheme()` |
| **getAuthComponentHeadings** | `packages/react/src/utils/v2/getAuthComponentHeadings.ts` | Extracts `HEADING_*` TEXT components from flow, returns title/subtitle + filtered components |
| **resolveTranslationsInArray** | `packages/react/src/utils/v2/resolveTranslationsInArray.ts` | Resolves `{{t:key}}` template literals in array of components |
| **resolveTranslationsInObject** | `packages/react/src/utils/v2/resolveTranslationsInObject.ts` | Resolves `{{t:key}}` template literals in a component tree object |

---

## 3. Provider Nesting Order

```
<AsgardeoProvider>             ← auth state, session, polling
  <I18nProvider>               ← translation function
    <FlowMetaProvider>         ← /flow/meta data + i18n injection
      <BrandingProvider>       ← branding preferences
        <ThemeProvider>        ← createTheme(), color scheme
          <FlowProvider>       ← UI step navigation, messages
            <UserProvider>     ← SCIM2 profile, schemas
              <OrgProvider>    ← organization context
                {children}
```

**This order matters**: FlowMetaProvider depends on I18nProvider (for translation injection),
ThemeProvider can consume FlowMeta theme data, and FlowProvider/UserProvider need auth state.

---

## 4. End-to-End SignIn Flow (V2 Embedded)

### 4.1 Initialization Sequence

```
User mounts <SignIn />
  │
  ├─ SignIn.tsx reads useAsgardeo() → { signIn, isInitialized, applicationId }
  │
  ├─ Watch: when isInitialized becomes true
  │     │
  │     ├─ Check URL for ?code= (OAuth callback from social IdP)
  │     │   → YES → useOAuthCallback processes it (see §4.3)
  │     │   → NO  → Continue to flow init
  │     │
  │     ├─ Build payload:
  │     │     { flowType: "AUTHENTICATION", applicationId?, flowId?(from sessionStorage) }
  │     │
  │     └─ Call signIn(payload)
  │           │
  │           ├─ AsgardeoReactClient.signIn() detects V2 platform
  │           │   (checks config.platform OR sessionStorage 'asgardeo_platform')
  │           │
  │           └─ Routes to executeEmbeddedSignInFlowV2()
  │                 │
  │                 ├─ POST /flow/execute { flowType, applicationId, verbose: true }
  │                 │
  │                 └─ Returns: { flowId, flowStatus, type, data: { components[] }, links }
  │
  ├─ BaseSignIn receives response → calls flowTransformer()
  │     → Transforms flat components into renderable tree
  │     → Stores flowId in sessionStorage
  │
  └─ AuthOptionFactory.tsx renders components as React elements
```

### 4.2 Step Execution Loop

```
User interacts with form (fills inputs, clicks actions)
  │
  ├─ handleSubmit(flowId, selectedActionId, inputs)
  │     │
  │     ├─ signIn({ flowId, actionId, inputs })
  │     │     → AsgardeoReactClient routes to executeEmbeddedSignInFlowV2()
  │     │     → POST /flow/execute { flowId, actionId, inputs, verbose: true }
  │     │
  │     └─ Response determines next action:
  │           │
  │           ├─ flowStatus: "INCOMPLETE" → render next step components
  │           │
  │           ├─ type: "REDIRECTION" → social IdP popup/redirect (see §4.3)
  │           │
  │           ├─ Passkey challenge → handlePasskeyAuthentication() → WebAuthn API
  │           │
  │           └─ flowStatus: "COMPLETE" → flow completion (see §4.4)
  │
  └─ Step timeout: configurable via props, enforced by setTimeout in effect
```

### 4.3 OAuth Callback (Social IdP / External Redirect)

The React SDK extracts this into a **reusable hook** (`useOAuthCallback`):

```typescript
// packages/react/src/hooks/v2/useOAuthCallback.ts
useOAuthCallback({
  currentFlowId,
  isInitialized,
  onSubmit: (payload) => signIn(payload),  // or signUp(payload)
  onComplete: () => { /* session setup */ },
  onError: (err) => { /* handle error */ },
  onFlowChange: (response) => { /* update flow state */ },
  processedRef,            // optional external ref for dedup
  setFlowId,               // restore flowId from storage
  flowIdStorageKey,         // defaults to 'asgardeo_flow_id'
});
```

**Flow**:
1. Detects `?code=` in URL search params
2. Resolves `flowId` from: component state → sessionStorage → URL param → state param
3. Marks processed via ref (prevents double-execution in StrictMode)
4. Submits `{ flowId, inputs: { code, nonce? } }` to the flow execute endpoint
5. Cleans up URL params via `history.replaceState`
6. Used by: **SignIn**, **SignUp**, and **AcceptInvite** components

### 4.4 Flow Completion & Session Establishment

```
Flow returns flowStatus: "COMPLETE"
  │
  ├─ Server-side (in executeEmbeddedSignInFlowV2):
  │     POST /oauth2/auth/callback { assertion, authId }
  │     → Returns { redirectUrl } with authorization code
  │
  ├─ AsgardeoReactClient.signIn() receives redirectUrl
  │     │
  │     ├─ Parses authorization code from redirectUrl
  │     ├─ Exchanges code for tokens (standard PKCE flow)
  │     │
  │     └─ Alternative V2 session path:
  │           ├─ Decodes assertion JWT
  │           ├─ Calls setSession({
  │           │     access_token: assertion,
  │           │     id_token: assertion,
  │           │     created_at: now,
  │           │     expires_in: exp - now,
  │           │     scope: "openid profile",
  │           │     token_type: "Bearer"
  │           │   })
  │           └─ Stores platform as 'asgardeo-v2' in sessionStorage
  │
  ├─ AsgardeoProvider polling detects sign-in:
  │     ├─ 1s polling interval checks isSignedIn()
  │     ├─ Calls updateSession()
  │     │     ├─ V1: getUser() + fetchUserProfile() via SCIM2
  │     │     └─ V2: extractUserClaimsFromIdToken() (no SCIM2 call)
  │     ├─ Fetches organization context if `user_org` claim present
  │     └─ Updates all reactive state
  │
  └─ UI re-renders with authenticated state
```

---

## 5. SignUp Flow (V2 Embedded)

Structurally mirrors SignIn but with key differences:

| Aspect | SignIn | SignUp |
|--------|--------|--------|
| FlowType | `AUTHENTICATION` | `REGISTRATION` |
| API Function | `executeEmbeddedSignInFlowV2` | `executeEmbeddedSignUpFlowV2` |
| Client Method | `signIn()` | `signUp()` |
| Heading Extraction | Inline | Uses `getAuthComponentHeadings()` utility |
| Post-Complete | Session established | Optional redirect to `afterSignUpUrl` or OAuth redirect |
| OAuth Callback | via `useOAuthCallback` | via `useOAuthCallback` (same hook) |

**SignUp component hierarchy**:
```
<SignUp>                          ← Props: afterSignUpUrl, onError, onComplete
  └─ <BaseSignUp>                ← Core logic: init, OAuth, passkey, step rendering
       ├─ useOAuthCallback()     ← Social provider callback
       ├─ getAuthComponentHeadings()  ← Title/subtitle extraction
       ├─ flowTransformer()      ← Component tree
       └─ <AuthOptionFactory />  ← Render components
```

---

## 6. AcceptInvite Flow (V2)

```
URL: /invite?flowId=xxx&inviteToken=yyy

<AcceptInvite>
  ├─ Extracts flowId + inviteToken from URL query params (or props)
  ├─ Determines baseUrl from props or window.location.origin
  │
  └─ <BaseAcceptInvite>
       │
       ├─ Phase 1: Token Validation
       │     POST /flow/execute { flowId, inputs: { token: inviteToken }, verbose: true }
       │     → unauthenticated fetch (no SDK http client needed)
       │
       ├─ Phase 2: OAuth Callback (if social provider used during invite)
       │     useOAuthCallback({ onSubmit: handleSubmit, ... })
       │
       ├─ Phase 3: Password Form
       │     Renders flow components (typically password + confirm password)
       │     Uses AuthOptionFactory for component rendering
       │
       └─ Phase 4: Completion
             POST /flow/execute { flowId, actionId, inputs: { password } }
             → Redirects to sign-in or shows success
```

**Key difference from SignIn/SignUp**: AcceptInvite uses raw `fetch()` (not the SDK's
authenticated `http.request()`), since the end user is not yet authenticated.

---

## 7. InviteUser Flow (V2 — Admin)

```
<InviteUser>                     ← Requires authenticated admin context
  ├─ Gets { http, baseUrl, isInitialized } from useAsgardeo()
  ├─ Uses http.request() (authenticated) for all API calls
  │
  └─ <BaseInviteUser>
       │
       ├─ Phase 1: Initialize
       │     POST /flow/execute { flowType: "USER_ONBOARDING", verbose: true }
       │     → Returns user type selection or user details form
       │
       ├─ Phase 2: User Details
       │     Renders form: username, email, role selection
       │     POST /flow/execute { flowId, actionId, inputs: { ... } }
       │
       └─ Phase 3: Invite Link Generated
             Response contains invite link
             → Display link + copy-to-clipboard button
             → Optional: email notification
```

**Key difference**: Uses `EmbeddedFlowType.UserOnboarding` and authenticated
requests via the SDK's `http.request()` (passes access token with `system` scope).

---

## 8. useAsgardeo Hook — Enhanced Surface

React's `useAsgardeo` does more than just inject the context:

```typescript
// packages/react/src/contexts/Asgardeo/useAsgardeo.ts
const useAsgardeo = (): AsgardeoContextProps => {
  const context = useContext(AsgardeoContext);         // core auth state
  const flowMetaContext = useContext(FlowMetaContext);  // /flow/meta data
  const i18nContext = useContext(I18nContext);           // translation fn

  return {
    ...context,
    meta: flowMetaContext?.meta ?? null,                // ← injects meta
    resolveFlowTemplateLiterals: (text) =>              // ← template resolution
      resolveFlowTemplateLiterals(text, {
        meta: flowMetaContext?.meta,
        t: i18nContext?.t ?? (key => key),
      }),
  };
};
```

This means **any component** using `useAsgardeo()` gets:
- All auth state + actions (signIn, signOut, user, etc.)
- `meta` — the FlowMeta response
- `resolveFlowTemplateLiterals()` — resolves `{{t:key}}` and `{{meta:path}}` in strings

---

## 9. V2 Utility Functions

### 9.1 flowTransformer
Transforms flat V2 API `components[]` array into a nested renderable tree. Used by
SignIn and SignUp BaseComponents. Framework-agnostic logic (uses `@asgardeo/browser` types).

### 9.2 passkey (WebAuthn)
- `handlePasskeyRegistration(challenge)` — calls `navigator.credentials.create()`
- `handlePasskeyAuthentication(challenge)` — calls `navigator.credentials.get()`
- Both decode base64url challenge data and encode attestation/assertion responses

### 9.3 buildThemeConfigFromFlowMeta
Converts `/flow/meta` theme response (color schemes, border radius, typography, direction)
into a `RecursivePartial<ThemeConfig>` for `createTheme()`. Only sets fields that exist
in the server response (sparse merge, not full replacement).

### 9.4 getAuthComponentHeadings
Recursively searches V2 flow components for `TEXT` type with `HEADING_*` variant.
Returns `{ title, subtitle, headingComponents, componentsWithoutHeadings }`.
Used by **SignUp** and potentially **AcceptInvite** for consistent heading extraction.

### 9.5 resolveTranslationsInArray / resolveTranslationsInObject
Resolves `{{t:i18n.key}}` template literals in component labels and content using
the active i18n translation function.

---

## 10. Session & Security Model

| Mechanism | Implementation |
|-----------|---------------|
| **PKCE** | Standard OAuth2 PKCE for redirect flow |
| **CSRF Protection** | `crypto.randomUUID()` state param stored in sessionStorage with timestamp |
| **V2 Session** | Assertion JWT decoded → `setSession()` with access_token = id_token = assertion |
| **Platform Detection** | `config.platform` or `sessionStorage.getItem('asgardeo_platform')` |
| **StrictMode Guard** | `reRenderCheckRef` prevents double-init in React 18+ StrictMode |
| **Flow Persistence** | `flowId` stored in sessionStorage across page reloads/social IdP redirects |
| **Polling** | Sign-in status: 1s interval; Loading state: 100ms interval |
| **URL Cleanup** | `history.replaceState()` removes `code`, `nonce`, `state`, `error` params |

---

## 11. Component Inventory Summary

| Component | V1 | V2 | Status |
|-----------|----|----|--------|
| SignIn | ✅ Full | ✅ Full | Production |
| SignUp | ✅ Full | ✅ Full | Production |
| AcceptInvite | — | ✅ Full | Production |
| InviteUser | — | ✅ Full | Production |
| AuthOptionFactory | V1 version | V2 version (~850 lines) | Production |
| Callback | ✅ | ✅ | Redirect flow only |
