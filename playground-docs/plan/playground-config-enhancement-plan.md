# Playground Configuration Enhancement Plan

**Target**: `samples/vue-sdk-playground`  
**Goal**: Replace the hard-coded `<AsgardeoProvider>` props in `App.vue` with a flexible,
user-friendly in-browser configuration system backed by `localStorage`.

---

## 1. Problem Statement

Currently, all `AsgardeoProvider` configuration is hard-coded directly in `App.vue`:

```html
<AsgardeoProvider
  base-url="https://api.asgardeo.io/t/orgkavinda"
  client-id="OloUfnEtap8y12niKe0bsmfVGiAa"
  application-id="6ee53a1…"
  after-sign-in-url="http://localhost:5173"
  after-sign-out-url="http://localhost:5173"
>
```

To switch between tenants, test optional parameters, or onboard a new contributor, a developer
must **manually edit source files**. This creates friction and makes the playground harder to
experiment with.

---

## 2. Design Principles

| Principle | How it applies |
|---|---|
| **Progressive disclosure** | Show only mandatory fields first; expand to optional groups on demand |
| **Zero friction first run** | Blank slate shows a focused setup screen, not broken UI |
| **Persistent state** | `localStorage` stores config so it survives page reloads |
| **Reset escape hatch** | Always allow clearing config and starting over |
| **Design consistency** | Reuse `SectionCard`, `CodeBlock`, `bg-surface-secondary`, CSS variables already in the playground |
| **No mandatory `.env` file** | The playground works out-of-the-box after answering the setup wizard |
| **Not strict** | All optional fields remain optional; wizard never blocks on them |

---

## 3. AsgardeoProvider Configuration Reference

All props accepted by `<AsgardeoProvider>` (from `packages/vue/src/providers/AsgardeoProvider.ts`):

| Prop | Required | Type | Description |
|---|---|---|---|
| `baseUrl` | ✅ Yes | `string` | Base URL of the Asgardeo tenant |
| `clientId` | ✅ Yes | `string` | OAuth2 client ID |
| `afterSignInUrl` | Recommended | `string` | Redirect URL after sign in |
| `afterSignOutUrl` | Recommended | `string` | Redirect URL after sign out |
| `applicationId` | Optional | `string` | Application ID — required for App-Native flow |
| `scopes` | Optional | `string[]` | Additional OAuth2 scopes |
| `organizationHandle` | Optional | `string` | Organization handle for B2B |
| `organizationChain` | Optional | `object` | Organization chain config |
| `platform` | Optional | `string` | Platform type |
| `storage` | Optional | `string` | Token storage type |
| `syncSession` | Optional | `boolean` | Sync sessions across tabs |
| `signInUrl` | Optional | `string` | Custom sign-in page URL |
| `signUpUrl` | Optional | `string` | Custom sign-up page URL |
| `signInOptions` | Optional | `object` | Additional sign-in options |
| `instanceId` | Optional | `number` | Instance ID for multi-instance |

---

## 4. Architecture Overview

```
samples/vue-sdk-playground/src/
├── App.vue                           ← Modified: load config reactively
├── composables/
│   ├── useThemeSwitch.ts             (existing — unchanged)
│   └── useProviderConfig.ts          ← NEW: config state + localStorage
├── components/
│   ├── Sidebar.vue                   ← Modified: add Settings button
│   ├── ThemeSwitcher.vue             (existing — unchanged)
│   └── config/                       ← NEW directory
│       ├── ConfigSetup.vue           ← NEW: first-run setup wizard
│       └── ConfigEditor.vue          ← NEW: edit config via sidebar panel
└── views/
    └── OverviewView.vue              ← Modified: richer config display panel
```

### Data Flow

```
localStorage  ←→  useProviderConfig  →  App.vue  →  <AsgardeoProvider v-bind="config">
                        ↑
              ConfigSetup / ConfigEditor
```

---

