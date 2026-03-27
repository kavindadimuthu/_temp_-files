# Execution Guide — Prompt-by-Prompt Agent Workflow

> Use this document to execute the playground implementation step-by-step with your AI coding agent.
> Each step is a self-contained prompt you can give to your agent.

---

## Prerequisites

Before starting, ensure:
- The workspace is at `samples/vue-sdk-playground/`
- `@asgardeo/vue` package is built (`pnpm build` from root)
- `pnpm install` has been run
- Dev server works: `pnpm dev` → `http://localhost:5173`

---

## Phase 1: Foundation & Layout

### Prompt 1 — Create Shared Layout Components

```
Create the following shared layout components for the Vue SDK playground. All components should use <script setup lang="ts"> and Tailwind CSS classes. Create them under src/components/layout/ and src/components/shared/.

1. src/components/layout/PageHeader.vue
   - Props: title (string, required), description (string, optional)
   - Renders an h1 heading and optional p description paragraph
   - Tailwind: text-2xl font-bold text-gray-900 for title, text-gray-600 mt-1 for description

2. src/components/layout/SectionCard.vue
   - Props: title (string, required), description (string, optional), collapsible (boolean, default false)
   - Default slot for content
   - Card styling: bg-white rounded-lg shadow-sm border border-gray-200 p-6
   - If collapsible, add a toggle button in the header that shows/hides content

3. src/components/layout/TabGroup.vue
   - Props: tabs (array of { key: string, label: string }), modelValue (string)
   - Emits: update:modelValue
   - Renders tab buttons in a row with active indicator (border-b-2 border-indigo-500)
   - Uses named dynamic slots: one <slot> per tab.key, only renders the active one
   - Tailwind: border-b border-gray-200 for tab bar, flex gap-4 for tabs

4. src/components/layout/CodeBlock.vue
   - Props: code (string, required), language (string, optional, default 'vue')
   - Renders a <pre><code> block with a "Copy" button in the top-right corner
   - Copy button uses navigator.clipboard.writeText() and shows "Copied!" for 2 seconds
   - Tailwind: bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto relative

5. src/components/shared/ResultPanel.vue
   - Props: result (unknown, optional), isLoading (boolean, default false), error (string, optional)
   - Shows a Spinner when loading, error message in red when error, or JSON.stringify(result, null, 2) otherwise
   - Tailwind: bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm min-h-[100px]

6. src/components/shared/EventLog.vue
   - Props: events (array of { timestamp: string, type: string, data?: unknown })
   - Renders a scrollable list of events with timestamp and type badge
   - Max height 300px with overflow-y-auto
   - Each event shows timestamp (text-gray-400 text-xs), type (badge), and optional data

Do not add any extra features or over-engineer. Keep it simple.
```

### Prompt 2 — Update Sidebar and Router

```
Refactor the Vue SDK playground navigation from 9 routes to 4 main routes.

1. Update src/components/Sidebar.vue:
   - Replace the current navItems array with exactly 4 items:
     { path: '/', label: 'Overview', icon: 'home' }
     { path: '/auth-flows', label: 'Auth Flows', icon: 'key' }
     { path: '/components', label: 'Components', icon: 'box' }
     { path: '/public-apis', label: 'Public APIs', icon: 'code' }
   - Keep the existing mobile-responsive behavior, styling, and transitions
   - Use simple inline SVG icons (Heroicons style) for each nav item

2. Update src/router/index.ts:
   - Import createCallbackRoute from '@asgardeo/vue'
   - Define 4 routes using lazy imports:
     { path: '/', component: () => import('../views/OverviewView.vue') }
     { path: '/auth-flows', component: () => import('../views/AuthFlowsView.vue') }
     { path: '/components', component: () => import('../views/ComponentsView.vue') }
     { path: '/public-apis', component: () => import('../views/PublicApisView.vue') }
     createCallbackRoute({ path: '/callback' })

3. Create placeholder files for the 3 new views (AuthFlowsView.vue, ComponentsView.vue, PublicApisView.vue) with just a PageHeader and "Coming soon" text. Keep and modify OverviewView.vue.

Do NOT delete old view files yet — we'll migrate content first.
```

