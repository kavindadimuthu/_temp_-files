# Asgardeo Vue SDK — Component & API Reference for Playground

> This document catalogs every SDK export that the playground should demonstrate.
> Use it as a checklist when building each playground section.

---

## Table of Contents

1. [Composables (Hooks)](#1-composables-hooks)
2. [Primitive Components](#2-primitive-components)
3. [Action Components](#3-action-components)
4. [Control Components](#4-control-components)
5. [Presentation Components](#5-presentation-components)
6. [Social Login Adapters](#6-social-login-adapters)
7. [Plugin & Providers](#7-plugin--providers)
8. [Router Helpers](#8-router-helpers)
9. [Utilities](#9-utilities)
10. [Factory Components](#10-factory-components)

---

## 1. Composables (Hooks)

### `useAsgardeo()`

| Return          | Type                       | Description                            |
| --------------- | -------------------------- | -------------------------------------- |
| `isSignedIn`    | `Readonly<Ref<boolean>>`   | Whether user is authenticated          |
| `isLoading`     | `Readonly<Ref<boolean>>`   | Whether SDK is processing              |
| `isInitialized` | `Readonly<Ref<boolean>>`   | Whether SDK has finished initialization|
| `user`          | `Readonly<Ref<User>>`      | Current user object                    |
| `organization`  | `Readonly<Ref<Org>>`       | Current organization                   |
| `clientId`      | `string`                   | OAuth client ID                        |
| `baseUrl`       | `string`                   | Asgardeo base URL                      |
| `applicationId` | `string`                   | Application ID for app-native auth     |
| `platform`      | `string`                   | Platform identifier                    |
| `meta`          | `Ref<FlowMeta \| null>`    | Flow metadata (from FlowMetaProvider)  |
| `signIn()`      | `() => Promise<void>`      | Initiate sign in (redirect or embedded)|
| `signOut()`     | `() => Promise<void>`      | Sign out                               |
| `signUp()`      | `() => Promise<void>`      | Initiate sign up                       |
| `signInSilently()` | `() => Promise<void>`   | Background authentication check        |
| `switchOrganization(org)` | `(org) => Promise<void>` | Switch org via token exchange   |
| `getAccessToken()`  | `() => Promise<string>` | Get current access token               |
| `getIdToken()`      | `() => Promise<string>` | Get raw ID token                       |
| `getDecodedIdToken()`| `() => Promise<DecodedIdToken>` | Get decoded ID token claims  |
| `exchangeToken(config)` | `(config) => Promise<void>` | Generic token exchange          |
| `http.request(config)`  | `(config) => Promise<Response>` | Authenticated HTTP request   |
| `http.requestAll(configs)` | `(configs) => Promise<Response[]>` | Parallel authenticated requests |
| `resolveFlowTemplateLiterals(text)` | `(text) => string` | Resolve template vars in flow text |

### `useUser()`

| Return               | Type                              | Description                     |
| -------------------- | --------------------------------- | ------------------------------- |
| `profile`            | `Ref<UserProfile>`                | Full nested user profile        |
| `flattenedProfile`   | `Ref<FlattenedProfile>`           | Flattened user data             |
| `schemas`            | `Ref<Schema[]>`                   | SCIM2 schemas                   |
| `revalidateProfile()`| `() => Promise<void>`             | Refetch profile from server     |
| `updateProfile(config, sessionId?)` | `(...) => Promise<void>` | SCIM2 PATCH update       |

### `useOrganization()`

| Return                         | Type                           | Description                   |
| ------------------------------ | ------------------------------ | ----------------------------- |
| `currentOrganization`          | `Ref<Organization>`            | Current org                   |
| `myOrganizations`              | `Ref<Organization[]>`          | User's organizations          |
| `isLoading`                    | `Ref<boolean>`                 | Loading state                 |
| `error`                        | `Ref<Error \| null>`           | Error state                   |
| `switchOrganization(org)`      | `(org) => Promise<void>`       | Switch org                    |
| `getAllOrganizations()`        | `() => Promise<AllOrgsResult>` | Paginated fetch               |
| `revalidateMyOrganizations()`  | `() => Promise<void>`          | Refetch my orgs               |
| `createOrganization(payload)`  | `(payload) => Promise<void>`   | Create sub-org                |

### `useFlow()`

| Return              | Type                     | Description                        |
| ------------------- | ------------------------ | ---------------------------------- |
| `currentStep`       | `Ref<string>`            | Current flow step                  |
| `title`             | `Ref<string>`            | Flow title                         |
| `subtitle`          | `Ref<string>`            | Flow subtitle                      |
| `messages`          | `Ref<FlowMessage[]>`     | Flow messages                      |
| `isLoading`         | `Ref<boolean>`           | Loading state                      |
| `showBackButton`    | `Ref<boolean>`           | Whether back button is visible     |
| `error`             | `Ref<Error \| null>`     | Error state                        |
| `onGoBack`          | `Ref<Function \| null>`  | Back button callback               |
| `setCurrentStep()`  | `(step) => void`         | Update current step                |
| `setTitle()`        | `(title) => void`        | Update title                       |
| `setSubtitle()`     | `(subtitle) => void`     | Update subtitle                    |
| `setError()`        | `(error) => void`        | Set error                          |
| `addMessage()`      | `(msg) => void`          | Add flow message                   |
| `removeMessage()`   | `(id) => void`           | Remove message by ID               |
| `clearMessages()`   | `() => void`             | Clear all messages                 |
| `navigateToFlow()`  | `(flow) => void`         | Navigate to different flow         |
| `reset()`           | `() => void`             | Reset flow state                   |

### `useFlowMeta()`

| Return                 | Type                         | Description                 |
| ---------------------- | ---------------------------- | --------------------------- |
| `meta`                 | `Ref<FlowMeta \| null>`      | Flow metadata from server   |
| `isLoading`            | `Ref<boolean>`               | Loading state               |
| `error`                | `Ref<Error \| null>`         | Error state                 |
| `fetchFlowMeta()`      | `() => Promise<void>`        | Refresh metadata            |
| `switchLanguage(lang)` | `(lang: string) => Promise<void>` | Change language & fetch translations |

### `useTheme()`

| Return                | Type                  | Description                   |
| --------------------- | --------------------- | ----------------------------- |
| `theme`               | `Ref<Theme>`          | Resolved theme object         |
| `colorScheme`         | `Ref<'light'\|'dark'>`| Current color scheme          |
| `direction`           | `Ref<'ltr'\|'rtl'>`   | Text direction                |
| `isBrandingLoading`   | `Ref<boolean>`        | Whether branding is loading   |
| `inheritFromBranding` | `boolean`             | Whether inheriting from branding |
| `toggleTheme()`       | `() => void`          | Toggle light/dark             |

### `useBranding()`

| Return                | Type                              | Description                 |
| --------------------- | --------------------------------- | --------------------------- |
| `brandingPreference`  | `Ref<BrandingPreference \| null>` | Raw branding preference     |
| `theme`               | `Ref<Theme \| null>`              | Derived theme from branding |
| `activeTheme`         | `Ref<'light'\|'dark'\|null>`      | Active theme name           |
| `isLoading`           | `Ref<boolean>`                    | Loading state               |
| `error`               | `Ref<Error \| null>`              | Error state                 |
| `fetchBranding()`     | `() => Promise<void>`             | Fetch (deduplicated)        |
| `refetch()`           | `() => Promise<void>`             | Force fresh fetch           |

### `useI18n()`

| Return                | Type                               | Description              |
| --------------------- | ---------------------------------- | ------------------------ |
| `bundles`             | `Ref<I18nBundle[]>` (readonly)     | All i18n bundles         |
| `currentLanguage`     | `Ref<string>`                      | Active language code     |
| `fallbackLanguage`    | `string`                           | Fallback locale          |
| `t(key, params?)`     | `(key, params?) => string`         | Translation function     |
| `setLanguage(lang)`   | `(lang: string) => void`           | Switch language          |
| `injectBundles(bundles)` | `(bundles) => void`             | Runtime bundle injection |

---

## 2. Primitive Components

### `Button`

| Prop        | Type                                        | Default     |
| ----------- | ------------------------------------------- | ----------- |
| `type`      | `'button' \| 'submit' \| 'reset'`          | `'button'`  |
| `color`     | `'primary' \| 'secondary' \| 'danger'`     | `'primary'` |
| `size`      | `'small' \| 'medium' \| 'large'`           | `'medium'`  |
| `variant`   | `'solid' \| 'outline' \| 'ghost' \| 'text'`| `'solid'`   |
| `disabled`  | `boolean`                                   | `false`     |
| `loading`   | `boolean`                                   | `false`     |
| `fullWidth` | `boolean`                                   | `false`     |
| `startIcon` | `Component`                                 | —           |
| `endIcon`   | `Component`                                 | —           |

**Emits**: `click`  
**Slots**: `default`

### `TextField`

| Prop           | Type                                       | Default    |
| -------------- | ------------------------------------------ | ---------- |
| `modelValue`   | `string`                                   | —          |
| `name`         | `string`                                   | —          |
| `label`        | `string`                                   | —          |
| `type`         | `'text'\|'email'\|'number'\|'tel'\|'url'`  | `'text'`   |
| `placeholder`  | `string`                                   | —          |
| `error`        | `string`                                   | —          |
| `helperText`   | `string`                                   | —          |
| `disabled`     | `boolean`                                  | `false`    |
| `required`     | `boolean`                                  | `false`    |
| `autoComplete` | `string`                                   | —          |

**Emits**: `update:modelValue`, `blur`

### `PasswordField`

| Prop          | Type      | Default |
| ------------- | --------- | ------- |
| `modelValue`  | `string`  | —       |
| `name`        | `string`  | —       |
| `label`       | `string`  | —       |
| `placeholder` | `string`  | —       |
| `error`       | `string`  | —       |
| `disabled`    | `boolean` | `false` |
| `required`    | `boolean` | `false` |

**Emits**: `update:modelValue`, `blur`  
**Feature**: Built-in show/hide password toggle

### `Select`

| Prop          | Type              | Default |
| ------------- | ----------------- | ------- |
| `modelValue`  | `string`          | —       |
| `name`        | `string`          | —       |
| `label`       | `string`          | —       |
| `options`     | `SelectOption[]`  | `[]`    |
| `placeholder` | `string`          | —       |
| `error`       | `string`          | —       |
| `helperText`  | `string`          | —       |
| `disabled`    | `boolean`         | `false` |
| `required`    | `boolean`         | `false` |

`SelectOption`: `{ label: string, value: string, disabled?: boolean }`

**Emits**: `update:modelValue`

### `Checkbox`

| Prop         | Type      | Default |
| ------------ | --------- | ------- |
| `modelValue` | `boolean` | —       |
| `name`       | `string`  | —       |
| `label`      | `string`  | —       |
| `error`      | `string`  | —       |
| `disabled`   | `boolean` | `false` |
| `required`   | `boolean` | `false` |

**Emits**: `update:modelValue`

### `OtpField`

| Prop         | Type      | Default |
| ------------ | --------- | ------- |
| `modelValue` | `string`  | —       |
| `length`     | `number`  | `6`    |
| `name`       | `string`  | —       |
| `label`      | `string`  | —       |
| `error`      | `string`  | —       |
| `disabled`   | `boolean` | `false` |
| `required`   | `boolean` | `false` |

**Emits**: `update:modelValue`  
**Feature**: Auto-focus next input, paste support

### `DatePicker`

| Prop         | Type      | Default |
| ------------ | --------- | ------- |
| `modelValue` | `string`  | —       |
| `name`       | `string`  | —       |
| `label`      | `string`  | —       |
| `disabled`   | `boolean` | `false` |
| `required`   | `boolean` | `false` |

**Emits**: `update:modelValue`

### `Card`

| Prop      | Type                                    | Default     |
| --------- | --------------------------------------- | ----------- |
| `variant` | `'elevated' \| 'outlined' \| 'flat'`   | `'elevated'`|

**Slots**: `default`

### `Alert`

| Prop          | Type                                       | Default   |
| ------------- | ------------------------------------------ | --------- |
| `severity`    | `'success'\|'error'\|'warning'\|'info'`    | `'info'`  |
| `dismissible` | `boolean`                                  | `false`   |

**Emits**: `dismiss`  
**Slots**: `default`

### `Typography`

| Prop        | Type                                                                                     | Default   |
| ----------- | ---------------------------------------------------------------------------------------- | --------- |
| `variant`   | `'h1'\|'h2'\|'h3'\|'h4'\|'h5'\|'h6'\|'subtitle1'\|'subtitle2'\|'body1'\|'body2'\|'caption'\|'overline'` | `'body1'` |
| `component` | `string` (HTML tag override)                                                             | —         |

**Slots**: `default`

### `Spinner`

| Prop   | Type                               | Default    |
| ------ | ---------------------------------- | ---------- |
| `size` | `'small' \| 'medium' \| 'large'`  | `'medium'` |

### `Logo`

| Prop     | Type     | Default |
| -------- | -------- | ------- |
| `src`    | `string` | —       |
| `alt`    | `string` | —       |
| `href`   | `string` | —       |
| `width`  | `number` | —       |
| `height` | `number` | —       |

### `Divider`

No props. Renders a horizontal rule.

### Icons

Available exports from `Icons.ts`:
`UserIcon`, `EyeIcon`, `EyeOffIcon`, `ChevronDownIcon`, `CheckIcon`, `CircleAlertIcon`, `CircleCheckIcon`, `InfoIcon`, `TriangleAlertIcon`, `XIcon`, `PlusIcon`, `LogOutIcon`, `ArrowLeftRightIcon`, `BuildingIcon`, `GlobeIcon`, `PencilIcon`

---

## 3. Action Components

### `SignInButton` / `BaseSignInButton`

| Prop            | Type   | Default |
| --------------- | ------ | ------- |
| `signInOptions` | `object` | —     |

**Emits**: `click`, `error`  
**Slots**: `default({ isLoading })`

### `SignOutButton` / `BaseSignOutButton`

**Emits**: `click`, `error`  
**Slots**: `default({ isLoading })`

### `SignUpButton` / `BaseSignUpButton`

| Prop            | Type   | Default |
| --------------- | ------ | ------- |
| `signUpOptions` | `object` | —     |

**Emits**: `click`, `error`  
**Slots**: `default({ isLoading })`

---

## 4. Control Components

### `SignedIn`

**Slots**: `default` (rendered when signed in), `fallback` (rendered when signed out)

### `SignedOut`

**Slots**: `default` (rendered when signed out), `fallback` (rendered when signed in)

### `Loading`

**Slots**: `default` (rendered when loading), `fallback` (rendered when not loading)

### `User`

**Slots**: `default({ user })` — Scoped slot exposing user context from `useUser()`

### `Organization`

**Slots**: `default({ organization })` — Scoped slot exposing org context from `useOrganization()`

---

## 5. Presentation Components

### Sign In

| Component    | Styled | Props (key)                                                       |
| ------------ | ------ | ----------------------------------------------------------------- |
| `SignIn`     | Yes    | `className`, `size`, `variant`                                    |
| `BaseSignIn` | No    | `onInitialize`, `onSubmit`, `buttonClassName`, `inputClassName`, `errorClassName`, `messageClassName`, `size`, `variant` |

**Emits**: `error`, `complete`, `flowChange`  
**Slots (BaseSignIn)**: `default({ components, handleSubmit, values, fieldErrors, isLoading, isValid, ... })`

### Sign Up

| Component     | Styled | Props (key)                                                       |
| ------------- | ------ | ----------------------------------------------------------------- |
| `SignUp`      | Yes    | `className`, `size`, `variant`                                    |
| `BaseSignUp`  | No    | `onInitialize`, `onSubmit`, `onComplete`, `onError`, `onFlowChange`, `showTitle`, `showSubtitle`, `size`, `variant` |

**Emits**: `error`, `complete`, `flowChange`  
**Slots (BaseSignUp)**: `default({ components, handleSubmit, values, fieldErrors, isLoading, isValid, ... })`

### User Profile

| Component        | Styled | Props (key)                                                                       |
| ---------------- | ------ | --------------------------------------------------------------------------------- |
| `UserProfile`    | Yes    | `title`, `editable`, `cardLayout`, `hideFields`, `showFields`, `className`        |
| `BaseUserProfile`| No    | `profile`, `flattenedProfile`, `schemas`, `title`, `editable`, `cardLayout`, `hideFields`, `showFields`, `onUpdate`, `isLoading`, `error`, `className` |

**Slots**: `default`, `footer`

### User Dropdown

| Component         | Styled | Description                    |
| ----------------- | ------ | ------------------------------ |
| `UserDropdown`    | Yes    | Dropdown with avatar + sign out|
| `BaseUserDropdown`| No    | Custom dropdown via scoped slot |

### Organization Components

| Component              | Styled | Props (key)                                                        |
| ---------------------- | ------ | ------------------------------------------------------------------ |
| `OrganizationList`     | Yes    | `organizations`, `isLoading`, `onSelect`, `className`              |
| `BaseOrganizationList` | No    | Same + scoped slot                                                  |
| `OrganizationSwitcher` | Yes    | `currentOrganization`, `organizations`, `isLoading`, `onSwitch`    |
| `OrganizationProfile`  | Yes    | `organization`, `editable`, `onUpdate`, `isLoading`, `error`       |
| `CreateOrganization`   | Yes    | `onSubmit`, `buttonText`, `className`                              |
| `InviteUser`           | Yes    | `onSubmit`, `buttonText`                                           |
| `AcceptInvite`         | Yes    | `onInitialize`, `onSubmit`, `onComplete`                           |

### Utility Components

| Component          | Styled | Props (key)                 |
| ------------------ | ------ | --------------------------- |
| `LanguageSwitcher` | Yes    | `languages`, `onChange`     |

---

## 6. Social Login Adapters

| Component         | Props           | Emits   | Slots                    |
| ----------------- | --------------- | ------- | ------------------------ |
| `GoogleButton`    | `isLoading`     | `click` | `default({ isLoading })` |
| `GitHubButton`    | `isLoading`     | `click` | `default({ isLoading })` |
| `MicrosoftButton` | `isLoading`     | `click` | `default({ isLoading })` |
| `FacebookButton`  | `isLoading`     | `click` | `default({ isLoading })` |

---

## 7. Plugin & Providers

### `AsgardeoPlugin`

```typescript
app.use(AsgardeoPlugin)
```

Registers `AsgardeoProvider` globally and injects SDK styles.

### `AsgardeoProvider`

| Prop               | Type      | Required | Description                         |
| ------------------ | --------- | -------- | ----------------------------------- |
| `baseUrl`          | `string`  | Yes      | Asgardeo base URL                   |
| `clientId`         | `string`  | Yes      | OAuth2 client ID                    |
| `applicationId`    | `string`  | No       | Required for app-native auth        |
| `afterSignInUrl`   | `string`  | No       | Redirect URL after sign in          |
| `afterSignOutUrl`  | `string`  | No       | Redirect URL after sign out         |
| `signInUrl`        | `string`  | No       | Custom sign-in page URL             |
| `signUpUrl`        | `string`  | No       | Custom sign-up page URL             |
| `scopes`           | `string[]`| No       | OAuth2 scopes                       |
| `platform`         | `string`  | No       | Platform identifier                 |
| `storage`          | `string`  | No       | Token storage strategy              |
| `syncSession`      | `boolean` | No       | Cross-tab session sync              |
| `organizationHandle` | `string`| No       | Org handle for multi-tenant         |
| `organizationChain` | `string[]`| No      | Org hierarchy chain                 |
| `signInOptions`    | `object`  | No       | Default sign-in options             |
| `instanceId`       | `string`  | No       | Multi-instance identifier           |

**Slots**: `default`

---

## 8. Router Helpers

### `createCallbackRoute(options?)`

```typescript
createCallbackRoute({ path: '/callback', name: 'callback', onError: (err) => {} })
```

Returns a `RouteRecordRaw` for OAuth callback handling.

### `createAsgardeoGuard(options?)`

```typescript
createAsgardeoGuard({ redirectTo: '/login', waitForInit: true, initTimeout: 10000 })
```

Returns a Vue Router navigation guard that checks `isSignedIn`.

---

## 9. Utilities

| Export                       | Description                                |
| ---------------------------- | ------------------------------------------ |
| `navigate(url)`             | Window navigation (same-origin: History API, cross-origin: direct) |
| `http`                       | Authenticated HTTP client                  |
| `hasAuthParamsInUrl()`       | Check for OAuth `code` + `session_state`   |
| `initiateOAuthRedirect(url)` | Start OAuth flow with state management     |
| `handleWebAuthnAuthentication()` | Passkey/WebAuthn ceremony              |

---

## 10. Factory Components

### `FieldFactory`

Dynamically renders form fields based on configuration objects.

**FieldConfig interface**:

```typescript
interface FieldConfig {
  type: 'text' | 'password' | 'email' | 'number' | 'select' | 'checkbox' | 'date' | 'otp';
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    message?: string;
  };
  options?: SelectOption[]; // For select type
}
```

Maps `type` to the corresponding primitive component (TextField, PasswordField, Select, Checkbox, DatePicker, OtpField).