## 5. Progressive Disclosure: Field Groups

The setup wizard and editor organise props into groups that unlock progressively.

### Group 1 — Essentials (always visible, required)

| Field | Label | Hint |
|---|---|---|
| `baseUrl` | Tenant Base URL | `https://api.asgardeo.io/t/<org-name>` |
| `clientId` | Client ID | Found in Asgardeo Console → Applications → Info |

### Group 2 — Redirect URLs (shown immediately, recommended)

| Field | Label | Default |
|---|---|---|
| `afterSignInUrl` | After Sign-In URL | `http://localhost:5173` |
| `afterSignOutUrl` | After Sign-Out URL | `http://localhost:5173` |

### Group 3 — App-Native (collapsible, unlocked by toggle)

| Field | Label | Hint |
|---|---|---|
| `applicationId` | Application ID | Required only for App-Native / Embedded flow |

### Group 4 — Scopes & Advanced (collapsible)

| Field | Label | Type hint |
|---|---|---|
| `scopes` | Extra Scopes | Comma-separated, e.g. `openid profile email` |
| `organizationHandle` | Organization Handle | B2B use-cases |
| `storage` | Storage Type | `sessionStorage` / `localStorage` |
| `syncSession` | Sync Sessions | Toggle (boolean) |
| `signInUrl` | Custom Sign-In URL | Override default sign-in page |
| `signUpUrl` | Custom Sign-Up URL | Override default sign-up page |

---

## 6. Step-by-Step Implementation

### Step 1 — Create `useProviderConfig.ts` composable

**File**: `src/composables/useProviderConfig.ts`

This is the single source of truth for the entire configuration feature.

```typescript
import { ref, readonly, computed } from 'vue';

// ── Config shape ─────────────────────────────────────────────────────────────
export interface PlaygroundConfig {
  // Required
  baseUrl: string;
  clientId: string;
  // Recommended
  afterSignInUrl: string;
  afterSignOutUrl: string;
  // Optional
  applicationId?: string;
  scopes?: string[];          // stored as string[], input as comma-separated
  organizationHandle?: string;
  storage?: string;
  syncSession?: boolean;
  signInUrl?: string;
  signUpUrl?: string;
}

const STORAGE_KEY = 'vue-sdk-playground-config';

// Default redirect URLs — sensible for local dev
const DEFAULT_REDIRECT = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:5173';

function loadConfig(): PlaygroundConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlaygroundConfig;
  } catch {
    return null;
  }
}

function isValidConfig(cfg: PlaygroundConfig | null): boolean {
  return !!(cfg?.baseUrl && cfg?.clientId);
}

// ── Singleton reactive state ──────────────────────────────────────────────────
const savedConfig = ref<PlaygroundConfig | null>(loadConfig());
const isConfigured = computed(() => isValidConfig(savedConfig.value));

// ── Exported composable ───────────────────────────────────────────────────────
export function useProviderConfig() {
  function saveConfig(cfg: PlaygroundConfig): void {
    // Strip empty-string optional fields before saving
    const clean: PlaygroundConfig = {
      baseUrl: cfg.baseUrl.trim(),
      clientId: cfg.clientId.trim(),
      afterSignInUrl: cfg.afterSignInUrl || DEFAULT_REDIRECT,
      afterSignOutUrl: cfg.afterSignOutUrl || DEFAULT_REDIRECT,
    };
    if (cfg.applicationId?.trim()) clean.applicationId = cfg.applicationId.trim();
    if (cfg.scopes?.length) clean.scopes = cfg.scopes;
    if (cfg.organizationHandle?.trim()) clean.organizationHandle = cfg.organizationHandle.trim();
    if (cfg.storage?.trim()) clean.storage = cfg.storage.trim();
    if (cfg.syncSession !== undefined) clean.syncSession = cfg.syncSession;
    if (cfg.signInUrl?.trim()) clean.signInUrl = cfg.signInUrl.trim();
    if (cfg.signUpUrl?.trim()) clean.signUpUrl = cfg.signUpUrl.trim();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    savedConfig.value = clean;
  }

  function resetConfig(): void {
    localStorage.removeItem(STORAGE_KEY);
    savedConfig.value = null;
  }

  function getDefaults(): Partial<PlaygroundConfig> {
    return {
      afterSignInUrl: DEFAULT_REDIRECT,
      afterSignOutUrl: DEFAULT_REDIRECT,
    };
  }

  return {
    config: readonly(savedConfig),
    isConfigured,
    saveConfig,
    resetConfig,
    getDefaults,
  };
}
```

