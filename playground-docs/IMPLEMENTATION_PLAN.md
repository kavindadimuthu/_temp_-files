# Asgardeo Vue SDK Playground — Implementation Plan

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & New Structure](#2-architecture--new-structure)
3. [Migration Map (Current → New)](#3-migration-map-current--new)
4. [Detailed Page Specifications](#4-detailed-page-specifications)
5. [Step-by-Step Implementation Guide](#5-step-by-step-implementation-guide)
6. [Shared Components & Utilities](#6-shared-components--utilities)
7. [Styling & UX Guidelines](#7-styling--ux-guidelines)
8. [Testing Checklist](#8-testing-checklist)

---

## 1. Project Overview

### Goal

Rebuild the Vue SDK playground UI into **4 focused sections** that comprehensively showcase the `@asgardeo/vue` SDK's capabilities through interactive, developer-friendly demos.

### Tech Stack (No Changes)

- **Vue 3** (Composition API + `<script setup>`)
- **Vue Router 4** (SPA routing)
- **Tailwind CSS 4** (styling)
- **Vite 7** (dev server + build)
- **TypeScript** (strict mode)
- **@asgardeo/vue** (workspace dependency)

### Design Principles

- **Clarity first** — Simple, readable code for Vue developers learning the SDK
- **Interactive** — Every component/API should be demonstrable in the UI
- **Self-documenting** — Show source snippets alongside live demos
- **Responsive** — Mobile-friendly layout with collapsible sidebar

---

## 2. Architecture & New Structure

### Navigation (4 Sections)

```
┌─────────────────────────────────────────────────┐
│  Sidebar (fixed, w-64)                          │
│  ┌────────────────────────────────────────────┐  │
│  │  🔒 Asgardeo Vue SDK Playground           │  │
│  │                                            │  │
│  │  ● Overview                                │  │
│  │  ● Auth Flows                              │  │
│  │  ● Components                              │  │
│  │  ● Public APIs                             │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### New File Structure

```
src/
├── App.vue                          # Root: AsgardeoProvider + layout
├── main.ts                          # App bootstrap
├── router/
│   └── index.ts                     # 4 routes + callback
├── assets/
│   ├── main.css                     # Tailwind + base imports
│   └── base.css                     # CSS variables
├── components/
│   ├── Sidebar.vue                  # Navigation sidebar (updated)
│   ├── layout/
│   │   ├── PageHeader.vue           # Reusable page title + description
│   │   ├── SectionCard.vue          # Card wrapper for demo sections
│   │   ├── TabGroup.vue             # Reusable tab switcher
│   │   └── CodeBlock.vue            # Source code display block
│   └── shared/
│       ├── StatusBadge.vue          # Auth status indicator
│       ├── ResultPanel.vue          # API result display panel
│       └── EventLog.vue             # Event/action log component
├── views/
│   ├── OverviewView.vue             # Dashboard & quick actions
│   ├── AuthFlowsView.vue            # Redirect + App-native flow tabs
│   ├── ComponentsView.vue           # Component explorer with tabs
│   └── PublicApisView.vue           # Composable API playground
└── utils/
    └── codeSnippets.ts              # Source snippets for display
```

---

## 3. Migration Map (Current → New)

| Current Route       | New Location                                     |
| ------------------- | ------------------------------------------------ |
| `/` Overview        | `/` **Overview** (enhanced)                      |
| `/actions`          | `/auth-flows` → Redirect tab                     |
| `/auth-flow`        | `/auth-flows` → Redirect tab (callback section)  |
| `/primitives`       | `/components` → Primitives tab                   |
| `/presentation`     | `/components` → Presentation tab                 |
| `/control`          | `/components` → Control tab                      |
| `/adapters`         | `/components` → Social Logins tab                |
| `/factories`        | `/components` → Presentation tab (field factory) |
| `/composables`      | `/public-apis` (expanded)                        |

### What Gets Added (New)

- Overview: **Config editor panel**, **quick links** navigation cards
- Auth Flows: **App-native tab** with full `<SignIn />` and `<SignUp />` embedded forms
- Components: **Unified tab interface** with all 5 categories
- Public APIs: **Interactive playground** for every composable method with result display

### What Gets Removed

- 9 separate sidebar items → consolidated to 4
- Redundant demo sections that overlap between pages

---

## 4. Detailed Page Specifications

### 4.1 Overview Page (`/`)

**Purpose**: Dashboard showing SDK state, quick actions, and navigation.

**Sections**:

#### A. Quick Actions Bar
```
┌──────────────────────────────────────────────────────┐
│  [🔑 Sign In]   [🚪 Sign Out]   [📝 Sign Up]       │
│  (contextual: show relevant buttons based on state)  │
└──────────────────────────────────────────────────────┘
```
- When signed out: Show `<SignInButton>` and `<SignUpButton>`
- When signed in: Show `<SignOutButton>` and user greeting
- Use SDK's `<SignedIn>`, `<SignedOut>`, `<Loading>` control components

#### B. SDK Status Dashboard
```
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Initialized│ │   Ready    │ │Authenticated│
│   ✅ / ⏳   │ │   ✅ / ⏳   │ │   ✅ / ❌    │
└────────────┘ └────────────┘ └────────────┘
```
- Three status cards showing `isInitialized`, `!isLoading`, `isSignedIn`
- Color-coded: green (true), yellow (pending), red (false)
- Use `useAsgardeo()` composable to read state

#### C. Configuration Panel
- Display current config: `baseUrl`, `clientId`, `applicationId`, `afterSignInUrl`, `afterSignOutUrl`, `scopes`
- **Edit button** → toggleable inline editing (updates `AsgardeoProvider` props)
- Note: Config editing requires passing props to `AsgardeoProvider`, so this will be a display + copy-to-clipboard approach with instructions on how to modify `App.vue`

#### D. User Info (when signed in)
- Show compact `<UserProfile>` or user summary from `useUser()`
- Display access token preview (truncated), decoded ID token claims

#### E. Quick Links
```
┌─────────────┐ ┌──────────────┐ ┌───────────┐
│  Auth Flows │ │  Components  │ │ Public    │
│  →          │ │  →           │ │ APIs →    │
│  Try sign   │ │  Explore UI  │ │ Test      │
│  in/up flows│ │  components  │ │ composable│
│             │ │              │ │ methods   │
└─────────────┘ └──────────────┘ └───────────┘
```
- Three navigation cards with icons and short descriptions
- Click navigates to the respective page

**SDK Features Used**:
- `useAsgardeo()` — `isSignedIn`, `isLoading`, `isInitialized`, `baseUrl`, `clientId`, `getAccessToken()`, `getDecodedIdToken()`
- `useUser()` — `profile`, `flattenedProfile`
- `<SignInButton>`, `<SignOutButton>`, `<SignUpButton>`
- `<SignedIn>`, `<SignedOut>`, `<Loading>`

---

### 4.2 Auth Flows Page (`/auth-flows`)

**Purpose**: Demonstrate both authentication strategies side by side.

**Layout**: Two tabs at the top

#### Tab 1: Redirect-Based Flow

**Section A: Authentication Buttons**
```
┌──────────────────────────────────────────────┐
│  Standard Buttons                            │
│  [Sign In]  [Sign Out]  [Sign Up]            │
│                                              │
│  With Custom Options                         │
│  [Sign In (force prompt)]                    │
│  [Silent Sign In]                            │
│                                              │
│  Social Login Buttons                        │
│  [Google] [GitHub] [Microsoft] [Facebook]    │
└──────────────────────────────────────────────┘
```

**Section B: Callback Handling**
- Explain the OAuth2 redirect flow visually (numbered steps)
- Show `<Callback>` component usage
- Show `createCallbackRoute()` helper usage
- Display callback state (idle/loading/success/error) with visual indicators

**Section C: Route Guard**
- Interactive demo of `createAsgardeoGuard()` 
- Show how protected routes work
- Code snippet showing guard setup

**SDK Features Used**:
- `<SignInButton>`, `<SignOutButton>`, `<SignUpButton>`
- `<BaseSignInButton>`, `<BaseSignOutButton>`, `<BaseSignUpButton>`
- `<GoogleButton>`, `<GitHubButton>`, `<MicrosoftButton>`, `<FacebookButton>`
- `<Callback>`, `createCallbackRoute()`, `createAsgardeoGuard()`
- `signIn()`, `signOut()`, `signUp()`, `signInSilently()`

#### Tab 2: App-Native Flow

**Section A: Embedded Sign In**
```
┌──────────────────────────────────────────────┐
│  Styled Sign In        │  Base Sign In       │
│  ┌──────────────────┐  │  ┌───────────────┐  │
│  │  <SignIn />       │  │  │ <BaseSignIn>  │  │
│  │  (full embedded   │  │  │ (custom slot  │  │
│  │   form)           │  │  │  rendering)   │  │
│  └──────────────────┘  │  └───────────────┘  │
└──────────────────────────────────────────────┘
```

**Section B: Embedded Sign Up**
```
┌──────────────────────────────────────────────┐
│  Styled Sign Up        │  Base Sign Up       │
│  ┌──────────────────┐  │  ┌───────────────┐  │
│  │  <SignUp />       │  │  │ <BaseSignUp>  │  │
│  │  (full embedded   │  │  │ (custom slot  │  │
│  │   form)           │  │  │  rendering)   │  │
│  └──────────────────┘  │  └───────────────┘  │
└──────────────────────────────────────────────┘
```

**Section C: Flow State Inspector**
- Live display of `useFlow()` state: `currentStep`, `title`, `subtitle`, `messages`, `isLoading`
- Show `useFlowMeta()` metadata when available
- Event log showing flow transitions

**SDK Features Used**:
- `<SignIn>`, `<BaseSignIn>` (v2 embedded)
- `<SignUp>`, `<BaseSignUp>` (v2 embedded)
- `useFlow()` — all state and methods
- `useFlowMeta()` — `meta`, `fetchFlowMeta()`, `switchLanguage()`

---

### 4.3 Components Page (`/components`)

**Purpose**: Interactive catalog of all SDK components.

**Layout**: 5 tabs across the top

#### Tab 1: Primitives

Demo each primitive component with interactive props:

| Component       | Interactive Props                                            |
| --------------- | ------------------------------------------------------------ |
| `Button`        | variant, color, size, disabled, loading, fullWidth, icons    |
| `TextField`     | type, placeholder, required, error, helperText, disabled     |
| `PasswordField` | placeholder, required, error, disabled                       |
| `Select`        | options array, placeholder, required, disabled               |
| `Checkbox`      | label, required, disabled, error                             |
| `DatePicker`    | label, required, disabled                                    |
| `OtpField`      | length, label, required, disabled                            |
| `Card`          | variant (elevated/outlined/flat)                             |
| `Alert`         | severity (success/error/warning/info), dismissible           |
| `Typography`    | variant (h1-h6, body1, body2, subtitle1, subtitle2, caption) |
| `Spinner`       | size (small/medium/large)                                    |
| `Logo`          | src, alt, width, height                                      |
| `Divider`       | (no props)                                                   |
| `Icons`         | All 16 icons displayed in a grid                             |

**Layout per component**:
```
┌──────────────────────────────────────────────┐
│  Component Name                              │
│  ┌─────────────────┐  ┌──────────────────┐   │
│  │  Live Preview   │  │  Props Controls  │   │
│  │                 │  │  [variant ▼]     │   │
│  │  <Button>       │  │  [color ▼]       │   │
│  │   Click me      │  │  ☐ disabled      │   │
│  │  </Button>      │  │  ☐ loading       │   │
│  └─────────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────┘
```

#### Tab 2: Actions

- `<SignInButton>` — Default and with custom slot
- `<SignOutButton>` — Default and with custom slot
- `<SignUpButton>` — Default and with custom slot
- `<BaseSignInButton>` — Unstyled, show how to wrap with custom styles
- `<BaseSignOutButton>` — Unstyled
- `<BaseSignUpButton>` — Unstyled
- Each with event logging (click, error events)

#### Tab 3: Control

- `<SignedIn>` — Show/hide based on auth state, with fallback slot
- `<SignedOut>` — Show/hide based on auth state, with fallback slot
- `<Loading>` — Show/hide based on loading state, with fallback slot
- `<User>` — Scoped slot exposing user data
- `<Organization>` — Scoped slot exposing organization data
- Nested composition example: `<SignedIn>` wrapping `<User>` wrapping `<Organization>`

#### Tab 4: Presentation

Grouped by domain:

**User Components**:
- `<UserProfile>` — Full styled profile card
- `<BaseUserProfile>` — Custom rendering via scoped slot
- `<UserDropdown>` — Dropdown with user info and sign-out
- `<BaseUserDropdown>` — Custom dropdown rendering

**Organization Components**:
- `<OrganizationList>` — List of user's organizations
- `<BaseOrganizationList>` — Custom list rendering
- `<OrganizationSwitcher>` — Dropdown to switch orgs
- `<OrganizationProfile>` — Org details card
- `<CreateOrganization>` — Form to create sub-org
- `<InviteUser>` — Form to invite users to org

**Utility Components**:
- `<LanguageSwitcher>` — Language dropdown
- `<FieldFactory>` — Dynamic form generation (from factories)
- `<AcceptInvite>` — Accept org invitation flow

#### Tab 5: Social Logins

- `<GoogleButton>` — Default and custom slot
- `<GitHubButton>` — Default and custom slot
- `<MicrosoftButton>` — Default and custom slot
- `<FacebookButton>` — Default and custom slot
- Combined social login panel example
- Event handling demo

---

### 4.4 Public APIs Page (`/public-apis`)

**Purpose**: Interactive playground for all composable hooks.

**Layout**: Accordion or collapsible sections grouped by composable.

#### Group 1: `useAsgardeo()`
```
┌──────────────────────────────────────────────────────┐
│  useAsgardeo()                                       │
│                                                      │
│  Reactive State (auto-updating):                     │
│  ┌─────────────┬────────────────────────────────┐    │
│  │ isSignedIn   │ true                          │    │
│  │ isLoading    │ false                         │    │
│  │ isInitialized│ true                          │    │
│  │ clientId     │ "OloUfnEtap8..."              │    │
│  │ baseUrl      │ "https://api.asgardeo.io/..." │    │
│  └─────────────┴────────────────────────────────┘    │
│                                                      │
│  Methods:                                            │
│  [signIn()]  [signOut()]  [signUp()]                  │
│  [signInSilently()]  [getAccessToken()]               │
│  [getIdToken()]  [getDecodedIdToken()]                │
│  [exchangeToken()]                                    │
│                                                      │
│  HTTP Client:                                        │
│  URL: [/scim2/Me               ] Method: [GET ▼]     │
│  [Send Request]                                      │
│                                                      │
│  Result:                                             │
│  ┌──────────────────────────────────────────────┐    │
│  │ { "userName": "...", "name": {...} }          │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

#### Group 2: `useUser()`
- View `profile` (reactive, auto-updates)
- View `flattenedProfile`
- View `schemas`
- Call `revalidateProfile()`
- Call `updateProfile()` with editable JSON payload

#### Group 3: `useOrganization()`
- View `currentOrganization`
- View `myOrganizations`
- View `isLoading`, `error`
- Call `switchOrganization()` with org selector
- Call `getAllOrganizations()`
- Call `revalidateMyOrganizations()`
- Call `createOrganization()` with form inputs

#### Group 4: `useFlow()`
- View live state: `currentStep`, `title`, `subtitle`, `messages`, `isLoading`, `showBackButton`
- Call `setCurrentStep()`, `setTitle()`, `setSubtitle()`
- Call `addMessage()`, `removeMessage()`, `clearMessages()`
- Call `navigateToFlow()`, `reset()`

#### Group 5: `useFlowMeta()`
- View `meta` object (full JSON)
- View `isLoading`, `error`
- Call `fetchFlowMeta()`
- Call `switchLanguage()` with language selector

#### Group 6: `useTheme()`
- View `theme` object
- View `colorScheme`, `direction`
- View `isBrandingLoading`
- Call `toggleTheme()` — live toggle

#### Group 7: `useBranding()`
- View `brandingPreference`
- View `theme` (derived from branding)
- View `activeTheme`
- View `isLoading`, `error`
- Call `fetchBranding()`
- Call `refetch()`

#### Group 8: `useI18n()`
- View `currentLanguage`, `fallbackLanguage`
- View `bundles` (list of registered bundles)
- Call `t(key)` — interactive translation lookup
- Call `setLanguage()` — language switcher
- Call `injectBundles()` — add custom translations

---

## 5. Step-by-Step Implementation Guide

### Phase 1: Foundation & Layout (Steps 1–3)

#### Step 1: Update Sidebar Navigation

**File**: `src/components/Sidebar.vue`

Replace the 9-item navigation with 4 items:

```typescript
const navItems = [
  { path: '/',           label: 'Overview',    icon: 'HomeIcon' },
  { path: '/auth-flows', label: 'Auth Flows',  icon: 'KeyIcon' },
  { path: '/components', label: 'Components',  icon: 'BoxIcon' },
  { path: '/public-apis',label: 'Public APIs', icon: 'CodeIcon' },
];
```

Keep the existing mobile-responsive behavior (toggle, z-50 overlay, transitions).

#### Step 2: Update Router

**File**: `src/router/index.ts`

```typescript
import { createRouter, createWebHistory } from 'vue-router';
import { createCallbackRoute } from '@asgardeo/vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',            component: () => import('../views/OverviewView.vue') },
    { path: '/auth-flows',  component: () => import('../views/AuthFlowsView.vue') },
    { path: '/components',  component: () => import('../views/ComponentsView.vue') },
    { path: '/public-apis', component: () => import('../views/PublicApisView.vue') },
    createCallbackRoute({ path: '/callback' }),
  ],
});

export default router;
```

Note: Use lazy imports for better code splitting. Include `createCallbackRoute` for OAuth callback handling.

#### Step 3: Create Shared Layout Components

Create reusable layout components used across all pages:

**`src/components/layout/PageHeader.vue`**
- Props: `title: string`, `description?: string`
- Renders: H1 heading + subtitle paragraph

**`src/components/layout/SectionCard.vue`**
- Props: `title: string`, `description?: string`, `collapsible?: boolean`
- Slots: `default`
- Renders: Tailwind card with header and content area

**`src/components/layout/TabGroup.vue`**
- Props: `tabs: { key: string, label: string }[]`, `modelValue: string`
- Emits: `update:modelValue`
- Renders: Tab buttons with active indicator, shows slot for active tab
- Slots: Named slot for each tab key

**`src/components/layout/CodeBlock.vue`**
- Props: `code: string`, `language?: string`
- Renders: `<pre><code>` block with copy button and syntax-highlighted styling
- Nice-to-have: basic syntax highlighting with CSS

**`src/components/shared/ResultPanel.vue`**
- Props: `result: unknown`, `isLoading?: boolean`, `error?: string`
- Renders: JSON-formatted result display, loading spinner, or error message

**`src/components/shared/EventLog.vue`**
- Props: `events: { timestamp: string, type: string, data?: unknown }[]`
- Renders: Scrollable log of events with timestamps

---

### Phase 2: Overview Page (Step 4)

#### Step 4: Build Overview Page

**File**: `src/views/OverviewView.vue`

Implementation checklist:

1. **Quick Actions Bar**
   - Import `SignInButton`, `SignOutButton`, `SignUpButton` from `@asgardeo/vue`
   - Import `SignedIn`, `SignedOut`, `Loading` control components
   - Wrap buttons in conditional rendering:
     ```vue
     <SignedOut>
       <SignInButton /> <SignUpButton />
     </SignedOut>
     <SignedIn>
       <span>Welcome, {{ flattenedProfile?.givenName }}</span>
       <SignOutButton />
     </SignedIn>
     <Loading>
       <Spinner />
     </Loading>
     ```

2. **Status Dashboard**
   - Use `useAsgardeo()` → destructure `isSignedIn`, `isLoading`, `isInitialized`
   - Three `<SectionCard>` components with color-coded status badges
   - Use `computed()` for derived status text

3. **Configuration Panel**
   - Display config from `useAsgardeo()`: `baseUrl`, `clientId`
   - Read-only table with copy-to-clipboard icon button per row
   - "How to edit" expandable section showing `App.vue` code snippet

4. **User Info Panel** (when signed in)
   - Use `useUser()` → `profile`, `flattenedProfile`
   - Show compact profile: avatar, name, email
   - Collapsible sections for access token, decoded ID token
   - Use `getAccessToken()` and `getDecodedIdToken()` with buttons

5. **Quick Links**
   - Three `<RouterLink>` cards with brief descriptions
   - Tailwind grid: `grid grid-cols-1 md:grid-cols-3 gap-4`

---

### Phase 3: Auth Flows Page (Steps 5–6)

#### Step 5: Build Auth Flows — Redirect Tab

**File**: `src/views/AuthFlowsView.vue`

Use `<TabGroup>` with two tabs: `redirect` and `app-native`.

**Redirect tab sections**:

1. **Standard Auth Buttons**
   - `<SignInButton>`, `<SignOutButton>`, `<SignUpButton>`
   - Show default rendering and custom slot usage:
     ```vue
     <SignInButton v-slot="{ isLoading }">
       <span v-if="isLoading">Signing in...</span>
       <span v-else>Custom Sign In</span>
     </SignInButton>
     ```

2. **Advanced Auth Actions**
   - Manual `signIn()` with options (`{ prompt: 'login' }`)
   - `signInSilently()` for background auth
   - Code snippets alongside buttons

3. **Social Login Buttons**
   - `<GoogleButton>`, `<GitHubButton>`, `<MicrosoftButton>`, `<FacebookButton>`
   - Event handlers logging clicks

4. **Callback & Flow Explanation**
   - Visual flowchart (HTML/CSS steps):
     1. User clicks Sign In → Redirect to Asgardeo
     2. User authenticates at IdP
     3. IdP redirects back with auth code
     4. `<Callback>` component exchanges code for tokens
     5. SDK stores tokens → user is authenticated
   - Code example for callback route setup
   - Code example for route guard setup

#### Step 6: Build Auth Flows — App-Native Tab

**App-native tab sections**:

1. **Embedded Sign In**
   - `<SignIn />` — Full styled embedded sign-in form
   - `<BaseSignIn>` — Unstyled with slot for custom rendering
   - Event handlers: `@complete`, `@error`, `@flowChange`
   - Code snippet

2. **Embedded Sign Up**
   - `<SignUp />` — Full styled embedded sign-up form
   - `<BaseSignUp>` — Unstyled with custom rendering
   - Event handlers: `@complete`, `@error`, `@flowChange`
   - Code snippet

3. **Flow State Inspector**
   - Live state panel showing `useFlow()` values
   - `useFlowMeta()` metadata display
   - Event log for flow transitions

---

### Phase 4: Components Page (Steps 7–11)

#### Step 7: Build Components Page Shell

**File**: `src/views/ComponentsView.vue`

- `<TabGroup>` with 5 tabs: `primitives`, `actions`, `control`, `presentation`, `social-logins`
- Each tab loads a sub-component (for code splitting and file size management)

Create tab content components:

```
src/views/components/
├── PrimitivesTab.vue
├── ActionsTab.vue
├── ControlTab.vue
├── PresentationTab.vue
└── SocialLoginsTab.vue
```

#### Step 8: Build Primitives Tab

**File**: `src/views/components/PrimitivesTab.vue`

For each primitive component, create a demo section with:

1. **Live preview** — Rendered component with current props
2. **Props controls** — Dropdowns, checkboxes, text inputs to modify props reactively
3. **Dividers** between component sections

Component list (with interactive controls):

- **Button**: Dropdowns for `variant`, `color`, `size`; Checkboxes for `disabled`, `loading`, `fullWidth`; Optional icon toggles
- **TextField**: Input for `placeholder`, `label`; Dropdown for `type`; Checkbox for `required`, `disabled`; Text input for `error`, `helperText`
- **PasswordField**: Input for `label`, `placeholder`; Checkbox for `required`, `disabled`
- **Select**: Pre-defined options array; Dropdown for placeholder; Checkbox for `required`, `disabled`
- **Checkbox**: Input for `label`; Checkbox for `required`, `disabled`
- **DatePicker**: Input for `label`; Checkbox for `required`, `disabled`
- **OtpField**: Number input for `length`; Checkbox for `required`, `disabled`
- **Card**: Dropdown for `variant` (elevated/outlined/flat)
- **Alert**: Dropdown for `severity`; Checkbox for `dismissible`; Text content slot
- **Typography**: Dropdown for `variant` (h1-h6, body1, body2, subtitle1, subtitle2, caption, overline)
- **Spinner**: Dropdown for `size`
- **Logo**: Input for `src`, `alt`; Number inputs for `width`, `height`
- **Divider**: Static demo
- **Icons**: Grid display of all 16 icons with labels

#### Step 9: Build Actions Tab

**File**: `src/views/components/ActionsTab.vue`

For each action button:
- Default rendering
- Custom slot rendering with loading state
- Event log showing `click` and `error` events
- Base (unstyled) variant comparison

Components:
- `<SignInButton>` / `<BaseSignInButton>`
- `<SignOutButton>` / `<BaseSignOutButton>`
- `<SignUpButton>` / `<BaseSignUpButton>`

#### Step 10: Build Control Tab

**File**: `src/views/components/ControlTab.vue`

Demos:
- `<SignedIn>` with default slot and fallback slot
- `<SignedOut>` with default slot and fallback slot
- `<Loading>` with default slot and fallback slot
- `<User>` scoped slot exposing `{ user }` and rendering user data
- `<Organization>` scoped slot exposing `{ organization }` and rendering org data
- **Nested composition** example: `<SignedIn>` → `<User>` → display user info
- Live state indicators alongside each demo

#### Step 11: Build Presentation Tab & Social Logins Tab

**File**: `src/views/components/PresentationTab.vue`

Sub-sections (use smaller `SectionCard` groups):

**User Components**:
- `<UserProfile />` and `<BaseUserProfile>` with slot customization
- `<UserDropdown />` and `<BaseUserDropdown>`

**Organization Components**:
- `<OrganizationList />` and `<BaseOrganizationList>`
- `<OrganizationSwitcher />`
- `<OrganizationProfile />`
- `<CreateOrganization />`
- `<InviteUser />`

**Utility Components**:
- `<LanguageSwitcher />`
- `<FieldFactory>` with dynamic config editor (JSON textarea → live form)
- `<AcceptInvite />` (with explanation of setup requirements)

**File**: `src/views/components/SocialLoginsTab.vue`

- All 4 social buttons with default and custom slot rendering
- Combined social login panel example layout
- Event handling demo with log

---

### Phase 5: Public APIs Page (Steps 12–13)

#### Step 12: Build Public APIs Page Shell

**File**: `src/views/PublicApisView.vue`

Layout: Collapsible accordion sections, one per composable.

Each composable section has:
1. **Header** — Composable name + brief description + expand/collapse toggle
2. **Reactive State** — Live values table (auto-updating from Vue refs)
3. **Methods** — Buttons to trigger each method
4. **Result Panel** — JSON display of last method call result
5. **Event Log** — Timestamped log of all calls made

Create sub-components:

```
src/views/apis/
├── AsgardeoApiSection.vue
├── UserApiSection.vue
├── OrganizationApiSection.vue
├── FlowApiSection.vue
├── FlowMetaApiSection.vue
├── ThemeApiSection.vue
├── BrandingApiSection.vue
└── I18nApiSection.vue
```

#### Step 13: Build Individual API Sections

**`AsgardeoApiSection.vue`** — `useAsgardeo()`

Reactive state display:
- `isSignedIn`, `isLoading`, `isInitialized` (boolean badges)
- `clientId`, `baseUrl` (text fields)

Method buttons:
- `signIn()` — Triggers redirect
- `signOut()` — Triggers redirect
- `signUp()` — Triggers redirect
- `signInSilently()` — Background check, show result
- `getAccessToken()` — Display token (truncated)
- `getIdToken()` — Display raw ID token
- `getDecodedIdToken()` — Display decoded claims as JSON
- `exchangeToken()` — With config form input

HTTP Client section:
- Text input for endpoint URL (default: `/scim2/Me`)
- Dropdown for HTTP method (GET, POST, PUT, PATCH, DELETE)
- Textarea for request body (for POST/PUT/PATCH)
- Send button → display response in ResultPanel
- Uses `http.request()` from `useAsgardeo()`

**`UserApiSection.vue`** — `useUser()`

Reactive state: `profile`, `flattenedProfile`, `schemas` (collapsible JSON viewers)

Method buttons:
- `revalidateProfile()` — Refetch and display
- `updateProfile(payload)` — Editable JSON textarea for SCIM2 PATCH payload

**`OrganizationApiSection.vue`** — `useOrganization()`

Reactive state: `currentOrganization`, `myOrganizations`, `isLoading`, `error`

Method buttons:
- `switchOrganization(org)` — Dropdown to select org from `myOrganizations`
- `getAllOrganizations()` — Fetch and display paginated results
- `revalidateMyOrganizations()` — Refetch
- `createOrganization(payload)` — Form with name + description fields

**`FlowApiSection.vue`** — `useFlow()`

Reactive state: `currentStep`, `title`, `subtitle`, `messages`, `isLoading`, `showBackButton`, `error`

Method buttons:
- `setCurrentStep(step)` — Text input for step name
- `setTitle(title)` — Text input
- `setSubtitle(subtitle)` — Text input
- `addMessage(message)` — Text input with severity picker
- `removeMessage(id)` — Input for message ID
- `clearMessages()` — Direct call
- `navigateToFlow(flow)` — Text input for flow name
- `reset()` — Direct call

**`FlowMetaApiSection.vue`** — `useFlowMeta()`

Reactive state: `meta` (collapsible JSON), `isLoading`, `error`

Method buttons:
- `fetchFlowMeta()` — Refetch metadata
- `switchLanguage(lang)` — Dropdown with available languages

**`ThemeApiSection.vue`** — `useTheme()`

Reactive state: `theme` (collapsible JSON), `colorScheme`, `direction`, `isBrandingLoading`

Method buttons:
- `toggleTheme()` — Toggle light/dark with live effect

**`BrandingApiSection.vue`** — `useBranding()`

Reactive state: `brandingPreference` (JSON), `theme` (JSON), `activeTheme`, `isLoading`, `error`

Method buttons:
- `fetchBranding()` — Fetch (deduplicated)
- `refetch()` — Force fresh fetch

**`I18nApiSection.vue`** — `useI18n()`

Reactive state: `currentLanguage`, `fallbackLanguage`, `bundles` (list)

Method demos:
- `t(key)` — Text input for i18n key → show translated result
- `setLanguage(lang)` — Dropdown to switch language
- `injectBundles(bundles)` — JSON textarea to inject custom bundles

---

### Phase 6: Polish & Cleanup (Step 14)

#### Step 14: Final Polish

1. **Delete old view files** — Remove old view files that are no longer used:
   - `ActionsView.vue`
   - `PrimitivesView.vue`
   - `PresentationView.vue`
   - `ControlView.vue`
   - `AdaptersView.vue`
   - `AuthFlowView.vue`
   - `FactoriesView.vue`
   - `ComposablesView.vue`

2. **Responsive design pass** — Test all pages at mobile/tablet/desktop widths

3. **Accessibility** — Ensure proper ARIA labels on tabs, buttons, and interactive controls

4. **Error boundaries** — Wrap demo sections with try-catch to prevent one broken demo from crashing the page

5. **Code snippets** — Add relevant usage code snippets next to each demo section

6. **Build check** — Run `pnpm build` to ensure no TypeScript errors

---

## 6. Shared Components & Utilities

### Layout Components API

#### `PageHeader`
```vue
<PageHeader title="Components" description="Explore all SDK UI components." />
```

#### `SectionCard`
```vue
<SectionCard title="Button" description="Configurable button with variants.">
  <!-- Demo content -->
</SectionCard>
```

#### `TabGroup`
```vue
<TabGroup v-model="activeTab" :tabs="[
  { key: 'primitives', label: 'Primitives' },
  { key: 'actions', label: 'Actions' },
]">
  <template #primitives>...</template>
  <template #actions>...</template>
</TabGroup>
```

#### `CodeBlock`
```vue
<CodeBlock :code="`<SignInButton />`" language="vue" />
```

#### `ResultPanel`
```vue
<ResultPanel :result="apiResult" :is-loading="isLoading" :error="errorMsg" />
```

#### `EventLog`
```vue
<EventLog :events="eventLog" />
```

---

## 7. Styling & UX Guidelines

### Tailwind Class Conventions

```
Page padding:        p-6 (already set in App.vue)
Card:                bg-white rounded-lg shadow-sm border border-gray-200 p-6
Section spacing:     space-y-8
Grid layout:         grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
Tab active:          border-b-2 border-indigo-500 text-indigo-600 font-medium
Tab inactive:        text-gray-500 hover:text-gray-700
Button primary:      bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700
Button secondary:    border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50
Status green:        bg-green-100 text-green-800
Status yellow:       bg-yellow-100 text-yellow-800
Status red:          bg-red-100 text-red-800
Code block:          bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm
Result panel:        bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm
```

### Dark Mode

- Keep the existing `@media (prefers-color-scheme: dark)` CSS variables from `base.css`
- Use Tailwind's `dark:` variants where needed
- The playground itself should work in both light and dark modes

---

## 8. Testing Checklist

### Functionality

- [ ] All 4 routes load without errors
- [ ] Tab switching works on Auth Flows and Components pages
- [ ] Sign In / Sign Out / Sign Up buttons trigger SDK methods
- [ ] Silent sign-in works from Overview page
- [ ] Social login buttons render with correct branding
- [ ] Embedded sign-in form renders in App-Native tab (requires `applicationId` configured)
- [ ] Embedded sign-up form renders in App-Native tab
- [ ] All primitive components render with interactive prop controls
- [ ] Control components show/hide based on auth state
- [ ] Presentation components (UserProfile, OrganizationList, etc.) render when signed in
- [ ] Every composable method in Public APIs returns results

### Responsive

- [ ] Sidebar collapses on mobile (<768px)
- [ ] Tab groups stack or scroll on narrow widths
- [ ] Component demos don't overflow their containers
- [ ] Public APIs page is usable on tablet widths

### Build

- [ ] `pnpm build` succeeds with no TypeScript errors
- [ ] `pnpm type-check` passes
- [ ] No console errors in dev mode
- [ ] Lazy-loaded routes load correctly in production build