---

## Phase 2: Overview Page

### Prompt 3 — Build Overview Page

```
Rebuild src/views/OverviewView.vue for the Vue SDK playground. Use <script setup lang="ts"> with Tailwind CSS. Import shared layout components from '@/components/layout/'.

The page should have these sections in order:

1. PageHeader with title "Overview" and description "Dashboard showing SDK state, quick actions, and navigation."

2. Quick Actions Bar:
   - Use <SignedOut> from @asgardeo/vue: show <SignInButton> and <SignUpButton> side by side
   - Use <SignedIn> from @asgardeo/vue: show a greeting "Welcome, {givenName}" and <SignOutButton>
   - Use <Loading> from @asgardeo/vue: show a <Spinner>
   - Get user's givenName from useUser().flattenedProfile

3. SDK Status Dashboard:
   - Use useAsgardeo() to get isInitialized, isLoading, isSignedIn
   - Display 3 status cards in a grid (grid-cols-3 gap-4)
   - Each card shows: label, status icon (green check or yellow clock or red x), and value
   - Cards: "Initialized" (isInitialized), "Ready" (!isLoading), "Authenticated" (isSignedIn)

4. Configuration Panel:
   - SectionCard titled "Configuration"
   - Display a definition list showing: baseUrl, clientId (from useAsgardeo())
   - Each row: label in gray, value in monospace with a copy button
   - Add a note: "Edit configuration in App.vue's <AsgardeoProvider> props"

5. User Info Panel (only visible when signed in — wrap in <SignedIn>):
   - SectionCard titled "Current User"
   - Show flattenedProfile data: userName, givenName, familyName, email
   - Add buttons: "Get Access Token", "Get Decoded ID Token"
   - Show results in a <ResultPanel> when fetched

6. Quick Links:
   - 3 cards in a grid linking to /auth-flows, /components, /public-apis
   - Each card: RouterLink with title, short description, and arrow icon
   - Hover: shadow-md transition

Use imports from @asgardeo/vue for: useAsgardeo, useUser, SignedIn, SignedOut, Loading, SignInButton, SignOutButton, SignUpButton, Spinner.
Reference the existing OverviewView.vue for patterns but rebuild from scratch with the new layout.
```

---

## Phase 3: Auth Flows Page

### Prompt 4 — Build Auth Flows Page (Redirect Tab)

```
Build the Auth Flows page at src/views/AuthFlowsView.vue. Use <script setup lang="ts"> with Tailwind CSS.

The page has a TabGroup with 2 tabs: "Redirect Flow" (key: redirect) and "App-Native Flow" (key: app-native).

For now, implement only the REDIRECT TAB. Leave the app-native tab with placeholder content.

Redirect tab content:

1. SectionCard "Authentication Buttons":
   - Row of standard buttons: <SignInButton>, <SignOutButton>, <SignUpButton>
   - Row of base (unstyled) buttons: <BaseSignInButton>, <BaseSignOutButton>, <BaseSignUpButton> with custom slot content
   - Example with custom slot:
     <SignInButton v-slot="{ isLoading }">
       <span>{{ isLoading ? 'Signing in...' : 'Custom Sign In' }}</span>
     </SignInButton>

2. SectionCard "Advanced Actions":
   - Button "Sign In with Prompt" → calls signIn() (from useAsgardeo)
   - Button "Silent Sign In" → calls signInSilently()
   - Show result/errors in ResultPanel

3. SectionCard "Social Login":
   - <GoogleButton>, <GitHubButton>, <MicrosoftButton>, <FacebookButton>
   - Each with @click handler logging to EventLog

4. SectionCard "OAuth2 Redirect Flow":
   - Visual numbered steps explaining the flow (use ordered list with styled numbers):
     Step 1: User clicks Sign In → Redirect to Asgardeo
     Step 2: User authenticates at identity provider
     Step 3: Asgardeo redirects back with authorization code
     Step 4: <Callback> component exchanges code for tokens
     Step 5: SDK stores tokens, user is authenticated
   - CodeBlock showing callback route setup:
     import { createCallbackRoute } from '@asgardeo/vue'
     // In router: createCallbackRoute({ path: '/callback' })
   - CodeBlock showing route guard setup:
     import { createAsgardeoGuard } from '@asgardeo/vue'
     router.beforeEach(createAsgardeoGuard({ redirectTo: '/login' }))

Import from @asgardeo/vue: SignInButton, SignOutButton, SignUpButton, BaseSignInButton, BaseSignOutButton, BaseSignUpButton, GoogleButton, GitHubButton, MicrosoftButton, FacebookButton, useAsgardeo.
```