**Key design decisions**:
- Singleton reactive state (same pattern as `useThemeSwitch.ts`).
- Empty optional fields are stripped before saving — the provider receives `undefined`
  for omitted props, which matches its defaults.
- `isConfigured` is a computed, so all consumers auto-update when config changes.

---

### Step 2 — Create `ConfigSetup.vue` (first-run wizard)

**File**: `src/components/config/ConfigSetup.vue`

This component is displayed full-screen when `isConfigured === false`.

#### UI Anatomy

```
┌─────────────────────────────────────────────────────────┐
│  🔐  Welcome to the Asgardeo Vue SDK Playground         │
│  Connect your Asgardeo application to get started.      │
│─────────────────────────────────────────────────────────│
│  ── Step 1: Essentials ──────────────────────────────── │
│  Tenant Base URL  [________________________________]     │
│  Client ID        [________________________________]     │
│                                                         │
│  ── Step 2: Redirect URLs ───────────────────────────── │
│  After Sign-In URL  [http://localhost:5173_________]    │
│  After Sign-Out URL [http://localhost:5173_________]    │
│                                                         │
│  ▶ Optional Settings  (collapsed by default)            │
│                                                         │
│  [  Get Started  ]   [  See SDK Docs  ]                 │
└─────────────────────────────────────────────────────────┘
```

#### Implementation

