# Asgardeo SDK Architecture Documentation

This document outlines the class hierarchy, methods, and authentication flow of the Asgardeo SDK.

---

## Table of Contents

1. [SDK Layer Overview](#sdk-layer-overview)
2. [Class Hierarchy](#class-hierarchy)
3. [Package: `@asgardeo/javascript`](#package-asgardeojavascript)
4. [Package: `@asgardeo/browser`](#package-asgardeobrowser)
5. [Package: `@asgardeo/react`](#package-asgardeoreact)
6. [Authentication Flow](#authentication-flow)
7. [Data Flow Diagram](#data-flow-diagram)

---

## SDK Layer Overview

The Asgardeo SDK follows a layered architecture with increasing specificity:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│                   (Your React App)                               │
├─────────────────────────────────────────────────────────────────┤
│                    Context Layer                                 │
│              AsgardeoProvider (React Context)                    │
│     Provides: signIn, signOut, user, isSignedIn, etc.           │
├─────────────────────────────────────────────────────────────────┤
│                    React Client Layer                            │
│                   AsgardeoReactClient                            │
│           React-specific implementation                          │
├─────────────────────────────────────────────────────────────────┤
│                    Browser Client Layer                          │
│                   AsgardeoBrowserClient                          │
│            Browser-specific base class                           │
├─────────────────────────────────────────────────────────────────┤
│                    Core JavaScript Layer                         │
│                  AsgardeoJavaScriptClient                        │
│           Abstract base with interface definition                │
├─────────────────────────────────────────────────────────────────┤
│                    Legacy SPA Client                             │
│                    AsgardeoSPAClient                             │
│            OAuth/OIDC protocol implementation                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Class Hierarchy

```
AsgardeoClient<T> (Interface)
        │
        ▼
AsgardeoJavaScriptClient<T> (Abstract Class)
        │
        ▼
AsgardeoBrowserClient<T> (Abstract Class)
        │
        ▼
AsgardeoReactClient<T> (Concrete Class)
        │
        ▼
AsgardeoProvider (React Context Provider)
```

---

## Package: `@asgardeo/javascript`

### `AsgardeoClient<T>` Interface

The core interface defining authentication functionality.

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `initialize` | `config: T, storage?: Storage` | `Promise<boolean>` | Initializes the client with configuration |
| `reInitialize` | `config: Partial<T>` | `Promise<boolean>` | Re-initializes with partial configuration |
| `signIn` | `options?: SignInOptions, sessionId?: string, onSuccess?: fn` | `Promise<User>` | Initiates redirect-based sign-in |
| `signIn` | `payload: EmbeddedSignInFlowHandleRequestPayload, request: Request, sessionId?: string` | `Promise<User>` | Initiates embedded (App-Native) sign-in |
| `signInSilently` | `options?: SignInOptions` | `Promise<User \| boolean>` | Silent sign-in via iframe |
| `signOut` | `options?: SignOutOptions, afterSignOut?: fn` | `Promise<string>` | Signs out the user |
| `signUp` | `options?: SignUpOptions` | `Promise<void>` | Redirect-based sign-up |
| `signUp` | `payload: EmbeddedFlowExecuteRequestPayload` | `Promise<EmbeddedFlowExecuteResponse>` | Embedded (App-Native) sign-up |
| `getUser` | `options?: any` | `Promise<User>` | Gets current user info |
| `getUserProfile` | `options?: any` | `Promise<UserProfile>` | Gets detailed user profile with schemas |
| `getAccessToken` | `sessionId?: string` | `Promise<string>` | Retrieves access token |
| `exchangeToken` | `config: TokenExchangeRequestConfig, sessionId?: string` | `Promise<TokenResponse \| Response>` | Token exchange (e.g., for org switch) |
| `getMyOrganizations` | `options?: any, sessionId?: string` | `Promise<Organization[]>` | Gets user's organizations |
| `getAllOrganizations` | `options?: any, sessionId?: string` | `Promise<AllOrganizationsApiResponse>` | Gets all available organizations |
| `getCurrentOrganization` | `sessionId?: string` | `Promise<Organization \| null>` | Gets current organization |
| `switchOrganization` | `organization: Organization, sessionId?: string` | `Promise<TokenResponse \| Response>` | Switches to another organization |
| `getConfiguration` | - | `T` | Returns current configuration |
| `isLoading` | - | `boolean` | Checks loading state |
| `isSignedIn` | - | `Promise<boolean>` | Checks if user is signed in |
| `updateUserProfile` | `payload: any, userId?: string` | `Promise<User>` | Updates user profile |
| `setSession` | `sessionData: Record<string, unknown>, sessionId?: string` | `Promise<void>` | Sets session data |
| `clearSession` | `sessionId?: string` | `void` | Clears session |
| `decodeJwtToken` | `token: string` | `Promise<T>` | Decodes JWT token |

### `AsgardeoJavaScriptClient<T>` Abstract Class

Implements `AsgardeoClient<T>` interface. All methods are abstract and must be implemented by subclasses.

```typescript
abstract class AsgardeoJavaScriptClient<T = Config> implements AsgardeoClient<T> {
  // All interface methods declared as abstract
}
```

---

## Package: `@asgardeo/browser`

### `AsgardeoBrowserClient<T>` Abstract Class

Extends `AsgardeoJavaScriptClient` for browser-based applications.

```typescript
abstract class AsgardeoBrowserClient<T = AsgardeoBrowserConfig> 
  extends AsgardeoJavaScriptClient<T> {}
```

### `AsgardeoSPAClient` (Legacy)

The underlying SPA client handling OAuth/OIDC protocols.

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getInstance` | `id?: number` | `AsgardeoSPAClient \| undefined` | Gets singleton instance |
| `initialize` | `config: AuthSPAClientConfig, authHelper?, worker?` | `Promise<boolean>` | Initialize with OAuth config |
| `isInitialized` | - | `Promise<boolean>` | Checks initialization status |
| `signIn` | `config?, authCode?, sessionState?, state?, tokenRequestConfig?` | `Promise<User \| undefined>` | OAuth sign-in flow |
| `signInSilently` | `additionalParams?, tokenRequestConfig?` | `Promise<User \| boolean \| undefined>` | Silent authentication |
| `signOut` | - | `Promise<boolean>` | Sign out user |
| `getUser` | - | `Promise<User \| undefined>` | Get user from session |
| `getAccessToken` | `sessionId?: string` | `Promise<string>` | Get access token |
| `getIdToken` | - | `Promise<string \| undefined>` | Get ID token |
| `getDecodedIdToken` | `sessionId?: string` | `Promise<IdToken \| undefined>` | Decode and return ID token |
| `refreshAccessToken` | - | `Promise<User \| undefined>` | Refresh the access token |
| `revokeAccessToken` | - | `Promise<boolean \| undefined>` | Revoke access token |
| `exchangeToken` | `config: TokenExchangeRequestConfig` | `Promise<Response \| User \| undefined>` | Token exchange |
| `httpRequest` | `config: HttpRequestConfig` | `Promise<HttpResponse \| undefined>` | Authenticated HTTP request |
| `httpRequestAll` | `config: HttpRequestConfig[]` | `Promise<HttpResponse[] \| undefined>` | Multiple authenticated requests |
| `getHttpClient` | - | `HttpClientInstance` | Get HTTP client instance |
| `getOpenIDProviderEndpoints` | - | `Promise<OIDCEndpoints \| undefined>` | Get OIDC endpoints |
| `getConfigData` | - | `Promise<AuthClientConfig \| undefined>` | Get configuration |
| `getStorageManager` | - | `Promise<StorageManager>` | Get storage manager |
| `isSignedIn` | - | `Promise<boolean \| undefined>` | Check sign-in status |
| `isSessionActive` | - | `Promise<boolean \| undefined>` | Check session activity |
| `on` | `hook: Hooks, callback: fn, id?: string` | `Promise<void>` | Register event hooks |
| `enableHttpHandler` | - | `Promise<boolean \| undefined>` | Enable HTTP interceptor |
| `disableHttpHandler` | - | `Promise<boolean \| undefined>` | Disable HTTP interceptor |
| `decodeJwtToken` | `token?: string` | `Promise<T \| undefined>` | Decode any JWT |
| `getCrypto` | - | `Promise<IsomorphicCrypto \| undefined>` | Get crypto utilities |

---

## Package: `@asgardeo/react`

### `AsgardeoReactClient<T>` Class

Extends `AsgardeoBrowserClient` with React-specific implementations.

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `initialize` | `config: AsgardeoReactConfig, storage?: Storage` | `Promise<boolean>` | Initialize client with React config |
| `reInitialize` | `config: Partial<AsgardeoReactConfig>` | `Promise<boolean>` | Re-initialize with new config |
| `getUser` | `options?: any` | `Promise<User>` | Get user via SCIM2 /Me endpoint |
| `getUserProfile` | `options?: any` | `Promise<UserProfile>` | Get full profile with schemas |
| `getDecodedIdToken` | `sessionId?: string` | `Promise<IdToken>` | Get decoded ID token |
| `getMyOrganizations` | `options?, sessionId?` | `Promise<Organization[]>` | Get user's organizations |
| `getAllOrganizations` | `options?, sessionId?` | `Promise<AllOrganizationsApiResponse>` | Get all organizations |
| `getCurrentOrganization` | - | `Promise<Organization \| null>` | Get current org from ID token |
| `switchOrganization` | `organization: Organization, sessionId?` | `Promise<TokenResponse \| Response>` | Switch organization via token exchange |
| `signIn` | `options?: SignInOptions, ...` | `Promise<User>` | Redirect-based sign-in |
| `signIn` | `payload: EmbeddedSignInFlowHandleRequestPayload, ...` | `Promise<User \| EmbeddedSignInFlowResponseV2>` | Embedded sign-in (V2) |
| `signInSilently` | `options?: SignInOptions` | `Promise<User \| boolean>` | Silent sign-in |
| `signOut` | `options?, afterSignOut?` | `Promise<string>` | Sign out |
| `signUp` | `options?: SignUpOptions` | `Promise<void>` | Redirect-based sign-up |
| `signUp` | `payload: EmbeddedFlowExecuteRequestPayload` | `Promise<EmbeddedFlowExecuteResponse>` | Embedded sign-up |
| `exchangeToken` | `config, sessionId?` | `Promise<TokenResponse \| Response>` | Token exchange |
| `request` | `requestConfig?: HttpRequestConfig` | `Promise<HttpResponse<any>>` | Authenticated HTTP request |
| `requestAll` | `requestConfigs?: HttpRequestConfig[]` | `Promise<HttpResponse<any>[]>` | Multiple requests |
| `getAccessToken` | `sessionId?: string` | `Promise<string>` | Get access token |
| `isLoading` | - | `boolean` | Check loading state |
| `isInitialized` | - | `Promise<boolean>` | Check initialization |
| `isSignedIn` | - | `Promise<boolean>` | Check sign-in status |
| `getConfiguration` | - | `T` | Get current config |
| `clearSession` | `sessionId?: string` | `void` | Clear session |
| `setSession` | `sessionData, sessionId?` | `Promise<void>` | Set session data |
| `decodeJwtToken` | `token: string` | `Promise<T>` | Decode JWT |

#### Private/Internal Methods

| Method | Description |
|--------|-------------|
| `setLoading(loading: boolean)` | Set internal loading state |
| `withLoading<T>(operation: () => Promise<T>)` | Wrap async ops with loading management |

### `AsgardeoProvider` React Component

The main context provider wrapping your React application.

#### Props (AsgardeoProviderProps)

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `baseUrl` | `string` | ✓ | - | Asgardeo base URL |
| `clientId` | `string` | ✓ | - | Application client ID |
| `afterSignInUrl` | `string` | ✗ | `window.location.origin` | Redirect URL after sign-in |
| `afterSignOutUrl` | `string` | ✗ | `window.location.origin` | Redirect URL after sign-out |
| `scopes` | `string` | ✗ | - | OAuth scopes (space-separated) |
| `signInUrl` | `string` | ✗ | - | Custom sign-in URL |
| `signUpUrl` | `string` | ✗ | - | Custom sign-up URL |
| `organizationHandle` | `string` | ✗ | - | Organization handle |
| `applicationId` | `string` | ✗ | - | Application ID (for V2) |
| `signInOptions` | `SignInOptions` | ✗ | - | Default sign-in options |
| `syncSession` | `boolean` | ✗ | - | Enable session sync |
| `preferences` | `object` | ✗ | - | Theme and i18n preferences |

#### Context Value (useAsgardeo Hook)

| Property | Type | Description |
|----------|------|-------------|
| `isInitialized` | `boolean` | SDK initialization status |
| `isLoading` | `boolean` | Loading state |
| `isSignedIn` | `boolean` | User sign-in status |
| `user` | `User \| null` | Current user object |
| `organization` | `Organization \| null` | Current organization |
| `baseUrl` | `string` | Base URL |
| `signIn` | `(...args) => Promise<User>` | Sign-in function |
| `signInSilently` | `(options?) => Promise<User \| boolean>` | Silent sign-in |
| `signOut` | `(...args) => Promise<any>` | Sign-out function |
| `signUp` | `(...args) => Promise<any>` | Sign-up function |
| `switchOrganization` | `(org) => Promise<TokenResponse>` | Switch organization |
| `getAccessToken` | `() => Promise<string>` | Get access token |
| `getDecodedIdToken` | `() => Promise<IdToken>` | Get decoded ID token |
| `exchangeToken` | `(config, sessionId?) => Promise<any>` | Token exchange |
| `clearSession` | `(...args) => Promise<any>` | Clear session |
| `reInitialize` | `(config) => Promise<any>` | Re-initialize SDK |
| `http.request` | `(...args) => Promise<any>` | HTTP request helper |
| `http.requestAll` | `(...args) => Promise<any>` | Multiple HTTP requests |

#### Internal State & Effects

| State | Type | Description |
|-------|------|-------------|
| `user` | `User \| null` | Current authenticated user |
| `currentOrganization` | `Organization \| null` | Active organization |
| `myOrganizations` | `Organization[]` | User's organizations |
| `userProfile` | `UserProfile \| null` | Detailed user profile |
| `isSignedInSync` | `boolean` | Synchronized sign-in state |
| `isInitializedSync` | `boolean` | Synchronized init state |
| `isLoadingSync` | `boolean` | Synchronized loading state |
| `brandingPreference` | `BrandingPreference \| null` | Fetched branding |

| Effect | Trigger | Description |
|--------|---------|-------------|
| Initialize SDK | Mount | Calls `asgardeo.initialize(config)` |
| Handle OAuth callback | Mount | Processes auth params from URL |
| Poll sign-in status | Mount | Checks sign-in status every 1s until signed in |
| Track loading state | Continuous | Updates loading state every 100ms |
| Fetch branding | When initialized | Auto-fetches branding preference |

---

## Authentication Flow

### Redirect-Based Sign-In Flow

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Your App   │     │ AsgardeoProvider│     │AsgardeoReact │     │  Asgardeo   │
│             │     │                 │     │   Client     │     │   Server    │
└─────┬───────┘     └───────┬─────────┘     └──────┬───────┘     └──────┬──────┘
      │                     │                      │                     │
      │  1. User clicks     │                      │                     │
      │     "Sign In"       │                      │                     │
      │ ──────────────────> │                      │                     │
      │                     │  2. signIn()         │                     │
      │                     │ ──────────────────>  │                     │
      │                     │                      │  3. Get Sign-In URL │
      │                     │                      │ ──────────────────> │
      │                     │                      │                     │
      │                     │                      │ <────────────────── │
      │                     │                      │  4. Authorization   │
      │                     │                      │      URL            │
      │  5. Redirect to     │                      │                     │
      │     Authorization   │                      │                     │
      │ <══════════════════════════════════════════╪═════════════════>   │
      │                     │                      │                     │
      │                     │                      │      6. User        │
      │                     │                      │    authenticates    │
      │                     │                      │                     │
      │  7. Redirect back   │                      │                     │
      │     with auth code  │                      │                     │
      │ <═══════════════════╪══════════════════════╪═══════════════════  │
      │                     │                      │                     │
      │                     │  8. Detect auth      │                     │
      │                     │     params on mount  │                     │
      │                     │ ──────────────────>  │                     │
      │                     │                      │  9. Exchange code   │
      │                     │                      │     for tokens      │
      │                     │                      │ ──────────────────> │
      │                     │                      │                     │
      │                     │                      │ <────────────────── │
      │                     │                      │  10. Tokens         │
      │                     │                      │                     │
      │                     │ 11. updateSession()  │                     │
      │                     │ <──────────────────  │                     │
      │                     │                      │  12. Get user info  │
      │                     │                      │ ──────────────────> │
      │                     │                      │                     │
      │                     │                      │ <────────────────── │
      │                     │                      │  13. User data      │
      │ 14. isSignedIn=true │                      │                     │
      │     user={...}      │                      │                     │
      │ <────────────────── │                      │                     │
      │                     │                      │                     │
```

### Silent Sign-In Flow (Iframe-based)

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Your App   │     │ AsgardeoReact   │     │  Hidden      │
│             │     │    Client       │     │  Iframe      │
└─────┬───────┘     └───────┬─────────┘     └──────┬───────┘
      │                     │                      │
      │  1. signInSilently()│                      │
      │ ──────────────────> │                      │
      │                     │  2. Create iframe    │
      │                     │     with prompt=none │
      │                     │ ──────────────────>  │
      │                     │                      │
      │                     │                      │ ──── 3. Auth request
      │                     │                      │       to Asgardeo
      │                     │                      │
      │                     │                      │ <─── 4. Response
      │                     │                      │       (tokens or error)
      │                     │                      │
      │                     │ <────────────────────│ 5. postMessage
      │                     │                      │
      │ 6. User or false    │                      │
      │ <────────────────── │                      │
```

### Organization Switch Flow

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Your App   │     │ AsgardeoReact   │     │  Asgardeo    │
│             │     │    Client       │     │   Server     │
└─────┬───────┘     └───────┬─────────┘     └──────┬───────┘
      │                     │                      │
      │ 1. switchOrganization(org)                 │
      │ ──────────────────> │                      │
      │                     │                      │
      │                     │ 2. exchangeToken()   │
      │                     │    grant_type:       │
      │                     │    organization_switch
      │                     │ ──────────────────>  │
      │                     │                      │
      │                     │ <────────────────────│
      │                     │ 3. New tokens        │
      │                     │    for org context   │
      │                     │                      │
      │                     │ 4. updateSession()   │
      │                     │    (fetch user,      │
      │                     │     profile, orgs)   │
      │                     │ ──────────────────>  │
      │                     │                      │
      │ 5. Updated context  │                      │
      │ <────────────────── │                      │
```

---

## Data Flow Diagram

```
                              ┌────────────────────────────────┐
                              │        React Application        │
                              │   useAsgardeo() hook access    │
                              └────────────────┬───────────────┘
                                               │
                              ┌────────────────▼───────────────┐
                              │        AsgardeoProvider         │
                              │  ┌──────────────────────────┐  │
                              │  │ State:                   │  │
                              │  │  - user                  │  │
                              │  │  - isSignedIn            │  │
                              │  │  - isLoading             │  │
                              │  │  - organization          │  │
                              │  │  - userProfile           │  │
                              │  │  - brandingPreference    │  │
                              │  └──────────────────────────┘  │
                              │                                │
                              │  ┌──────────────────────────┐  │
                              │  │ Nested Providers:        │  │
                              │  │  - I18nProvider          │  │
                              │  │  - BrandingProvider      │  │
                              │  │  - ThemeProvider         │  │
                              │  │  - FlowProvider          │  │
                              │  │  - UserProvider          │  │
                              │  │  - OrganizationProvider  │  │
                              │  └──────────────────────────┘  │
                              └────────────────┬───────────────┘
                                               │
                              ┌────────────────▼───────────────┐
                              │       AsgardeoReactClient       │
                              │   - Manages loading state       │
                              │   - Wraps AuthAPI               │
                              │   - API calls (SCIM2, Orgs)     │
                              │   - Platform-aware (V1/V2)      │
                              └────────────────┬───────────────┘
                                               │
                              ┌────────────────▼───────────────┐
                              │           AuthAPI               │
                              │   - Token management            │
                              │   - Session storage             │
                              │   - HTTP client                 │
                              └────────────────┬───────────────┘
                                               │
                              ┌────────────────▼───────────────┐
                              │       AsgardeoSPAClient         │
                              │   - PKCE flow                   │
                              │   - Token refresh               │
                              │   - Session management          │
                              │   - OIDC endpoint discovery     │
                              └────────────────┬───────────────┘
                                               │
                              ┌────────────────▼───────────────┐
                              │       Asgardeo Server           │
                              │   - /oauth2/authorize           │
                              │   - /oauth2/token               │
                              │   - /scim2/Me                   │
                              │   - /o/api/me/organizations     │
                              │   - /api/server/v1/branding     │
                              └────────────────────────────────┘
```

---

## Storage & Session Management

The SDK uses browser storage (SessionStorage by default) to persist:

| Key | Description |
|-----|-------------|
| `access_token` | OAuth access token |
| `id_token` | OIDC ID token |
| `refresh_token` | Token for refreshing access |
| `expires_in` | Token expiry time |
| `session_state` | Session state for OIDC |
| `pkce_code_verifier` | PKCE code verifier |
| `asgardeo_platform` | Platform type (V1/V2) |
| `asgardeo_base_url` | Base URL |
| `asgardeo_auth_id` | Auth ID for V2 flows |
| `asgardeo_flow_id` | Flow ID for embedded flows |

---

## Platform Support

The SDK supports two platforms:

### Asgardeo V1 (Default)
- Traditional OAuth 2.0 / OIDC flows
- SCIM2 user management
- Branding preference API
- Organization management APIs

### Asgardeo V2 (AsgardeoV2)
- Embedded (App-Native) authentication flows
- Assertion-based session management
- Limited API support (SCIM2, Orgs, Branding in progress)

---

## Quick Reference: Common Operations

```typescript
// Get context in component
const { isSignedIn, user, signIn, signOut, getAccessToken } = useAsgardeo();

// Sign in
await signIn();

// Sign in with options
await signIn({ prompt: 'login' });

// Silent sign-in
const result = await signInSilently();

// Get access token for API calls
const token = await getAccessToken();

// Make authenticated request
const response = await http.request({
  url: '/api/resource',
  method: 'GET'
});

// Switch organization
await switchOrganization({ id: 'org-id', name: 'Org Name' });

// Sign out
await signOut();
```

---

## Error Handling

All methods can throw `AsgardeoRuntimeError` with:

| Property | Description |
|----------|-------------|
| `message` | Human-readable error message |
| `code` | Error code (e.g., `AsgardeoReactClient-signIn-Error-001`) |
| `source` | Source package (`react`, `browser`, `javascript`) |
| `description` | Detailed error description |

---

*Last updated: 2025*