### Prompt 5 — Build Auth Flows Page (App-Native Tab)

```
Complete the App-Native tab in src/views/AuthFlowsView.vue.

The app-native tab should have these sections:

1. SectionCard "Embedded Sign In":
   - Left column: <SignIn /> (styled, from @asgardeo/vue)
   - Right column: Description explaining this is a server-driven embedded sign-in form
   - Event handlers: @complete, @error, @flowChange — log events to EventLog
   - Note: "Requires applicationId prop on AsgardeoProvider"

2. SectionCard "Embedded Sign Up":
   - Left column: <SignUp /> (styled, from @asgardeo/vue)
   - Right column: Description text
   - Same event handlers logging to EventLog

3. SectionCard "Flow State Inspector":
   - Use useFlow() composable to display live state:
     currentStep, title, subtitle, messages (as JSON), isLoading, showBackButton
   - Use useFlowMeta() composable to display:
     meta (collapsible JSON in ResultPanel), isLoading, error
   - Show all values in a table format, auto-updating reactively
   - Add button "Fetch Flow Meta" calling fetchFlowMeta()

4. Shared EventLog at the bottom of the tab showing all events from both SignIn and SignUp

Import from @asgardeo/vue: SignIn, SignUp, useFlow, useFlowMeta.
Keep the existing redirect tab code intact.
```

---

## Phase 4: Components Page

### Prompt 6 — Build Components Page Shell + Primitives Tab

```
Build the Components page at src/views/ComponentsView.vue with a TabGroup containing 5 tabs: Primitives, Actions, Control, Presentation, Social Logins.

Each tab should load a separate component for code organization:
- src/views/components/PrimitivesTab.vue
- src/views/components/ActionsTab.vue (placeholder for now)
- src/views/components/ControlTab.vue (placeholder for now)
- src/views/components/PresentationTab.vue (placeholder for now)
- src/views/components/SocialLoginsTab.vue (placeholder for now)

Implement PrimitivesTab.vue fully:

For each primitive component, create a SectionCard with:
- Component name as title
- Live preview on the left
- Interactive prop controls on the right (dropdowns, checkboxes, text inputs bound with v-model)

Components to demo (each in its own SectionCard):

1. Button: Controls for variant (solid/outline/ghost/text), color (primary/secondary/danger), size (small/medium/large), disabled checkbox, loading checkbox, fullWidth checkbox
2. TextField: Controls for type (text/email/number/tel/url), placeholder input, required checkbox, disabled checkbox, error text input
3. PasswordField: Controls for placeholder, required checkbox, disabled checkbox
4. Select: Pre-populated options array, placeholder, required/disabled checkboxes
5. Checkbox: Label input, required/disabled checkboxes
6. DatePicker: Label input, required/disabled checkboxes
7. OtpField: Number input for length (default 6), required/disabled checkboxes
8. Card: Variant dropdown (elevated/outlined/flat), sample content in slot
9. Alert: Severity dropdown (success/error/warning/info), dismissible checkbox, text content
10. Typography: Variant dropdown (h1 through overline), sample text
11. Spinner: Size dropdown (small/medium/large)
12. Logo: Text inputs for src and alt
13. Divider: Static demo (no controls)
14. Icons: Grid of all 16 icons with their names below: UserIcon, EyeIcon, EyeOffIcon, ChevronDownIcon, CheckIcon, CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon, XIcon, PlusIcon, LogOutIcon, ArrowLeftRightIcon, BuildingIcon, GlobeIcon, PencilIcon

Use reactive refs for each component's prop state. Import all primitives from @asgardeo/vue.
Use a two-column layout per component: md:grid-cols-2 gap-6 with live preview left and controls right.
```