```vue
<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useProviderConfig, type PlaygroundConfig } from '@/composables/useProviderConfig';

const { saveConfig, getDefaults } = useProviderConfig();

const defaults = getDefaults();
const showAdvanced = ref(false);

// Form state
const form = reactive<PlaygroundConfig>({
  baseUrl: '',
  clientId: '',
  afterSignInUrl: defaults.afterSignInUrl ?? 'http://localhost:5173',
  afterSignOutUrl: defaults.afterSignOutUrl ?? 'http://localhost:5173',
  applicationId: '',
  scopes: [],
  organizationHandle: '',
  storage: '',
  syncSession: undefined,
  signInUrl: '',
  signUpUrl: '',
});

// Scopes as editable string for the textarea
const scopesString = ref('');

const canSubmit = computed(
  () => form.baseUrl.trim() !== '' && form.clientId.trim() !== ''
);

function handleSave() {
  if (!canSubmit.value) return;
  // Parse comma/space-separated scopes into array
  const scopesArray = scopesString.value
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean);
  saveConfig({ ...form, scopes: scopesArray.length ? scopesArray : undefined });
}
</script>

<template>
  <div class="min-h-screen bg-surface flex items-center justify-center p-6">
    <div class="w-full max-w-lg bg-surface-secondary rounded-xl shadow-lg border border-border p-8 space-y-6">

      <!-- Header -->
      <div class="text-center space-y-2">
        <div class="w-12 h-12 mx-auto bg-accent-100 rounded-xl flex items-center justify-center">
          <!-- Lock icon -->
          <svg class="w-6 h-6 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <h1 class="text-xl font-semibold text-on-surface">Vue SDK Playground</h1>
        <p class="text-sm text-on-surface-muted">Connect your Asgardeo application to get started.</p>
      </div>

      <!-- Section: Essentials -->
      <div class="space-y-4">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-on-surface-muted">
          Essentials <span class="text-status-error-text ml-1">*</span>
        </h2>

        <div class="space-y-3">
          <ConfigField
            v-model="form.baseUrl"
            label="Tenant Base URL"
            placeholder="https://api.asgardeo.io/t/your-org"
            hint="Found in Asgardeo Console under your organization settings."
            :required="true"
          />
          <ConfigField
            v-model="form.clientId"
            label="Client ID"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
            hint="Found in Asgardeo Console → Applications → Your App → Info."
            :required="true"
          />
        </div>
      </div>

      <!-- Section: Redirect URLs -->
      <div class="space-y-4">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-on-surface-muted">
          Redirect URLs
        </h2>
        <div class="space-y-3">
          <ConfigField
            v-model="form.afterSignInUrl"
            label="After Sign-In URL"
            placeholder="http://localhost:5173"
          />
          <ConfigField
            v-model="form.afterSignOutUrl"
            label="After Sign-Out URL"
            placeholder="http://localhost:5173"
          />
        </div>
      </div>

      <!-- Optional toggle -->
      <button
        type="button"
        class="flex items-center gap-2 text-sm text-accent-600 hover:text-accent-800 transition-colors"
        @click="showAdvanced = !showAdvanced"
      >
        <svg
          class="w-4 h-4 transition-transform duration-200"
          :class="{ 'rotate-90': showAdvanced }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        {{ showAdvanced ? 'Hide' : 'Show' }} optional settings
      </button>

      <!-- Optional settings -->
      <div v-if="showAdvanced" class="space-y-4 border-t border-border-divider pt-4">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-on-surface-muted">
          Optional Settings
        </h2>
        <div class="space-y-3">
          <ConfigField
            v-model="form.applicationId"
            label="Application ID"
            hint="Required for App-Native (embedded) authentication flows."
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
          <ConfigField
            v-model="scopesString"
            label="Scopes"
            hint="Space or comma-separated. Example: openid profile email"
            placeholder="openid profile email"
          />
          <ConfigField
            v-model="form.organizationHandle"
            label="Organization Handle"
            hint="For B2B applications."
            placeholder="my-org"
          />
          <!-- Storage selector -->
          <div class="space-y-1">
            <label class="block text-sm text-on-surface-secondary">Storage Type</label>
            <select
              v-model="form.storage"
              class="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-accent-500"
            >
              <option value="">Default</option>
              <option value="sessionStorage">sessionStorage</option>
              <option value="localStorage">localStorage</option>
            </select>
          </div>
          <!-- syncSession toggle -->
          <label class="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <span class="text-sm text-on-surface-secondary">Sync Sessions</span>
              <p class="text-xs text-on-surface-muted">Keep session in sync across browser tabs.</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="form.syncSession ?? false"
              class="relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none"
              :class="form.syncSession ? 'bg-accent-600' : 'bg-border'"
              @click="form.syncSession = !form.syncSession"
            >
              <span
                class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                :class="form.syncSession ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </label>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-2">
        <button
          type="button"
          :disabled="!canSubmit"
          class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="canSubmit
            ? 'bg-accent-600 text-white hover:bg-accent-700'
            : 'bg-surface-muted text-on-surface-muted cursor-not-allowed'"
          @click="handleSave"
        >
          Get Started
        </button>
        <a
          href="https://wso2.com/asgardeo/docs/"
          target="_blank"
          rel="noopener noreferrer"
          class="px-4 py-2 rounded-lg text-sm font-medium border border-border text-on-surface-secondary hover:bg-surface-muted transition-colors"
        >
          Docs ↗
        </a>
      </div>

    </div>
  </div>
</template>
```

---

### Step 3 — Create `ConfigFieldRow.vue` (reusable input)

**File**: `src/components/config/ConfigFieldRow.vue`

A minimal, reusable field component used inside both `ConfigSetup` and `ConfigEditor`.

