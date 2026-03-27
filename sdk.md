# Asgardeo SDK Architecture Guide

## Overview

The Asgardeo SDK follows a **layered architecture** with three main packages that build upon each other:

```
┌─────────────────────────────────────────────────────────────────┐
│                        @asgardeo/react                          │
│  (React-specific components, hooks, providers, context)         │
├─────────────────────────────────────────────────────────────────┤
│                       @asgardeo/browser                         │
│  (Browser-specific: storage, HTTP client, session management)   │
├─────────────────────────────────────────────────────────────────┤
│                      @asgardeo/javascript                       │
│  (Core: crypto, storage manager, authentication logic, models)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. JavaScript Package (`@asgardeo/javascript`)

This is the **foundation layer** containing platform-agnostic authentication logic.

### Key Components:

| File | Purpose |
|------|---------|
| AsgardeoJavaScriptClient.ts | Abstract base class defining the client interface |
| StorageManager.ts | Manages storing/retrieving session, config, and tokens |
| IsomorphicCrypto.ts | Cryptographic utilities (PKCE, JWT validation) |
| client.ts | Legacy `AsgardeoAuthClient` - core authentication logic |

### Core Responsibilities:

1. **Configuration Management**: Stores and retrieves SDK configuration
2. **Token Handling**: 
   - PKCE flow (code verifier/challenge generation)
   - Access token requests
   - Token refresh
   - ID token validation
3. **OIDC Discovery**: Fetches and caches OpenID Connect endpoints from `.well-known`
4. **Session Management**: Manages session data across storage

### Client Interface (`AsgardeoClient<T>`)

```typescript
// packages/javascript/src/models/client.ts
interface AsgardeoClient<T> {
  initialize(config: T, storage?: Storage): Promise<boolean>;
  signIn(options?: SignInOptions): Promise<User>;
  signOut(options?: SignOutOptions): Promise<string>;
  getUser(): Promise<User>;
  isSignedIn(): Promise<boolean>;
  getAccessToken(): Promise<string>;
  exchangeToken(config: TokenExchangeRequestConfig): Promise<TokenResponse>;
  switchOrganization(organization: Organization): Promise<TokenResponse>;
  // ... more methods
}
```

---

## 2. Browser Package (`@asgardeo/browser`)

Extends the JavaScript package with **browser-specific implementations**.

### Key Components:

| File | Purpose |
|------|---------|
| AsgardeoBrowserClient.ts | Abstract class extending `AsgardeoJavaScriptClient` |
| client.ts | `AsgardeoSPAClient` - SPA authentication client |
| main-thread-client.ts | Main thread authentication implementation |
| web-worker-client.ts | Web worker-based secure token storage |
| axios-http-client.ts | HTTP client with interceptors for token attachment |
| session-management-helper.ts | Session check via hidden iframe |

### Storage Options

The browser package supports three storage modes:

```typescript
enum BrowserStorage {
  SessionStorage,  // Default - tokens in sessionStorage
  LocalStorage,    // Tokens persist across tabs/sessions  
  WebWorker        // Most secure - tokens isolated in web worker
}
```

### Initialization Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      AsgardeoSPAClient.initialize()                       │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │     Check Storage Type        │
                    └───────────────┬───────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
    │ MainThread    │      │ MainThread    │      │ WebWorker     │
    │ Client        │      │ Client        │      │ Client        │
    │(SessionStore) │      │ (LocalStore)  │      │(MemoryStore)  │
    └───────┬───────┘      └───────┬───────┘      └───────┬───────┘
            │                      │                      │
            └──────────────────────┼──────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │  AsgardeoAuthClient.init()  │
                    │  - Store config             │
                    │  - Fetch OIDC endpoints     │
                    └─────────────────────────────┘
```

### Authentication (Sign-In) Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        User clicks "Sign In"                              │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │  AsgardeoSPAClient.signIn()   │
                    └───────────────┬───────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            │                                               │
            ▼                                               ▼