### Prompt 7 — Build Actions Tab

```
Implement src/views/components/ActionsTab.vue for the Components page.

Content:

1. SectionCard "SignInButton":
   - Default rendering: <SignInButton />
   - Custom slot: <SignInButton v-slot="{ isLoading }">{{ isLoading ? 'Signing in...' : 'Custom Sign In' }}</SignInButton>
   - Base unstyled: <BaseSignInButton>Custom styled sign in</BaseSignInButton>
   - Event log showing @click and @error events

2. SectionCard "SignOutButton":
   - Default: <SignOutButton />
   - Custom slot with loading state
   - Base unstyled: <BaseSignOutButton>
   - Event log

3. SectionCard "SignUpButton":
   - Default: <SignUpButton />
   - Custom slot with loading state
   - Base unstyled: <BaseSignUpButton>
   - Event log

Each section should have:
- Live component demos
- EventLog tracking clicks and errors
- Brief description of styled vs base variants

Import from @asgardeo/vue: SignInButton, BaseSignInButton, SignOutButton, BaseSignOutButton, SignUpButton, BaseSignUpButton.
Use the shared EventLog component.
```

### Prompt 8 — Build Control Tab

```
Implement src/views/components/ControlTab.vue for the Components page.

Content:

1. SectionCard "Conditional Rendering":
   - Demo <SignedIn> with default slot showing "You are signed in!" alert (success)
   - Demo <SignedIn> with fallback slot: default shows user greeting, fallback shows "Please sign in"
   - Demo <SignedOut> with default slot showing "You are signed out" alert (info)
   - Demo <SignedOut> with fallback slot
   - Demo <Loading> with default slot showing Spinner, fallback showing "SDK Ready"
   - Each demo should have a label and the current state visible

2. SectionCard "Data Access Components":
   - Demo <User> scoped slot: <User v-slot="{ user }">{{ user?.flattenedProfile?.givenName }}</User>
     Show the full user object in a ResultPanel
   - Demo <Organization> scoped slot: <Organization v-slot="{ organization }">{{ organization?.currentOrganization?.name }}</Organization>
     Show the org object in a ResultPanel

3. SectionCard "Nested Composition":
   - Example combining components:
     <SignedIn>
       <User v-slot="{ user }">
         <div>Hello, {{ user?.flattenedProfile?.givenName }}</div>
         <Organization v-slot="{ organization }">
           <div>Org: {{ organization?.currentOrganization?.name }}</div>
         </Organization>
       </User>
     </SignedIn>
     <SignedOut>
       <p>Sign in to see your profile</p>
     </SignedOut>

Import: SignedIn, SignedOut, Loading, Spinner from @asgardeo/vue.
Note: User and Organization control components — check the actual export names from the SDK (they may be exported as UserComponent and OrganizationComponent to avoid name conflicts).
```

### Prompt 9 — Build Presentation Tab