```vue
<script setup lang="ts">
defineProps<{
  modelValue: string;
  label: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}>();
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <div class="space-y-1">
    <label class="block text-sm text-on-surface-secondary">
      {{ label }}
      <span v-if="required" class="text-status-error-text ml-0.5">*</span>
    </label>
    <input
      :value="modelValue"
      :placeholder="placeholder"
      type="text"
      class="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-on-surface
             placeholder:text-on-surface-muted
             focus:outline-none focus:border-accent-500 transition-colors"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="hint" class="text-xs text-on-surface-muted">{{ hint }}</p>
  </div>
</template>
```

---

### Step 4 — Create `ConfigEditor.vue` (settings panel)

**File**: `src/components/config/ConfigEditor.vue`

A slide-in side panel overlaid on the right side (not a blocking modal) so the user can adjust
settings without losing their place in the playground.

```vue
<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { useProviderConfig, type PlaygroundConfig } from '@/composables/useProviderConfig';
import ConfigFieldRow from './ConfigFieldRow.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; reset: [] }>();

const { config, saveConfig, resetConfig } = useProviderConfig();

// Mirror saved config into editable form
const form = reactive<PlaygroundConfig>({
  baseUrl: '',
  clientId: '',
  afterSignInUrl: '',
  afterSignOutUrl: '',
  applicationId: '',
  scopes: [],
  organizationHandle: '',
  storage: '',
  syncSession: undefined,
  signInUrl: '',
  signUpUrl: '',
});

const scopesString = ref('');
const showAdvanced = ref(false);
const showResetConfirm = ref(false);

// Sync from config store whenever the panel is opened
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    const c = config.value;
    if (!c) return;
    form.baseUrl = c.baseUrl ?? '';
    form.clientId = c.clientId ?? '';
    form.afterSignInUrl = c.afterSignInUrl ?? '';
    form.afterSignOutUrl = c.afterSignOutUrl ?? '';
    form.applicationId = c.applicationId ?? '';
    scopesString.value = (c.scopes ?? []).join(', ');
    form.organizationHandle = c.organizationHandle ?? '';
    form.storage = c.storage ?? '';
    form.syncSession = c.syncSession;
    form.signInUrl = c.signInUrl ?? '';
    form.signUpUrl = c.signUpUrl ?? '';
  },
  { immediate: true }
);

const canSave = computed(
  () => form.baseUrl.trim() !== '' && form.clientId.trim() !== ''
);

function handleSave() {
  if (!canSave.value) return;
  const scopesArray = scopesString.value
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean);
  saveConfig({ ...form, scopes: scopesArray.length ? scopesArray : undefined });
  emit('close');
}

function handleReset() {
  resetConfig();
  showResetConfirm.value = false;
  emit('reset');
  emit('close');
}
</script>

<template>
  <!-- Overlay -->
  <Transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 z-40 bg-black/20"
      @click="$emit('close')"
    />
  </Transition>

  <!-- Drawer -->
  <Transition name="slide-right">
    <div
      v-if="open"
      class="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface-secondary
             shadow-xl border-l border-border flex flex-col"
    >
      <!-- Panel Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div>
          <h2 class="font-semibold text-on-surface">Provider Configuration</h2>
          <p class="text-xs text-on-surface-muted mt-0.5">Changes are saved to browser localStorage.</p>
        </div>
        <button
          type="button"
          class="text-on-surface-muted hover:text-on-surface transition-colors"
          @click="$emit('close')"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Scrollable content -->
      <div class="flex-1 overflow-y-auto px-5 py-5 space-y-6">

        <!-- Essentials -->
        <section class="space-y-3">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-on-surface-muted">
            Essentials
          </h3>
          <ConfigFieldRow
            v-model="form.baseUrl"
            label="Tenant Base URL"
            placeholder="https://api.asgardeo.io/t/your-org"
            :required="true"
          />
          <ConfigFieldRow
            v-model="form.clientId"
            label="Client ID"
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
            :required="true"
          />
        </section>

        <!-- Redirect URLs -->
        <section class="space-y-3">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-on-surface-muted">
            Redirect URLs
          </h3>
          <ConfigFieldRow
            v-model="form.afterSignInUrl"
            label="After Sign-In URL"
            placeholder="http://localhost:5173"
          />
          <ConfigFieldRow
            v-model="form.afterSignOutUrl"
            label="After Sign-Out URL"
            placeholder="http://localhost:5173"
          />
        </section>

        <!-- Optional settings -->
        <section class="space-y-3">
          <button
            type="button"
            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-on-surface-muted hover:text-on-surface transition-colors"
            @click="showAdvanced = !showAdvanced"
          >
            <svg
              class="w-3.5 h-3.5 transition-transform duration-200"
              :class="{ 'rotate-90': showAdvanced }"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            Optional Settings
          </button>

          <div v-if="showAdvanced" class="space-y-3 border-l-2 border-border-divider pl-4">
            <ConfigFieldRow
              v-model="form.applicationId"
              label="Application ID"
              hint="Required for App-Native flow."
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <ConfigFieldRow
              v-model="scopesString"
              label="Scopes"
              hint="Comma-separated. e.g. openid profile email"
              placeholder="openid profile email"
            />
            <ConfigFieldRow
              v-model="form.organizationHandle"
              label="Organization Handle"
              hint="For B2B applications."
              placeholder="my-org"
            />
            <div class="space-y-1">
              <label class="block text-sm text-on-surface-secondary">Storage Type</label>
              <select
                v-model="form.storage"
                class="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm
                       text-on-surface focus:outline-none focus:border-accent-500"
              >
                <option value="">Default</option>
                <option value="sessionStorage">sessionStorage</option>
                <option value="localStorage">localStorage</option>
              </select>
            </div>
            <ConfigFieldRow
              v-model="form.signInUrl"
              label="Custom Sign-In URL"
              placeholder="https://…"
            />
            <ConfigFieldRow
              v-model="form.signUpUrl"
              label="Custom Sign-Up URL"
              placeholder="https://…"
            />
            <label class="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <span class="text-sm text-on-surface-secondary">Sync Sessions</span>
                <p class="text-xs text-on-surface-muted">Sync across browser tabs.</p>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="form.syncSession ?? false"
                class="relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors"
                :class="form.syncSession ? 'bg-accent-600' : 'bg-border'"
                @click="form.syncSession = !form.syncSession"
              >
                <span
                  class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                  :class="form.syncSession ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </label>
          </div>
        </section>

      </div>

      <!-- Footer actions -->
      <div class="border-t border-border px-5 py-4 space-y-3 shrink-0">
        <div class="flex gap-3">
          <button
            type="button"
            :disabled="!canSave"
            class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="canSave
              ? 'bg-accent-600 text-white hover:bg-accent-700'
              : 'bg-surface-muted text-on-surface-muted cursor-not-allowed'"
            @click="handleSave"
          >
            Save & Apply
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg text-sm font-medium border border-border text-on-surface-secondary hover:bg-surface-muted transition-colors"
            @click="$emit('close')"
          >
            Cancel
          </button>
        </div>

        <!-- Reset -->
        <div v-if="!showResetConfirm">
          <button
            type="button"
            class="text-xs text-status-error-text hover:underline"
            @click="showResetConfirm = true"
          >
            Reset configuration…
          </button>
        </div>
        <div v-else class="text-xs space-y-2">
          <p class="text-on-surface-secondary">
            This will clear all saved configuration and return to the setup screen.
          </p>
          <div class="flex gap-2">
            <button
              type="button"
              class="px-3 py-1 rounded bg-status-error-bg text-status-error-text text-xs font-medium"
              @click="handleReset"
            >
              Clear & Reset
            </button>
            <button
              type="button"
              class="px-3 py-1 rounded border border-border text-xs"
              @click="showResetConfirm = false"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.25s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
```

