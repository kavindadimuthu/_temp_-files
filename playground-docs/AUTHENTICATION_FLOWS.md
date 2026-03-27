# Authentication Flows in Asgardeo React SDK

This document explains the two distinct authentication modes supported by the Asgardeo React SDK and how they differ architecturally, from both a user-experience and SDK-implementation perspective.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Redirect-Based Authentication (Classic Flow)](#2-redirect-based-authentication-classic-flow)
3. [App-Native / Embedded Authentication](#3-app-native--embedded-authentication)
4. [Side-by-Side Comparison](#4-side-by-side-comparison)
5. [SDK Architecture Deep Dive](#5-sdk-architecture-deep-dive)
6. [API Endpoints & Protocol Differences](#6-api-endpoints--protocol-differences)
7. [V1 vs V2 Platform Differences](#7-v1-vs-v2-platform-differences)
8. [Component Architecture for Embedded Flows](#8-component-architecture-for-embedded-flows)
9. [State Machine: The Embedded Flow Loop](#9-state-machine-the-embedded-flow-loop)
10. [Social Authentication in Embedded Mode](#10-social-authentication-in-embedded-mode)
11. [Adding Support for New Authenticators](#11-adding-support-for-new-authenticators)

---

## 1. Overview

The Asgardeo React SDK supports two fundamental authentication paradigms, controlled by the `FlowMode` enum defined in `packages/javascript/src/models/flow.ts`:

```typescript
export enum FlowMode {
  Redirect = 'REDIRECTION',  // Classic: browser leaves the app to authenticate
  Embedded = 'DIRECT',       // App-native: authentication UI lives inside the app
}
```

These are not cosmetic differences — they represent completely different protocol flows, UI ownership models, and backend API interactions.

---

## 2. Redirect-Based Authentication (Classic Flow)

### What Happens

The application delegates the entire authentication experience to the Identity Provider (Asgardeo). The browser is redirected away from the app, the user authenticates on the IdP's hosted login page, and the browser is redirected back with an authorization code. The app then exchanges this code for tokens.

### Sequence

```
User App                           Asgardeo (IdP)
    │                                    │
    │ ── signIn() called                 │
    │ ── redirect → /oauth2/authorize ──►│
    │                                    │ ← User logs in here
    │                                    │ ← IdP verifies identity
    │ ◄── redirect with ?code=...&state= │
    │                                    │
    │ ──── POST /oauth2/token ──────────►│
    │ ◄─── {access_token, id_token} ─── │
    │                                    │
    │  ─ Store tokens / set session ─    │
    │ ◄── User is now signed in          │
```

### Code Path

```
signIn()  (AsgardeoReactClient)
  └── this.asgardeo.signIn(options)   (from AsgardeoJavaScriptClient)
        └── buildAuthorizeUrl() + navigate()
              └── browser redirects to IdP

<Callback /> component (mounts on /callback route)
  └── extracts ?code + ?state from URL
  └── validates state from sessionStorage (CSRF protection)
  └── forwards code+state to original initiating route
  └── handleSignIn() completes code exchange → tokens stored
```

### Key Files

| File | Role |
|---|---|
| `packages/react/src/components/auth/Callback/Callback.tsx` | Handles the OAuth return, validates state, forwards code |
| `packages/browser/src/utils/navigate.ts` | Cross-browser navigation utility |
| `packages/javascript/src/utils/getAuthorizeRequestUrlParams.ts` | Builds the `/oauth2/authorize` URL params |
| `packages/javascript/src/AsgardeoJavaScriptClient.ts` | Core `signIn()` / token exchange logic |

### What the App Developer Does

```tsx
// 1. Wrap app with provider
<AsgardeoProvider config={{ clientId, baseUrl, redirectUri }}>
  <App />
</AsgardeoProvider>

// 2. Trigger sign-in (redirects away)
const { signIn } = useAsgardeo();
<SignInButton onClick={signIn} />

// 3. Register a callback route
<Route path="/callback" element={<Callback onNavigate={navigate} />} />

// 4. User comes back authenticated — no further action needed
```

---

## 3. App-Native / Embedded Authentication

### What Happens

The application owns the authentication UI. The IdP's `/oauth2/authorize` endpoint accepts a POST request and responds with a JSON description of what UI step to render next (instead of serving HTML). The app renders each step as native React components. Credentials are submitted directly via API calls. The user never leaves the application.

This is also called **App-Native Authentication** and is documented by WSO2 at https://is.docs.wso2.com/en/7.1.0/references/app-native-authentication/.

### Sequence (V1 Platform)

```
User App                                  Asgardeo (IdP)
    │                                          │
    │ ── POST /oauth2/authorize ──────────────►│
    │    (form-encoded PKCE params)            │
    │ ◄── { flowId, nextStep: { authenticators, stepType } }
    │                                          │
    │  ─ render form from authenticator params ─
    │                                          │
    │ ── POST /oauth2/authn ──────────────────►│
    │    { flowId, selectedAuthenticator: { authenticatorId, params: {username, password} } }
    │ ◄── { flowStatus: "INCOMPLETE", nextStep: {...} }   (multi-step)
    │    OR                                    │
    │ ◄── { flowStatus: "SUCCESS_COMPLETED", authData: { code, state } }
    │                                          │
    │  ─ exchange code for tokens (standard PKCE)
    │ ── POST /oauth2/token ──────────────────►│
    │ ◄── { access_token, id_token, ... } ─── │
```

### Sequence (V2 Platform)

```
User App                                  Asgardeo V2
    │                                          │
    │ ── GET /flow/meta?id={appId}&type=APP ──►│
    │ ◄── { theme, i18n, design config } ─────│
    │                                          │
    │ ── POST /flow/execute ──────────────────►│
    │    { applicationId, flowType: "AUTHENTICATION", verbose: true }
    │ ◄── { flowId, flowStatus: "INCOMPLETE", data: { components: [...] } }
    │                                          │
    │  ─ render UI from component descriptors ─
    │                                          │
    │ ── POST /flow/execute ──────────────────►│
    │    { flowId, actionId, inputs: { username, password } }
    │ ◄── { flowStatus: "COMPLETE", assertion: "<JWT>" }
    │                                          │
    │ ── POST /oauth2/auth/callback ──────────►│
    │    { assertion, authId }                 │
    │ ◄── { redirect_uri }  ──────────────────│
    │                                          │
    │  ─ decode assertion, set session tokens  │
```

### Code Path

```
<SignIn /> or <SignUp />
  └── <BaseSignIn /> / <BaseSignUp />
        └── Platform router: V1 or V2 component based on config.platform
              │
              ├── V1: BaseSignInV1.tsx
              │     ├── onInitialize() → initializeEmbeddedSignInFlow()
              │     │   └── POST /oauth2/authorize (form-encoded) → flowId + authenticators
              │     ├── Renders form via FieldFactory based on authenticator.metadata.params
              │     └── onSubmit() → executeEmbeddedSignInFlow()
              │         └── POST /oauth2/authn (JSON) → next step or success
              │
              └── V2: BaseSignInV2.tsx
                    ├── Reads authId from URL (set at app launch by server)
                    ├── Fetches metadata via getFlowMetaV2() → theme/i18n
                    ├── onSubmit() → executeEmbeddedSignInFlowV2()
                    │   ├── POST /flow/execute → components or assertion
                    │   └── If assertion: POST /oauth2/auth/callback → redirectUrl
                    └── Sets session with decoded assertion claims
```

### Key Files

| File | Role |
|---|---|
| `packages/javascript/src/api/initializeEmbeddedSignInFlow.ts` | V1: initiates flow, gets first step |
| `packages/javascript/src/api/executeEmbeddedSignInFlow.ts` | V1: submits credentials, gets next/final step |
| `packages/javascript/src/api/v2/executeEmbeddedSignInFlowV2.ts` | V2: single endpoint for all steps + callback |
| `packages/javascript/src/api/v2/getFlowMetaV2.ts` | V2: fetches theme, i18n, app config |
| `packages/react/src/components/presentation/auth/SignIn/BaseSignIn.tsx` | Platform router for sign-in |
| `packages/react/src/components/presentation/auth/SignIn/v1/BaseSignIn.tsx` | V1 embedded sign-in UI logic |
| `packages/react/src/components/factories/FieldFactory.tsx` | Renders the correct input per field type |
| `packages/react/src/hooks/v2/useOAuthCallback.ts` | Handles OAuth code forwarded from `/callback` |
| `packages/javascript/src/models/embedded-signin-flow.ts` | V1 type definitions for the flow |
| `packages/javascript/src/models/embedded-flow.ts` | Shared types (EmbeddedFlowComponentType, etc.) |
| `packages/javascript/src/constants/ApplicationNativeAuthenticationConstants.ts` | Authenticator ID constants |

---

## 4. Side-by-Side Comparison

| Dimension | Redirect (Classic) | Embedded (App-Native) |
|---|---|---|
| **Where the user authenticates** | IdP-hosted login page (out of app) | Inside the app itself |
| **Browser navigation** | Full redirect away + redirect back | No navigation (SPA stays mounted) |
| **Who owns the UI** | Identity Provider | The application developer |
| **Protocol start** | `GET /oauth2/authorize` (redirect) | `POST /oauth2/authorize` (API call, V1) or `POST /flow/execute` (V2) |
| **Credential submission** | HTML form on IdP page | JSON `POST /oauth2/authn` or `/flow/execute` |
| **Multi-step MFA** | Handled by IdP between redirects | Each new step returns a new `nextStep` object for the app to render |
| **Social login** | Full redirect to social provider | Popup window approach (see §10) |
| **Token delivery** | `POST /oauth2/token` after code exchange | Same token exchange (V1) or assertion-based (V2) |
| **PKCE** | Required (standard OIDC) | Required (V1) / Handled differently (V2) |
| **Session management** | Standard browser storage | Standard (V1) or assertion-decoded tokens (V2) |
| **Config requirement** | `flowMode: FlowMode.Redirect` (default) | `flowMode: FlowMode.Embedded` |
| **Main UI component** | `<Callback />` (headless route handler) | `<SignIn />` / `<SignUp />` (full form components) |

---

## 5. SDK Architecture Deep Dive

The SDK is built in three layers, each extending the previous:

```
packages/javascript/src/AsgardeoJavaScriptClient.ts
  │  Core OIDC logic: token management, PKCE, storage, user info
  │
packages/browser/src/AsgardeoBrowserClient.ts  (extends JavaScript client)
  │  Browser-specific: theme detection, WebAuthn, navigate(), URL utilities
  │
packages/react/src/AsgardeoReactClient.ts  (extends Browser client)
   React-specific: overrides signIn() to route to embedded or redirect
   Manages loading state, multi-instance support, platform detection
```

### How `signIn()` Routes to the Right Flow

`AsgardeoReactClient.signIn()` is the critical dispatch point:

```typescript
// Simplified from AsgardeoReactClient.ts
override async signIn(options?: any) {
  const config = await this.asgardeo.getConfigData();

  // Platform check: V2 embedded
  if (config.platform === Platform.AsgardeoV2 && hasEmbeddedParams) {
    return executeEmbeddedSignInFlowV2({ authId, baseUrl, payload });
  }

  // V1 embedded (execute step)
  if (isEmbeddedExecuteCall) {
    return executeEmbeddedSignInFlow({ payload, url });
  }

  // V1 embedded (initialize)
  if (isEmbeddedInitCall) {
    return initializeEmbeddedSignInFlow({ payload, url });
  }

  // Default: redirect-based
  return this.asgardeo.signIn(options);
}
```

The same `signIn()` method on the client handles all variants. Callers differentiate by the shape of the arguments they pass.

### Context Providers Involved in Embedded Flow

```
<AsgardeoProvider>         ← Client instance, isSignedIn, signIn/Out
  <FlowMetaProvider>       ← V2 only: fetches theme/i18n from /flow/meta
    <FlowProvider>         ← Current step state, messages, loading, navigation
      <I18nProvider>       ← Translations (fed from FlowMeta on V2, bundled on V1)
        <ThemeProvider>    ← CSS variables / design tokens
          <SignIn />       ← The form component that orchestrates the flow
```

`FlowProvider` (`packages/react/src/contexts/Flow/`) is the embedded-flow-specific state store. It is not used in redirect-based flows. It holds:

- `currentStep` — which UI step is active (login, MFA, consent, etc.)
- `messages` — error/info messages displayed in the form  
- `isLoading` — locks the form during API calls
- `navigateToFlow()` — transitions between named steps (e.g., switch from sign-in to sign-up)

---

## 6. API Endpoints & Protocol Differences

### V1 Embedded Flow

| Step | Method | Endpoint | Content-Type | Body |
|---|---|---|---|---|
| Initialize | `POST` | `/oauth2/authorize` | `application/x-www-form-urlencoded` | PKCE + OIDC params |
| Submit credentials | `POST` | `/oauth2/authn` | `application/json` | `{ flowId, selectedAuthenticator: { authenticatorId, params } }` |
| Exchange code | `POST` | `/oauth2/token` | `application/x-www-form-urlencoded` | Standard PKCE token exchange |

The critical difference from redirect: the **initialize** call returns JSON (`EmbeddedSignInFlowInitiateResponse`) instead of redirecting the browser.

### V2 Embedded Flow

| Step | Method | Endpoint | Content-Type | Body |
|---|---|---|---|---|
| Fetch metadata | `GET` | `/flow/meta?id=&type=APP` | — | — |
| Initialize flow | `POST` | `/flow/execute` | `application/json` | `{ applicationId, flowType: "AUTHENTICATION", verbose: true }` |
| Submit step | `POST` | `/flow/execute` | `application/json` | `{ flowId, actionId, inputs: {...} }` |
| Complete sign-in | `POST` | `/oauth2/auth/callback` | `application/json` | `{ assertion, authId }` |

In V2, the `/flow/execute` endpoint handles the entire flow lifecycle — there is no separate initialize endpoint.

### `verbose: true` Flag (V2 Only)

When a V2 request payload only contains `applicationId` + `flowType` (first call), or only `flowId` (retry), the SDK automatically adds `verbose: true`. This tells the server to include full component descriptors (the complete UI tree) rather than a minimal response:

```typescript
// From executeEmbeddedSignInFlowV2.ts
const hasOnlyAppIdAndFlowType =
  payload.applicationId && payload.flowType && Object.keys(payload).length === 2;
const requestPayload = hasOnlyAppIdAndFlowType ? { ...payload, verbose: true } : payload;
```

---

## 7. V1 vs V2 Platform Differences

The SDK supports two Asgardeo platform generations. The value `Platform.AsgardeoV1` / `Platform.AsgardeoV2` is set in the client config and also persisted to `sessionStorage` under `asgardeo_platform`.

### V1 Differences

- Uses WSO2 Identity Server's App-Native Authentication API
- Flow is initiated via `/oauth2/authorize` (form POST)
- Each step submitted via `/oauth2/authn` (JSON POST)
- Components are described via `EmbeddedSignInFlowAuthenticator.metadata.params`
- `FlowMeta` is not used (theme/i18n loaded separately)
- Success: server returns an authorization code via `authData.code`, standard PKCE exchange follows

### V2 Differences

- Uses the new Asgardeo V2 Flow API
- Single `/flow/execute` endpoint for all steps
- Server returns a full component tree (`data.components[]`) of type `EmbeddedFlowComponent`
- `FlowMeta` API (`/flow/meta`) is available and provides bundled theme + i18n translations
- Success: server returns a signed `assertion` JWT
- Tokens are set by decoding the assertion (no separate `/oauth2/token` call for the initial sign-in)
- Sign-in completion requires a second call to `/oauth2/auth/callback` with `{ assertion, authId }`

### `authId`

`authId` is a V2 concept. It is a session identifier provided by the server to the app at startup (typically embedded in the page's HTML or passed as a URL param). It links the `/flow/execute` flow to the OAuth2 session. Without it, the `/oauth2/auth/callback` cannot be called.

The React client persists `authId` in `sessionStorage` during V2 sign-up flows:

```typescript
// AsgardeoReactClient.ts (sign-up)
const authId = urlParams.get('authId');
if (authId) {
  sessionStorage.setItem('asgardeo_auth_id', authId);
}
```

---

## 8. Component Architecture for Embedded Flows

### The Rendering Pipeline

The embedded flow turns server-described UI into React components. The pipeline is:

```
Server Response (JSON)
  └── nextStep.authenticators[].metadata.params  (V1)
  └── data.components[]  (V2)
        │
        ▼
  FieldFactory.createField(config: FieldConfig)
        │
        ├── FieldType.Password   → <PasswordField />
        ├── FieldType.Text       → <TextField type="text" />
        ├── FieldType.Email      → <TextField type="email" />
        ├── FieldType.Otp        → <OtpField />
        ├── FieldType.Checkbox   → <Checkbox />
        ├── FieldType.Select     → <Select />
        ├── FieldType.Date       → <DatePicker />
        └── FieldType.Number     → <TextField type="number" />
```

`FieldFactory` is in `packages/react/src/components/factories/FieldFactory.tsx`. Its purpose is to separate field-type logic from the form-rendering components.

### Adapter Components

Beyond inputs, adapters in `packages/react/src/components/adapters/` are pre-built UI elements that map to common embedded flow scenarios:

| Adapter | When Used |
|---|---|
| `GoogleButton.tsx` | Authenticator ID matches Google OIDC |
| `GitHubButton.tsx` | Authenticator ID matches GitHub |
| `MicrosoftButton.tsx` | Authenticator ID matches Microsoft OIDC |
| `FacebookButton.tsx` | Authenticator ID matches Facebook |
| `LinkedInButton.tsx` | Authenticator ID matches LinkedIn OIDC |
| `SignInWithEthereumButton.tsx` | Authenticator ID matches SIWE |
| `SmsOtpButton.tsx` | Authenticator = SMS OTP |
| `PasswordInput.tsx` | password-type param |
| `EmailInput.tsx` | email-type param |
| `OtpField` (primitive) | OTP/TOTP step |
| `Consent.tsx` | Consent step with purposes/attributes |
| `FlowTimer.tsx` | Steps with an expiry (e.g., OTP timeout) |

The `BaseSignIn` component decides which adapter to render by checking `authenticator.authenticatorId` against the constants in `ApplicationNativeAuthenticationConstants.SupportedAuthenticators`.

### Authenticated Step Types

The server describes what kind of prompt each step is (`EmbeddedSignInFlowAuthenticatorPromptType`):

```typescript
enum EmbeddedSignInFlowAuthenticatorPromptType {
  UserPrompt = 'USER_PROMPT',          // Show a form: username/password, OTP, etc.
  RedirectionPrompt = 'REDIRECTION_PROMPT', // Social login: open popup, wait for code
  InternalPrompt = 'INTERNAL_PROMPT',  // Passkey/FIDO2: browser API call
}
```

The component renders a **completely different UI** depending on this value:

- `USER_PROMPT` → render input fields from `metadata.params` via `FieldFactory`
- `REDIRECTION_PROMPT` → render a social button that opens a popup window
- `INTERNAL_PROMPT` → call the WebAuthn browser API directly with no visible form

---

## 9. State Machine: The Embedded Flow Loop

The embedded sign-in component runs a loop that terminates at either success or a non-recoverable error. The `flowStatus` field in each response drives the transitions.

### V1 State Machine

```
        ┌──────────────────┐
        │   NOT_STARTED    │
        └────────┬─────────┘
                 │ onInitialize()
                 │ POST /oauth2/authorize
                 ▼
        ┌──────────────────┐
        │   INCOMPLETE     │◄─────────────────────────────┐
        │  (render step)   │                              │
        └────────┬─────────┘                              │
                 │ user submits form                       │
                 │ onSubmit()                              │
                 │ POST /oauth2/authn                      │
                 ▼                                         │
        ┌──────────────────┐            ┌─────────────────┴──────┐
        │ check flowStatus │────────────►    INCOMPLETE again     │
        └────────┬─────────┘            │  (next step added)     │
                 │                      └────────────────────────┘
                 │ SUCCESS_COMPLETED
                 ▼
        ┌──────────────────┐
        │   EXCHANGE CODE  │
        │ POST /token      │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │  SESSION STORED  │
        │  onSuccess()     │
        └──────────────────┘
```

**`flowStatus` Values (V1)**:

| Value | Meaning |
|---|---|
| `INCOMPLETE` | More steps remain, `nextStep` contains the next authenticator(s) |
| `SUCCESS_COMPLETED` | Auth done, `authData.code` is available for token exchange |
| `FAIL_COMPLETED` | Auth failed, no retry possible |
| `FAIL_INCOMPLETE` | Auth failed but retry is possible (e.g., wrong password) |

### `stepType` Values

| Value | Meaning |
|---|---|
| `AUTHENTICATOR_PROMPT` | Only one authenticator to complete (show its form) |
| `MULTI_OPTIONS_PROMPT` | User must pick from multiple authenticator options |

---

## 10. Social Authentication in Embedded Mode

Social providers (Google, GitHub, etc.) require a browser redirect to the provider's OAuth endpoint, which breaks the "no redirect" principle of embedded auth. The SDK handles this with a **popup pattern**:

### How It Works

1. Server returns a step with `promptType: 'REDIRECTION_PROMPT'` and an `additionalData.redirectUrl`
2. The component opens `window.open(redirectUrl, 'social-auth-popup', '...')`
3. The user authenticates in the popup (full redirect cycle happens inside it)
4. The popup's callback URL is handled by `<Callback />`, which detects it is in a popup and posts a message to the opener:

```typescript
// Callback detects it's in a popup
if (window.opener) {
  window.opener.postMessage({ code, state }, window.location.origin);
  window.close();
}
```

5. The main window has an event listener for this message:

```typescript
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return; // Security check
  const { code, state } = event.data;
  // Submit code to continue the embedded flow
  onSubmit({ flowId, selectedAuthenticator: { authenticatorId, params: { code } } });
});
```

6. The embedded flow continues from the main window as if the user had submitted a form.

### Security Consideration

The `postMessage` listener validates `event.origin` against `window.location.origin` to prevent cross-origin message injection. Never remove or loosen this check.

---

## 11. Adding Support for New Authenticators

As an SDK developer, adding support for a new embedded-flow authenticator (e.g., a new social provider or a new MFA method) involves changes at multiple layers.

### Step 1: Add Authenticator ID Constant

In `packages/javascript/src/constants/ApplicationNativeAuthenticationConstants.ts`:

```typescript
const ApplicationNativeAuthenticationConstants = {
  SupportedAuthenticators: {
    // Existing...
    NewProvider: 'base64EncodedAuthenticatorId==',
  },
} as const;
```

### Step 2: Create an Adapter Component

In `packages/react/src/components/adapters/NewProviderButton.tsx`:

```typescript
const NewProviderButton: FC<NewProviderButtonProps> = ({ isLoading, ...rest }) => {
  const { t } = useTranslation();
  return (
    <Button fullWidth color="secondary" disabled={isLoading} startIcon={<NewProviderIcon />}>
      {t('elements.buttons.newProvider.text')}
    </Button>
  );
};
```

### Step 3: Add i18n Keys

In the i18n package (`packages/i18n/src/`), add translation keys for the new button/step text.

### Step 4: Handle the Authenticator in BaseSignIn

In `packages/react/src/components/presentation/auth/SignIn/v1/BaseSignIn.tsx`, the component maps authenticator IDs to adapters. Add a case for the new authenticator that renders the correct adapter and handles the `promptType` appropriately.

### Step 5: Handle `REDIRECTION_PROMPT` (if social)

If the new authenticator requires a browser redirect (like OAuth), it will return `promptType: 'REDIRECTION_PROMPT'`. The popup pattern described in §10 handles this generically — no additional code should be needed as long as the authenticator follows the standard pattern.

### Step 6: Export the New Adapter

Add the new adapter to `packages/react/src/index.ts`.

---

## Summary Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Asgardeo React SDK                               │
│                                                                     │
│  config.flowMode                                                    │
│       │                                                             │
│       ├── FlowMode.Redirect ────────────────────────────────────►  │
│       │       AsgardeoJavaScriptClient.signIn()                    │
│       │       → buildAuthorizeUrl() → navigate() → IdP page        │
│       │       ← browser redirected back → <Callback />             │
│       │       → handleSignIn() → POST /token → store session       │
│       │                                                             │
│       └── FlowMode.Embedded ───────────────────────────────────►  │
│               AsgardeoReactClient.signIn() (overridden)             │
│               │                                                     │
│               ├── Platform.AsgardeoV1                               │
│               │   → initializeEmbeddedSignInFlow()                  │
│               │     POST /oauth2/authorize → { flowId, nextStep }   │
│               │   → <BaseSignInV1 renders form from nextStep>       │
│               │   → executeEmbeddedSignInFlow()                     │
│               │     POST /oauth2/authn → loop until SUCCESS         │
│               │   → POST /oauth2/token → store session              │
│               │                                                     │
│               └── Platform.AsgardeoV2                               │
│                   → getFlowMetaV2() GET /flow/meta → theme/i18n     │
│                   → executeEmbeddedSignInFlowV2()                   │
│                     POST /flow/execute → { components[] }           │
│                   → <BaseSignInV2 renders from components[]>        │
│                   → POST /flow/execute → { assertion }              │
│                   → POST /oauth2/auth/callback → { redirect_uri }   │
│                   → decode assertion → store session                │
└─────────────────────────────────────────────────────────────────────┘
```