┌─────────────────────────┐                   ┌─────────────────────────┐
│  First Call (No Code)   │                   │ Redirect Callback       │
│  - Generate PKCE        │                   │ (Has code & state)      │
│  - Store code_verifier  │                   └────────────┬────────────┘
│  - Build auth URL       │                                │
│  - Redirect to IdP      │                   ┌────────────┴────────────┐
└─────────────────────────┘                   │  requestAccessToken()   │
                                              │  - Exchange code        │
                                              │  - Validate ID token    │
                                              │  - Store tokens         │
                                              └────────────┬────────────┘
                                                           │
                                              ┌────────────┴────────────┐
                                              │  Return User object     │
                                              └─────────────────────────┘
```

### HTTP Client with Token Attachment

The HTTP client automatically attaches access tokens to requests:

```typescript
// packages/browser/src/__legacy__/http-client/clients/axios-http-client.ts
class HttpClient {
  static getInstance(instanceId?: number): HttpClientInstance;
  
  async requestHandler(request: HttpRequestConfig): Promise<HttpRequestConfig> {
    // Attaches access token to Authorization header
    // request.headers['Authorization'] = `Bearer ${accessToken}`;
  }
}
```

---

## 3. React Package (`@asgardeo/react`)

Provides **React-specific abstractions** using Context API, hooks, and components.

### Key Components:

| File | Purpose |
|------|---------|
| AsgardeoReactClient.ts | React client extending `AsgardeoBrowserClient` |
| AsgardeoProvider.tsx | Main context provider for auth state |
| AsgardeoContext.ts | React context definition |

### Inheritance Chain

```typescript
// React → Browser → JavaScript
class AsgardeoReactClient extends AsgardeoBrowserClient<AsgardeoReactConfig> {
  // Uses AuthAPI from __temp__ which wraps legacy AsgardeoSPAClient
  private asgardeo: AuthAPI;
  
  override async signIn(): Promise<User> { ... }
  override async signOut(): Promise<string> { ... }
  // ... overrides all abstract methods
}

abstract class AsgardeoBrowserClient<T> extends AsgardeoJavaScriptClient<T> {}

abstract class AsgardeoJavaScriptClient<T> implements AsgardeoClient<T> {}
```

### AsgardeoProvider - The Heart of React Integration

```tsx
// packages/react/src/contexts/Asgardeo/AsgardeoProvider.tsx
const AsgardeoProvider: FC<AsgardeoProviderProps> = ({
  baseUrl,
  clientId,
  afterSignInUrl,
  children,
  ...
}) => {
  // Creates the React client instance
  const asgardeo = useMemo(() => new AsgardeoReactClient(id), [id]);
  
  // State management
  const [user, setUser] = useState<User | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize on mount
  useEffect(() => {
    asgardeo.initialize(config);
  }, []);
  
  // Handle auth callback
  useEffect(() => {
    if (hasAuthParams(url)) {
      signIn();  // Exchange code for tokens
    }
  }, []);
  
  // Context value with all auth functions
  return (
    <AsgardeoContext.Provider value={{
      signIn, signOut, user, isSignedIn, isLoading, ...
    }}>
      <I18nProvider>
        <BrandingProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </BrandingProvider>
      </I18nProvider>
    </AsgardeoContext.Provider>
  );
};
```

### Provider Hierarchy

The SDK wraps your app with multiple providers:

```
AsgardeoProvider
  └── I18nProvider (internationalization)
       └── BrandingProvider (theme from Asgardeo branding API)
            └── ThemeProvider (MUI/custom theming)
                 └── FlowProvider (embedded auth flows)
                      └── UserProvider (user profile management)
                           └── OrganizationProvider (org switching)
                                └── {children}  ← Your App