---

### Step 5 — Modify `App.vue`

Replace hard-coded props with config from `useProviderConfig`. Show `ConfigSetup` when no
config exists.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { AsgardeoProvider } from '@asgardeo/vue';
import Sidebar from './components/Sidebar.vue';
import ConfigSetup from './components/config/ConfigSetup.vue';
import ConfigEditor from './components/config/ConfigEditor.vue';
import { useProviderConfig } from './composables/useProviderConfig';

const { config, isConfigured } = useProviderConfig();

// Controls the settings drawer from sidebar
const configEditorOpen = ref(false);

function openConfigEditor() {
  configEditorOpen.value = true;
}
function closeConfigEditor() {
  configEditorOpen.value = false;
}
</script>

<template>
  <!-- First-run setup screen -->
  <ConfigSetup v-if="!isConfigured" />

  <!-- Main app — shown once config is set -->
  <template v-else>
    <AsgardeoProvider v-bind="config!">
      <div class="min-h-screen bg-surface">
        <Sidebar @open-config="openConfigEditor" />
        <div class="md:ml-64">
          <div class="p-6">
            <RouterView />
          </div>
        </div>
      </div>
    </AsgardeoProvider>

    <!-- Config editor drawer (overlay) -->
    <ConfigEditor
      :open="configEditorOpen"
      @close="closeConfigEditor"
      @reset="() => {}"
    />
  </template>