```
Implement src/views/components/PresentationTab.vue for the Components page.

Group the demos into sub-sections:

1. "User Components" heading
   - SectionCard "UserProfile": Render <UserProfile /> (styled). Only visible when signed in (wrap in <SignedIn>). Add note about editable prop.
   - SectionCard "BaseUserProfile": Render <BaseUserProfile> with scoped slot showing custom layout
   - SectionCard "UserDropdown": Render <UserDropdown /> with descriptive text

2. "Organization Components" heading
   - SectionCard "OrganizationList": Render <OrganizationList /> showing user's orgs
   - SectionCard "OrganizationSwitcher": Render <OrganizationSwitcher />
   - SectionCard "OrganizationProfile": Render <OrganizationProfile />
   - SectionCard "CreateOrganization": Render <CreateOrganization /> form
   - SectionCard "InviteUser": Render <InviteUser /> form

3. "Utility Components" heading
   - SectionCard "LanguageSwitcher": Render <LanguageSwitcher />
   - SectionCard "FieldFactory": Dynamic form demo
     - Provide a sample FieldConfig array (text, email, password, select, checkbox fields)
     - Render <FieldFactory> with the config
     - Show current form values in a ResultPanel
   - SectionCard "AcceptInvite": Show <AcceptInvite /> with explanation text

Wrap organization and user components in <SignedIn> where they require auth state.
Import all presentation components from @asgardeo/vue.
```

### Prompt 10 — Build Social Logins Tab

```
Implement src/views/components/SocialLoginsTab.vue for the Components page.

Content:

1. SectionCard "Social Login Buttons":
   - Grid display (grid-cols-2 gap-4) of:
     <GoogleButton @click="logEvent('google')" />
     <GitHubButton @click="logEvent('github')" />
     <MicrosoftButton @click="logEvent('microsoft')" />
     <FacebookButton @click="logEvent('facebook')" />

2. SectionCard "Custom Slot Rendering":
   - Demo each button with custom slot:
     <GoogleButton v-slot="{ isLoading }">
       {{ isLoading ? 'Connecting to Google...' : 'Continue with Google' }}
     </GoogleButton>
   - Same for GitHub, Microsoft, Facebook

3. SectionCard "Combined Social Login Panel":
   - Example layout showing how to compose a social login panel:
     Card with title "Sign in with", all 4 buttons stacked vertically, a Divider, then an email/password form using TextField and PasswordField
   - This demonstrates real-world usage pattern

4. EventLog at the bottom showing all button click events

Import: GoogleButton, GitHubButton, MicrosoftButton, FacebookButton, Card, Divider, TextField, PasswordField from @asgardeo/vue.
```

---

## Phase 5: Public APIs Page

### Prompt 11 — Build Public APIs Page Shell + useAsgardeo Section

```
Build the Public APIs page at src/views/PublicApisView.vue.

Layout: Collapsible accordion-style sections, one per composable. Each section has a header (click to expand/collapse) and content area.

Create sub-components under src/views/apis/ for each composable section. For now implement the shell and the first section:

1. PublicApisView.vue:
   - PageHeader: "Public APIs" with description "Interactive playground to test SDK composables and inspect their state."
   - Accordion of 8 sections (each expandable/collapsible, default collapsed except first)
   - Each section header shows composable name and brief description

2. src/views/apis/AsgardeoApiSection.vue — useAsgardeo():
   
   Reactive State Table:
   - isSignedIn, isLoading, isInitialized as colored status badges
   - clientId, baseUrl as monospace text
   
   Method Buttons (each in a flex row):
   - signIn() — triggers redirect
   - signOut() — triggers redirect  
   - signUp() — triggers redirect
   - signInSilently() — show result in ResultPanel
   - getAccessToken() — show token (first 50 chars + "...") in ResultPanel
   - getIdToken() — show raw token in ResultPanel
   - getDecodedIdToken() — show decoded JSON in ResultPanel
   
   HTTP Client Section:
   - Text input for endpoint path (default: /scim2/Me)
   - Dropdown for method (GET, POST, PUT, PATCH, DELETE)
   - Textarea for body (shown only for POST/PUT/PATCH)
   - "Send Request" button
   - ResultPanel showing response
   - Use http.request() from useAsgardeo()

Create placeholder files for other 7 API section components.
Import from @asgardeo/vue: useAsgardeo.
```

### Prompt 12 — Build Remaining API Sections