```

---

## Complete Execution Flow

### 1. Application Startup

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          App Renders                                     │
│                               │                                          │
│                               ▼                                          │
│                    ┌─────────────────────┐                               │
│                    │   AsgardeoProvider  │                               │
│                    │   (with config)     │                               │
│                    └──────────┬──────────┘                               │
│                               │                                          │
│              ┌────────────────┼────────────────┐                         │
│              ▼                ▼                ▼                         │
│    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐          │
│    │ Create Client   │ │ Initialize SDK  │ │ Check for Auth  │          │
│    │ (AsgardeoReact  │ │ (fetch OIDC     │ │ Params in URL   │          │
│    │  Client)        │ │  endpoints)     │ │ (code, state)   │          │
│    └─────────────────┘ └─────────────────┘ └─────────────────┘          │
│                               │                                          │
│                               ▼                                          │
│            ┌──────────────────────────────────────┐                      │
│            │  If auth params found → signIn()     │                      │
│            │  Exchange code → Get tokens          │                      │
│            │  Update state (user, isSignedIn)     │                      │
│            └──────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Sign-In Flow (OAuth 2.0 Authorization Code + PKCE)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Sign-In Flow                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Your App]          [SDK]              [Asgardeo IdP]      [Token EP]   │
│      │                 │                      │                 │        │
│      │─── signIn() ───►│                      │                 │        │
│      │                 │                      │                 │        │
│      │                 │─── Generate PKCE ───►│                 │        │
│      │                 │    (code_verifier,   │                 │        │
│      │                 │     code_challenge)  │                 │        │
│      │                 │                      │                 │        │
│      │                 │─── Store verifier ──►│                 │        │
│      │                 │    in storage        │                 │        │
│      │                 │                      │                 │        │
│      │◄── Redirect ────│──────────────────────►                 │        │
│      │    to /authorize                       │                 │        │
│      │    (with challenge)                    │                 │        │
│      │                                        │                 │        │
│      │                      User Authenticates                  │        │
│      │                            │                             │        │
│      │◄───── Redirect ────────────┘                             │        │
│      │       with code + state                                  │        │
│      │                 │                      │                 │        │
│      │                 │◄── Extract code ─────│                 │        │
│      │                 │    from URL          │                 │        │
│      │                 │                      │                 │        │
│      │                 │─── Exchange code + verifier ───────────►        │
│      │                 │                      │                 │        │
│      │                 │◄──── Tokens ──────────────────────────│        │
│      │                 │    (access, refresh, id)              │        │
│      │                 │                      │                 │        │
│      │                 │─── Validate ID ─────►│                 │        │
│      │                 │    Token (JWT)       │                 │        │
│      │                 │                      │                 │        │
│      │                 │─── Store tokens ────►│                 │        │
│      │                 │                      │                 │        │
│      │◄── User info ───│                      │                 │        │
│      │                 │                      │                 │        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Making Authenticated API Calls

```typescript
// In your React component
const { http } = useContext(AsgardeoContext);

// SDK automatically attaches access token
const response = await http.request({
  url: 'https://api.asgardeo.io/t/org/scim2/Me',
  method: 'GET'
});

// Under the hood:
// 1. HttpClient intercepts request
// 2. Gets access token from storage
// 3. Attaches: Authorization: Bearer <access_token>
// 4. Sends request
// 5. If 401 → Attempts token refresh
```

---

## Key Concepts to Remember

### 1. **Instance Management**
Each SDK instance has a unique ID, allowing multiple authentication contexts:
```typescript
const asgardeo = new AsgardeoReactClient(1);  // Instance 1
const asgardeo2 = new AsgardeoReactClient(2); // Instance 2
```

### 2. **Legacy vs New Architecture**
- Files in `__legacy__/` contain the older SPA client implementation
- Files outside `__legacy__/` are part of the new cleaner architecture
- The `AsgardeoReactClient` bridges both by using `AuthAPI` which wraps the legacy client

### 3. **State Synchronization**
The provider syncs React state with SDK state:
```typescript
// Polling for sign-in status changes
useEffect(() => {
  const interval = setInterval(async () => {
    const status = await asgardeo.isSignedIn();
    setIsSignedInSync(status);
  }, 1000);
}, []);
```

### 4. **Session Update Pattern**
After authentication, `updateSession()` fetches all user data:
```typescript
const updateSession = async () => {
  const user = await asgardeo.getUser();
  const org = await asgardeo.getCurrentOrganization();
  const myOrgs = await asgardeo.getMyOrganizations();
  // Update all React state...
};
```

---

## Development Tips

1. **Start with the React package** - It's the entry point for most integrations
2. **Understand the config flow** - Config is passed to Provider → Client → Legacy Client → Storage
3. **Debug with browser storage** - Check sessionStorage for `asgardeo-*` keys
4. **Use instance IDs** - For multi-app scenarios, each app needs a unique ID

This architecture ensures clean separation of concerns while maintaining backward compatibility with the legacy implementation.