</template>
```

**Why `v-bind="config!"`?**  
`PlaygroundConfig` has exactly the same field names as `AsgardeoProvider`'s props
(`baseUrl`, `clientId`, etc.). Spreading the config object directly means zero maintenance when
new props are added — just add the field to `PlaygroundConfig` and the provider picks it up.

---

### Step 6 — Modify `Sidebar.vue`

Add a **Settings** button above `ThemeSwitcher` that emits `open-config`.

Change in the bottom section of `Sidebar.vue`:

```html
<!-- Before the ThemeSwitcher: -->
<div class="border-t border-sidebar-hover-bg p-4 shrink-0 space-y-3">

  <!-- Settings button -->
  <button
    type="button"
    class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-text hover:bg-sidebar-hover-bg transition-colors"
    @click="$emit('open-config')"
  >
    <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
    Provider Settings
  </button>

  <ThemeSwitcher />
</div>
```

Also add `defineEmits<{ 'open-config': [] }>()` to the `<script setup>` in `Sidebar.vue`.

---

### Step 7 — Enhance `OverviewView.vue` Configuration Panel

Replace the current static config display in the Overview's **Configuration** section with a
richer panel that shows all active config values and links to the editor.

```html
<!-- In OverviewView.vue, replace the simple dl inside SectionCard title="Configuration" -->
<SectionCard title="Provider Configuration">
  <div class="space-y-3">
    <!-- Required fields -->
    <div
      v-for="[key, value, badge] in [
        ['baseUrl',    baseUrl,   'required'],
        ['clientId',   clientId,  'required'],
      ]"
      :key="key"
      class="flex items-start gap-3"
    >
      <dt class="w-28 shrink-0 text-sm text-on-surface-muted pt-0.5 font-mono">{{ key }}</dt>
      <dd class="flex items-center gap-2 min-w-0 flex-1">
        <span class="font-mono text-sm text-on-surface break-all">{{ value ?? '—' }}</span>
        <button
          v-if="value"
          type="button"
          class="shrink-0 text-xs text-accent-600 hover:text-accent-800 transition-colors"
          @click="copyValue(key, value)"
        >
          {{ copiedKey === key ? 'Copied!' : 'Copy' }}
        </button>
        <span class="shrink-0 text-xs px-1.5 py-0.5 rounded bg-status-error-bg text-status-error-text">
          {{ badge }}
        </span>
      </dd>
    </div>

    <!-- Optional fields — show only those with values -->
    <template
      v-for="[key, value] in [
        ['applicationId',      config?.applicationId],
        ['afterSignInUrl',     config?.afterSignInUrl],
        ['afterSignOutUrl',    config?.afterSignOutUrl],
        ['scopes',             config?.scopes?.join(', ')],
        ['organizationHandle', config?.organizationHandle],
        ['storage',            config?.storage],
        ['syncSession',        config?.syncSession?.toString()],
      ]"
      :key="key"
    >
      <div v-if="value" class="flex items-start gap-3">
        <dt class="w-28 shrink-0 text-sm text-on-surface-muted pt-0.5 font-mono">{{ key }}</dt>
        <dd class="font-mono text-sm text-on-surface break-all">{{ value }}</dd>
      </div>
    </template>
  </div>

  <!-- Edit link -->
  <div class="mt-4 pt-3 border-t border-border-divider">
    <p class="text-xs text-on-surface-muted">
      Configuration is stored in <code class="bg-surface-muted px-1 rounded">localStorage</code>.
      Use the <strong>Provider Settings</strong> button in the sidebar to edit.
    </p>
  </div>