```
Implement the remaining 7 API section components under src/views/apis/. Each follows the same pattern: reactive state table, method buttons, ResultPanel for results.

1. src/views/apis/UserApiSection.vue — useUser():
   - State: profile (collapsible JSON), flattenedProfile (collapsible JSON), schemas (collapsible JSON)
   - Methods: revalidateProfile() button, updateProfile() with JSON textarea input

2. src/views/apis/OrganizationApiSection.vue — useOrganization():
   - State: currentOrganization (JSON), myOrganizations (JSON list), isLoading (badge), error (text)
   - Methods: switchOrganization() with dropdown of myOrganizations, getAllOrganizations() button, revalidateMyOrganizations() button, createOrganization() with name+description inputs

3. src/views/apis/FlowApiSection.vue — useFlow():
   - State: currentStep, title, subtitle, messages (JSON), isLoading (badge), showBackButton (badge), error
   - Methods: setCurrentStep() with text input, setTitle() with text input, setSubtitle() with text input, addMessage() with text+severity inputs, removeMessage() with ID input, clearMessages() button, navigateToFlow() with text input, reset() button

4. src/views/apis/FlowMetaApiSection.vue — useFlowMeta():
   - State: meta (collapsible JSON), isLoading (badge), error (text)
   - Methods: fetchFlowMeta() button, switchLanguage() with text input

5. src/views/apis/ThemeApiSection.vue — useTheme():
   - State: theme (collapsible JSON), colorScheme (text), direction (text), isBrandingLoading (badge)
   - Methods: toggleTheme() button with live effect

6. src/views/apis/BrandingApiSection.vue — useBranding():
   - State: brandingPreference (collapsible JSON), theme (collapsible JSON), activeTheme (text), isLoading (badge), error (text)
   - Methods: fetchBranding() button, refetch() button

7. src/views/apis/I18nApiSection.vue — useI18n():
   - State: currentLanguage (text), fallbackLanguage (text), bundles (JSON list)
   - Methods: t() with key text input showing result, setLanguage() with language input, injectBundles() with JSON textarea

Each section uses the shared ResultPanel and wraps async calls in try-catch with error display.
Import composables from @asgardeo/vue.
```

---

## Phase 6: Cleanup

### Prompt 13 — Final Cleanup and Polish

```
Finalize the Vue SDK playground:

1. Delete the old view files that are no longer used:
   - src/views/ActionsView.vue
   - src/views/PrimitivesView.vue  
   - src/views/PresentationView.vue
   - src/views/ControlView.vue
   - src/views/AdaptersView.vue
   - src/views/AuthFlowView.vue
   - src/views/FactoriesView.vue
   - src/views/ComposablesView.vue

2. Verify all imports in the router are correct and no dead imports remain.

3. Run the TypeScript type check (pnpm type-check) and fix any errors.

4. Run the build (pnpm build) and fix any build errors.

5. Review each page for consistent spacing, responsive layout, and proper Tailwind classes:
   - All pages should use PageHeader at the top
   - All demo sections should use SectionCard
   - Consistent gap-4 or gap-6 spacing between sections
   - Mobile responsive: single column on small screens, multi-column on large

6. Ensure proper error handling: wrap demo sections that might fail (e.g., API calls, auth-dependent components) in v-if guards or try-catch.

Do NOT add any new features. Focus purely on cleanup, consistency, and ensuring everything compiles.
```

---

## Verification

After all prompts are complete, verify:

```bash
cd samples/vue-sdk-playground
pnpm dev
```

Open `http://localhost:5173` and check:
- [ ] Sidebar shows 4 navigation items
- [ ] All 4 pages load without console errors
- [ ] Overview shows SDK status and quick actions
- [ ] Auth Flows tabs switch between redirect and app-native
- [ ] Components page has all 5 tabs with interactive demos
- [ ] Public APIs page shows all 8 composable sections
- [ ] Sign in/out works end-to-end
- [ ] Mobile responsive sidebar works