</SectionCard>
```

> **Note:** `config` and `baseUrl`/`clientId` come from `useProviderConfig()` and `useAsgardeo()`.

---

## 7. UX Flow Summary

```
First visit (no localStorage)
  └─► ConfigSetup.vue (full-screen wizard)
        └─► Fill required fields → "Get Started"
              └─► config saved → App.vue re-renders with <AsgardeoProvider>

Returning visit (config in localStorage)
  └─► <AsgardeoProvider> mounts immediately with saved config

Edit config (anytime)
  └─► Sidebar → "Provider Settings" button
        └─► ConfigEditor drawer slides in from right
              ├─► Edit fields → "Save & Apply" → provider re-mounts
              └─► "Reset" → config cleared → ConfigSetup.vue shown again
```

---

## 8. Edge Cases & Behaviour Notes

| Scenario | Behaviour |
|---|---|
| `localStorage` cleared manually | Next load shows `ConfigSetup` again |
| Invalid JSON in `localStorage` | `loadConfig()` catches parse error, returns `null` → setup screen |
| Provider prop `undefined` | `AsgardeoProvider` receives `undefined` and uses its own default — safe |
| "Save & Apply" with only required fields | Works; optional props are `undefined` |
| Page reload after save | Config loaded from `localStorage` immediately — no flash |
| Docs link in setup wizard | Opens `https://wso2.com/asgardeo/docs/` in a new tab |

---

## 9. Implementation Checklist

```
[ ] Step 1 — src/composables/useProviderConfig.ts
[ ] Step 2 — src/components/config/ConfigSetup.vue
[ ] Step 3 — src/components/config/ConfigFieldRow.vue
[ ] Step 4 — src/components/config/ConfigEditor.vue
[ ] Step 5 — src/App.vue (modify)
[ ] Step 6 — src/components/Sidebar.vue (add Settings button + emit)
[ ] Step 7 — src/views/OverviewView.vue (richer config panel)
```

**Estimated new lines**: ~600 across 4 new files + 3 small diffs.
No new dependencies — uses only existing Vue 3 / Tailwind CSS v4 already in the project.

---

## 10. How Contributors Add or Change Config Fields in Future

1. Add the field to `PlaygroundConfig` in `useProviderConfig.ts`.
2. Add a `ConfigFieldRow` (or toggle/select) inside the **Optional Settings** section
   of both `ConfigSetup.vue` and `ConfigEditor.vue`.
3. The field is automatically spread into `<AsgardeoProvider>` via `v-bind="config!"`.
4. Update the display list in `OverviewView.vue` if the field value is worth showing.

That's the full cycle — no router changes, no build-time env vars needed.
