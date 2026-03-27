# Theme Implementation Plan — Step by Step

> **Prerequisite**: Read [THEME_ARCHITECTURE.md](./THEME_ARCHITECTURE.md) for the full rationale and design token reference.

## Overview

| Phase | Description | Files Changed | Effort |
|---|---|---|---|
| **Phase 1** | Create theme infrastructure | 3 new files | Foundation |
| **Phase 2** | Integrate with Tailwind & entry points | 3 files modified | Wiring |
| **Phase 3** | Add ThemeSwitcher UI component | 1 new file, 1 modified | UI |
| **Phase 4** | Migrate layout components | 5 files modified | Batch |
| **Phase 5** | Migrate shared components | 2 files modified | Batch |
| **Phase 6** | Migrate views | 2 files modified | Batch |
| **Phase 7** | Migrate API section components | 8 files modified | Batch (similar) |
| **Phase 8** | Migrate component tab views | 5 files modified | Batch (similar) |
| **Phase 9** | Cleanup & validation | 2 files deleted/modified | Polish |

**Total: ~4 new files, ~28 files modified**

---

## Phase 1: Create Theme Infrastructure

### Step 1.1 — Create `src/assets/themes.css`

This single file holds ALL theme definitions. Each theme is a CSS ruleset scoped by `[data-theme="..."]`.

**Create** `src/assets/themes.css`:

```css
/*──────────────────────────────────────────────────────────
  Theme Definitions — Vue SDK Playground
  
  To add a new theme:
  1. Copy one of the [data-theme="..."] blocks below
  2. Change the attribute value to your theme name
  3. Adjust all variable values
  4. Register the theme in src/composables/useThemeSwitch.ts
──────────────────────────────────────────────────────────*/

/* ══════════════════════════════════════
   LIGHT THEME
   ══════════════════════════════════════ */
[data-theme="light"] {
  /* ── Surfaces ── */
  --surface-primary: #f9fafb;
  --surface-secondary: #ffffff;
  --surface-muted: #f3f4f6;
  --surface-elevated: #ffffff;

  /* ── Text ── */
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-muted: #9ca3af;
  --text-inverse: #ffffff;

  /* ── Borders ── */
  --border-default: #e5e7eb;
  --border-hover: #d1d5db;
  --border-divider: #f3f4f6;

  /* ── Accent ── */
  --accent-50: #eef2ff;
  --accent-100: #e0e7ff;
  --accent-500: #6366f1;
  --accent-600: #4f46e5;
  --accent-700: #4338ca;
  --accent-800: #3730a3;

  /* ── Status: Success ── */
  --status-success-bg: #dcfce7;
  --status-success-text: #15803d;

  /* ── Status: Error ── */
  --status-error-bg: #fee2e2;
  --status-error-text: #b91c1c;

  /* ── Status: Warning ── */
  --status-warning-bg: #fef3c7;
  --status-warning-text: #b45309;

  /* ── Status: Info ── */
  --status-info-bg: #dbeafe;
  --status-info-text: #1d4ed8;

  /* ── Code Blocks ── */
  --code-bg: #111827;
  --code-text: #f3f4f6;
  --code-header-bg: #1f2937;
  --code-header-text: #9ca3af;

  /* ── Sidebar ── */
  --sidebar-bg: #ffffff;
  --sidebar-header-bg: #111827;
  --sidebar-text: #374151;
  --sidebar-active-bg: #111827;
  --sidebar-active-text: #ffffff;
  --sidebar-hover-bg: #f3f4f6;

  /* ── Misc ── */
  --shadow-color: rgba(0, 0, 0, 0.1);
  --overlay-color: rgba(0, 0, 0, 0.25);

  color-scheme: light;
}

/* ══════════════════════════════════════
   DARK THEME
   ══════════════════════════════════════ */
[data-theme="dark"] {
  /* ── Surfaces ── */
  --surface-primary: #111827;
  --surface-secondary: #1f2937;
  --surface-muted: #374151;
  --surface-elevated: #1f2937;

  /* ── Text ── */
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-muted: #6b7280;
  --text-inverse: #111827;

  /* ── Borders ── */
  --border-default: #374151;
  --border-hover: #4b5563;
  --border-divider: #1f2937;

  /* ── Accent (lighter shades for dark bg) ── */
  --accent-50: #1e1b4b;
  --accent-100: #312e81;
  --accent-500: #818cf8;
  --accent-600: #6366f1;
  --accent-700: #818cf8;
  --accent-800: #a5b4fc;

  /* ── Status: Success ── */
  --status-success-bg: #064e3b;
  --status-success-text: #6ee7b7;

  /* ── Status: Error ── */
  --status-error-bg: #7f1d1d;
  --status-error-text: #fca5a5;

  /* ── Status: Warning ── */
  --status-warning-bg: #78350f;
  --status-warning-text: #fcd34d;

  /* ── Status: Info ── */
  --status-info-bg: #1e3a5f;
  --status-info-text: #93c5fd;

  /* ── Code Blocks ── */
  --code-bg: #0f172a;
  --code-text: #e2e8f0;
  --code-header-bg: #1e293b;
  --code-header-text: #94a3b8;

  /* ── Sidebar ── */
  --sidebar-bg: #1f2937;
  --sidebar-header-bg: #0f172a;
  --sidebar-text: #d1d5db;
  --sidebar-active-bg: #4f46e5;
  --sidebar-active-text: #ffffff;
  --sidebar-hover-bg: #374151;

  /* ── Misc ── */
  --shadow-color: rgba(0, 0, 0, 0.4);
  --overlay-color: rgba(0, 0, 0, 0.5);

  color-scheme: dark;
}
```

### Step 1.2 — Create `src/composables/useThemeSwitch.ts`

**Create** `src/composables/useThemeSwitch.ts`:

```typescript
import { ref, readonly } from 'vue';

export type ThemeId = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  icon: 'sun' | 'moon' | 'monitor';
}

const STORAGE_KEY = 'vue-sdk-playground-theme';
const ATTRIBUTE = 'data-theme';

/**
 * Registry of available themes.
 * To add a new theme:
 * 1. Add its CSS variables in themes.css under [data-theme="<id>"]
 * 2. Add an entry here
 */
export const themes: ThemeConfig[] = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'System', icon: 'monitor' },
];

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(theme: ThemeId): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

function loadSaved(): ThemeId {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && themes.some((t) => t.id === saved)) return saved as ThemeId;
  return 'system';
}

// ── Singleton state ──────────────────────────────────────────────────────────
const currentTheme = ref<ThemeId>(loadSaved());
const resolvedTheme = ref<'light' | 'dark'>(resolve(currentTheme.value));

function apply(theme: ThemeId) {
  const resolved = resolve(theme);
  document.documentElement.setAttribute(ATTRIBUTE, resolved);
  resolvedTheme.value = resolved;
}

// React to OS theme changes when in 'system' mode
if (typeof window !== 'undefined') {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (currentTheme.value === 'system') {
        apply('system');
      }
    });
}

export function useThemeSwitch() {
  function setTheme(theme: ThemeId) {
    currentTheme.value = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    apply(theme);
  }

  function toggleTheme() {
    const next = resolvedTheme.value === 'light' ? 'dark' : 'light';
    setTheme(next);
  }

  // Apply immediately on first call
  apply(currentTheme.value);

  return {
    /** The user's chosen theme ID (may be 'system') */
    currentTheme: readonly(currentTheme),
    /** The actual resolved theme ('light' or 'dark') */
    resolvedTheme: readonly(resolvedTheme),
    /** All registered themes */
    themes,
    /** Set a specific theme */
    setTheme,
    /** Quick toggle between light ↔ dark */
    toggleTheme,
  };
}
```

### Step 1.3 — Prevent Flash of Unstyled Content (FOUC)

**Modify** `index.html` — Add an inline script in `<head>` to apply the theme before first paint:

```html
<!DOCTYPE html>
<html lang="">
  <head>
    <meta charset="UTF-8">
    <link rel="icon" href="/favicon.ico">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Asgardeo Vue SDK Demo</title>
    <script>
      // Apply saved theme immediately to prevent flash
      (function() {
        var theme = localStorage.getItem('vue-sdk-playground-theme') || 'system';
        if (theme === 'system') {
          theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', theme);
      })();
    </script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

## Phase 2: Wire Up Tailwind & CSS Imports

### Step 2.1 — Replace `main.css`

**Replace** `src/assets/main.css` with:

```css
@import "tailwindcss";
@import "./themes.css";

@theme {
  /* ── Surfaces ── */
  --color-surface: var(--surface-primary);
  --color-surface-secondary: var(--surface-secondary);
  --color-surface-muted: var(--surface-muted);
  --color-surface-elevated: var(--surface-elevated);

  /* ── Text ── */
  --color-on-surface: var(--text-primary);
  --color-on-surface-secondary: var(--text-secondary);
  --color-on-surface-muted: var(--text-muted);
  --color-on-surface-inverse: var(--text-inverse);

  /* ── Borders ── */
  --color-border: var(--border-default);
  --color-border-hover: var(--border-hover);
  --color-border-divider: var(--border-divider);

  /* ── Accent ── */
  --color-accent-50: var(--accent-50);
  --color-accent-100: var(--accent-100);
  --color-accent-500: var(--accent-500);
  --color-accent-600: var(--accent-600);
  --color-accent-700: var(--accent-700);
  --color-accent-800: var(--accent-800);

  /* ── Status ── */
  --color-status-success-bg: var(--status-success-bg);
  --color-status-success-text: var(--status-success-text);
  --color-status-error-bg: var(--status-error-bg);
  --color-status-error-text: var(--status-error-text);
  --color-status-warning-bg: var(--status-warning-bg);
  --color-status-warning-text: var(--status-warning-text);
  --color-status-info-bg: var(--status-info-bg);
  --color-status-info-text: var(--status-info-text);

  /* ── Code ── */
  --color-code-bg: var(--code-bg);
  --color-code-text: var(--code-text);
  --color-code-header-bg: var(--code-header-bg);
  --color-code-header-text: var(--code-header-text);

  /* ── Sidebar ── */
  --color-sidebar-bg: var(--sidebar-bg);
  --color-sidebar-header-bg: var(--sidebar-header-bg);
  --color-sidebar-text: var(--sidebar-text);
  --color-sidebar-active-bg: var(--sidebar-active-bg);
  --color-sidebar-active-text: var(--sidebar-active-text);
  --color-sidebar-hover-bg: var(--sidebar-hover-bg);
}

#app {
  max-width: 100%;
  font-weight: normal;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  font-weight: normal;
}

body {
  min-height: 100vh;
  color: var(--text-primary);
  background: var(--surface-primary);
  transition:
    color 0.3s ease,
    background-color 0.3s ease;
  line-height: 1.6;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    sans-serif;
  font-size: 15px;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Step 2.2 — Delete `base.css`

**Delete** `src/assets/base.css` — its functionality is now fully covered by `themes.css` and `main.css`.

Also remove the `@import './base.css'` line which was in the old `main.css` (already handled in step 2.1).

---

## Phase 3: Add Theme Switcher Component

### Step 3.1 — Create `ThemeSwitcher.vue`

**Create** `src/components/ThemeSwitcher.vue`:

```vue
<script setup lang="ts">
import { useThemeSwitch, type ThemeConfig } from '@/composables/useThemeSwitch';

const { currentTheme, setTheme, themes } = useThemeSwitch();

function iconPath(icon: ThemeConfig['icon']): string {
  switch (icon) {
    case 'sun':
      return 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z';
    case 'moon':
      return 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z';
    case 'monitor':
      return 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
    default:
      return '';
  }
}
</script>

<template>
  <div class="flex items-center gap-1 rounded-lg bg-surface-muted p-1">
    <button
      v-for="theme in themes"
      :key="theme.id"
      type="button"
      class="flex items-center justify-center rounded-md p-1.5 transition-colors"
      :class="
        currentTheme === theme.id
          ? 'bg-surface-secondary text-accent-600 shadow-sm'
          : 'text-on-surface-muted hover:text-on-surface-secondary'
      "
      :title="theme.label"
      :aria-label="`Switch to ${theme.label} theme`"
      @click="setTheme(theme.id)"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" :d="iconPath(theme.icon)" />
      </svg>
    </button>
  </div>
</template>
```

### Step 3.2 — Add ThemeSwitcher to Sidebar

**Modify** `src/components/Sidebar.vue`:

Add the import:
```vue
<script setup lang="ts">
import ThemeSwitcher from './ThemeSwitcher.vue';
// ... existing imports ...
</script>
```

Place the `<ThemeSwitcher />` in the sidebar header (next to the title), or at the bottom of the sidebar nav:

```html
<!-- In the sidebar header area -->
<div class="flex items-center justify-between h-16 px-4 bg-sidebar-header">
  <h1 class="text-lg font-semibold text-sidebar-active-text">Vue SDK Demo</h1>
  <div class="flex items-center gap-2">
    <ThemeSwitcher />
    <button @click="sidebarOpen = false" class="md:hidden text-sidebar-active-text">
      <XIcon class="h-6 w-6" />
    </button>
  </div>
</div>
```

---

## Phase 4: Migrate Layout Components

### Step 4.1 — Migrate `App.vue`

**Replace hardcoded classes:**

| Before | After |
|---|---|
| `bg-gray-50` | `bg-surface` |

```html
<!-- Before -->
<div class="min-h-screen bg-gray-50">

<!-- After -->
<div class="min-h-screen bg-surface">
```

### Step 4.2 — Migrate `Sidebar.vue`

**Full class replacement map:**

| Location | Before | After |
|---|---|---|
| Sidebar container | `bg-white shadow-lg` | `bg-sidebar shadow-lg` |
| Header bar | `bg-gray-900` | `bg-sidebar-header` |
| Header title | `text-white` | `text-sidebar-active-text` |
| Close button | `text-white` | `text-sidebar-active-text` |
| Active nav item | `bg-gray-900 text-white` | `bg-sidebar-active text-sidebar-active-text` |
| Inactive nav item | `text-gray-700 hover:bg-gray-100` | `text-sidebar-text hover:bg-sidebar-hover` |
| Mobile toggle | `bg-white` | `bg-surface-secondary` |
| Mobile overlay | `bg-black opacity-25` | `bg-black/25` (keep as-is, it's always dark) |

### Step 4.3 — Migrate `SectionCard.vue`

```html
<!-- Before -->
<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <h2 class="text-lg font-semibold text-gray-900">{{ title }}</h2>
  <p class="text-sm text-gray-500 mt-0.5">{{ description }}</p>
  <button class="text-gray-400 hover:text-gray-600 transition-colors">

<!-- After -->
<div class="bg-surface-secondary rounded-lg shadow-sm border border-border p-6">
  <h2 class="text-lg font-semibold text-on-surface">{{ title }}</h2>
  <p class="text-sm text-on-surface-muted mt-0.5">{{ description }}</p>
  <button class="text-on-surface-muted hover:text-on-surface-secondary transition-colors">
```

### Step 4.4 — Migrate `PageHeader.vue`

```html
<!-- Before -->
<h1 class="text-2xl font-bold text-gray-900">{{ title }}</h1>
<p class="text-gray-600 mt-1">{{ description }}</p>

<!-- After -->
<h1 class="text-2xl font-bold text-on-surface">{{ title }}</h1>
<p class="text-on-surface-secondary mt-1">{{ description }}</p>
```

### Step 4.5 — Migrate `TabGroup.vue`

```html
<!-- Before -->
<div class="border-b border-gray-200">
  <!-- active -->   border-indigo-500 text-indigo-600
  <!-- inactive --> border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300

<!-- After -->
<div class="border-b border-border">
  <!-- active -->   border-accent-500 text-accent-600
  <!-- inactive --> border-transparent text-on-surface-muted hover:text-on-surface-secondary hover:border-border-hover
```

### Step 4.6 — Migrate `CodeBlock.vue`

```html
<!-- Before -->
<div class="bg-gray-800 text-gray-400 text-xs px-4 py-2 rounded-t-lg">
  <button class="hover:text-white transition-colors">
<pre class="bg-gray-900 text-gray-100 p-4 rounded-b-lg ...">

<!-- After -->
<div class="bg-code-header text-code-header-text text-xs px-4 py-2 rounded-t-lg">
  <button class="hover:text-code-text transition-colors">
<pre class="bg-code text-code-text p-4 rounded-b-lg ...">
```

---

## Phase 5: Migrate Shared Components

### Step 5.1 — Migrate `ResultPanel.vue`

```html
<!-- Before -->
<div class="bg-gray-50 border border-gray-200 rounded-lg p-4 ...">
  <svg class="... text-indigo-500" ...>
  <p class="text-red-600">{{ error }}</p>
  <pre class="... text-gray-800">
  <p class="text-gray-400 italic">

<!-- After -->
<div class="bg-surface-muted border border-border rounded-lg p-4 ...">
  <svg class="... text-accent-500" ...>
  <p class="text-status-error-text">{{ error }}</p>
  <pre class="... text-on-surface">
  <p class="text-on-surface-muted italic">
```

### Step 5.2 — Migrate `EventLog.vue`

```html
<!-- Before -->
<div class="... border border-gray-200 rounded-lg divide-y divide-gray-100">
  <div class="... text-gray-400 italic">
  <span class="text-gray-400 text-xs ...">  <!-- timestamp -->
  <pre class="text-xs text-gray-600 ...">

<!-- After -->
<div class="... border border-border rounded-lg divide-y divide-border-divider">
  <div class="... text-on-surface-muted italic">
  <span class="text-on-surface-muted text-xs ...">  <!-- timestamp -->
  <pre class="text-xs text-on-surface-secondary ...">
```

**Badge colors migration:**

```typescript
// Before
const typeColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  warning: 'bg-yellow-100 text-yellow-700',
};

// After
const typeColors: Record<string, string> = {
  info: 'bg-status-info-bg text-status-info-text',
  success: 'bg-status-success-bg text-status-success-text',
  error: 'bg-status-error-bg text-status-error-text',
  warning: 'bg-status-warning-bg text-status-warning-text',
};
```

Default badge fallback:
```typescript
// Before
function badgeClass(type: string): string {
  return typeColors[type] ?? 'bg-gray-100 text-gray-700';
}

// After
function badgeClass(type: string): string {
  return typeColors[type] ?? 'bg-surface-muted text-on-surface-secondary';
}
```

---

## Phase 6: Migrate Views

### Step 6.1 — Migrate `OverviewView.vue`

This is the largest view. Here's the complete class replacement map:

| Element | Before | After |
|---|---|---|
| Status card container | `bg-white ... border border-gray-200` | `bg-surface-secondary ... border border-border` |
| Status label | `text-gray-500` | `text-on-surface-muted` |
| Status value | `text-gray-800` | `text-on-surface` |
| Welcome text | `text-gray-700` | `text-on-surface` |
| Config key label | `text-gray-500` | `text-on-surface-muted` |
| Config value | `text-gray-800` | `text-on-surface` |
| Copy button | `text-indigo-600 hover:text-indigo-800` | `text-accent-600 hover:text-accent-800` |
| Hint text | `text-gray-400` | `text-on-surface-muted` |
| Inline code bg | `bg-gray-100` | `bg-surface-muted` |
| Profile key | `text-gray-500` | `text-on-surface-muted` |
| Profile value | `text-gray-800` | `text-on-surface` |
| Primary button | `bg-indigo-600 hover:bg-indigo-700 text-white` | `bg-accent-600 hover:bg-accent-700 text-on-surface-inverse` |
| Secondary button | `bg-white border-gray-300 text-gray-700 hover:bg-gray-50` | `bg-surface-secondary border-border-hover text-on-surface hover:bg-surface-muted` |
| Quick link card | `bg-white ... border-gray-200` | `bg-surface-secondary ... border-border` |
| Quick link title | `text-gray-900` | `text-on-surface` |
| Quick link desc | `text-gray-500` | `text-on-surface-muted` |
| Arrow icon | `text-gray-400` | `text-on-surface-muted` |

**Status icons** (green check, red x, yellow clock) — these represent semantic *status*, so keep them as direct colors. Green for success, red for error, yellow for pending are universal and not theme-dependent in meaning. However, for dark mode readability, map them:

| Before | After |
|---|---|
| `text-green-500` | `text-status-success-text` |
| `text-red-400` | `text-status-error-text` |
| `text-yellow-400` | `text-status-warning-text` |

### Step 6.2 — Migrate `AuthFlowsView.vue`

**Key replacements:**

| Element | Before | After |
|---|---|---|
| Section labels | `text-gray-500 uppercase` | `text-on-surface-muted uppercase` |
| Base buttons (indigo) | `bg-indigo-100 text-indigo-700 hover:bg-indigo-200` | `bg-accent-100 text-accent-800 hover:bg-accent-50` |
| Base buttons (red) | `bg-red-100 text-red-700 hover:bg-red-200` | `bg-status-error-bg text-status-error-text` |
| Base buttons (green) | `bg-green-100 text-green-700 hover:bg-green-200` | `bg-status-success-bg text-status-success-text` |
| Primary button | `bg-indigo-600 text-white hover:bg-indigo-700` | `bg-accent-600 text-on-surface-inverse hover:bg-accent-700` |
| Secondary button | `bg-white border-gray-300 text-gray-700 hover:bg-gray-50` | `bg-surface-secondary border-border-hover text-on-surface hover:bg-surface-muted` |
| Step number circle | `bg-indigo-600 text-white` | `bg-accent-600 text-on-surface-inverse` |
| Step title | `text-gray-900` | `text-on-surface` |
| Step detail | `text-gray-500` | `text-on-surface-muted` |
| Inline code | `bg-gray-100` | `bg-surface-muted` |
| Warning box | `text-amber-700 bg-amber-50 border-amber-200` | `text-status-warning-text bg-status-warning-bg border-border` |
| Description text | `text-gray-600` | `text-on-surface-secondary` |
| "Events emitted" label | `text-gray-700` | `text-on-surface` |
| Table text (gray-500) | `text-gray-500` | `text-on-surface-muted` |
| Table text (gray-800) | `text-gray-800` | `text-on-surface` |
| Table dividers | `divide-gray-100` | `divide-border-divider` |
| Yellow loading | `text-yellow-600` | `text-status-warning-text` |
| Red error | `text-red-600` | `text-status-error-text` |
| Fetch button | `bg-indigo-600 text-white hover:bg-indigo-700` | `bg-accent-600 text-on-surface-inverse hover:bg-accent-700` |

---

## Phase 7: Migrate API Section Components (Batch)

All 8 API section files (`AsgardeoApiSection.vue`, `UserApiSection.vue`, `OrganizationApiSection.vue`, `FlowApiSection.vue`, `FlowMetaApiSection.vue`, `ThemeApiSection.vue`, `BrandingApiSection.vue`, `I18nApiSection.vue`) follow the same patterns.

### Common Replacement Rules for All API Sections

Apply these find-and-replace operations across all 8 files:

| Find | Replace | Context |
|---|---|---|
| `border-gray-200` | `border-border` | Card/section borders |
| `border-gray-300` | `border-border-hover` | Input borders |
| `border-gray-100` | `border-border-divider` | Thin dividers |
| `divide-gray-100` | `divide-border-divider` | Table row dividers |
| `text-gray-900` | `text-on-surface` | Headings |
| `text-gray-800` | `text-on-surface` | Values, body text |
| `text-gray-700` | `text-on-surface` | Normal text |
| `text-gray-600` | `text-on-surface-secondary` | Descriptions |
| `text-gray-500` | `text-on-surface-muted` | Labels, hints |
| `text-gray-400` | `text-on-surface-muted` | Placeholders, disabled |
| `text-gray-200` | `text-code-text` | Code-area text |
| `text-gray-100` | `text-code-text` | Code text |
| `bg-white` | `bg-surface-secondary` | Card backgrounds |
| `bg-gray-50` | `bg-surface-muted` | Muted section backgrounds |
| `bg-gray-100` | `bg-surface-muted` | Inline code, tags |
| `bg-gray-600` | `bg-surface-muted` | Dark buttons (re-evaluate per context) |
| `bg-gray-800` | `bg-code-header` | Code header areas |
| `bg-gray-900` | `bg-code` | Code block bodies |
| `text-white` | `text-on-surface-inverse` | Button text on colored bg |
| `bg-indigo-600` | `bg-accent-600` | Primary action buttons |
| `hover:bg-indigo-700` | `hover:bg-accent-700` | Primary button hover |
| `text-indigo-600` | `text-accent-600` | Links |
| `focus:ring-indigo-500` | `focus:ring-accent-500` | Focus rings |
| `bg-emerald-100` | `bg-status-success-bg` | Connected badge bg |
| `text-emerald-700` | `text-status-success-text` | Connected badge text |
| `bg-emerald-600` | `bg-accent-600` | (re-evaluate: action button) |
| `bg-amber-100` | `bg-status-warning-bg` | Warning badge bg |
| `text-amber-700` | `text-status-warning-text` | Warning badge text |
| `text-amber-600` | `text-status-warning-text` | Warning text |
| `bg-blue-100` | `bg-status-info-bg` | Info badge bg |
| `text-blue-700` | `text-status-info-text` | Info badge text |
| `bg-sky-600` | `bg-accent-600` | Action buttons (alt variant) |
| `hover:bg-sky-700` | `hover:bg-accent-700` | Action button hover |
| `bg-green-100` | `bg-status-success-bg` | Success badge bg |
| `text-green-700` | `text-status-success-text` | Success badge text |
| `text-green-600` | `text-status-success-text` | Success text |
| `bg-green-600` | `bg-status-success-text` | Success action button |
| `hover:bg-green-700` | `hover:bg-accent-700` | Success button hover |
| `bg-red-600` | `bg-status-error-text` | Destructive button |
| `hover:bg-red-700` | `hover:bg-status-error-text` | Destructive button hover |
| `text-red-500` | `text-status-error-text` | Error text |
| `text-red-600` | `text-status-error-text` | Error text |
| `bg-amber-500` | `bg-status-warning-text` | Warning action button |
| `hover:bg-amber-600` | `hover:bg-status-warning-text` | Warning button hover |
| `hover:bg-gray-50` | `hover:bg-surface-muted` | Subtle hover states |
| `hover:bg-gray-600` | `hover:bg-surface-muted` | Dark button hover |
| `hover:bg-gray-700` | `hover:bg-surface-muted` | Dark button hover |

### Per-File Special Considerations

**`FlowApiSection.vue`** — Has the most color variety (success/error/warning/info buttons for different flow actions). Pay attention to context: some `bg-green-600` are action buttons (map to `bg-accent-600` or a dedicated variant), while `bg-green-100` is a status badge (map to `bg-status-success-bg`).

**`AsgardeoApiSection.vue`** — Contains emerald and sky colors not used elsewhere. Map both to accent or status as appropriate.

**`ThemeApiSection.vue` / `BrandingApiSection.vue`** — Have code-like display areas using `bg-gray-800`/`text-gray-200`. Map to `bg-code-header`/`text-code-text`.

---

## Phase 8: Migrate Component Tab Views (Batch)

### Files: `PrimitivesTab.vue`, `ActionsTab.vue`, `ControlTab.vue`, `PresentationTab.vue`, `SocialLoginsTab.vue`

Apply the same common replacement rules from Phase 7. Additional notes:

**`PrimitivesTab.vue`** — Contains a computed `controlClass` string with `bg-white`, `border-gray-300`, `focus:ring-indigo-400`. Update to:
```typescript
// Before
const controlClass = '... bg-white border-gray-300 ... focus:ring-indigo-400 ...'

// After
const controlClass = '... bg-surface-secondary border-border-hover ... focus:ring-accent-500 ...'
```

**`ControlTab.vue`** — Contains status indicators using `bg-yellow-100 text-yellow-800`, `bg-green-100 text-green-800`. Map to:
```
bg-yellow-100 text-yellow-800  →  bg-status-warning-bg text-status-warning-text
bg-green-100 text-green-800   →  bg-status-success-bg text-status-success-text
```

**`ControlTab.vue`** info/success boxes:
```
bg-blue-50 border-blue-200 text-blue-800  →  bg-status-info-bg border-border text-status-info-text
bg-green-50 border-green-200 text-green-700  →  bg-status-success-bg border-border text-status-success-text
```

**`PresentationTab.vue`** — Contains indigo-themed display boxes:
```
border-indigo-100 bg-indigo-50 text-indigo-800  →  border-accent-100 bg-accent-50 text-accent-800
text-indigo-600  →  text-accent-600
```

---

## Phase 9: Cleanup & Validation

### Step 9.1 — Delete `base.css`

If not already done in Phase 2, remove `src/assets/base.css`.

### Step 9.2 — Search for Remaining Hardcoded Colors

Run a grep to find ANY remaining hardcoded Tailwind color classes:

```bash
grep -rn --include="*.vue" -E "(bg|text|border|divide|ring)-(gray|white|black|red|green|blue|indigo|amber|yellow|emerald|sky)-" src/
```

**Expected result**: Zero matches. If any remain, apply the replacement rules from Phases 4–8.

Exceptions that are acceptable to keep:
- `bg-black/25` or `bg-black opacity-25` — the mobile overlay is always dark regardless of theme
- Colors inside the `ThemeSwitcher.vue` component if used for the toggle icons themselves
- Colors that are truly hardcoded for semantic reasons (e.g., a social login brand color that should never change)

### Step 9.3 — Visual Validation Checklist

Test both themes by toggling the switcher. Verify:

- [ ] **Sidebar**: Header, nav items, active state, hover state all change
- [ ] **Page background**: Changes from light gray to dark
- [ ] **Cards (SectionCard)**: Background, border, text all change
- [ ] **Tabs**: Active/inactive states readable in both themes
- [ ] **Code blocks**: Dark in light mode, slightly darker in dark mode
- [ ] **Buttons**: Primary (accent) buttons visible in both themes
- [ ] **Status badges**: Success/error/warning/info all readable
- [ ] **Tables**: Row dividers, text contrast sufficient
- [ ] **Result panels**: Background distinguishable from card
- [ ] **Event logs**: Timestamps, badges, data all readable
- [ ] **Inline code**: `<code>` backgrounds contrast with surrounding text
- [ ] **Focus rings**: Visible when tabbing through interactive elements
- [ ] **Theme persists**: Refresh page — saved choice is restored
- [ ] **System mode**: Set to "System", change OS theme — app follows
- [ ] **No FOUC**: On page load, correct theme applied instantly (no flash)

### Step 9.4 — Accessibility Check

- Ensure all text meets WCAG 2.1 AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- Test with browser dev tools → Rendering → "Emulate prefers-color-scheme: dark"
- Verify focus indicators visible in both themes

---

## Quick Reference: Class Migration Cheat Sheet

### Backgrounds
| Hardcoded | Semantic | Usage |
|---|---|---|
| `bg-white` | `bg-surface-secondary` | Cards, modals, inputs |
| `bg-gray-50` | `bg-surface` | Page background |
| `bg-gray-100` | `bg-surface-muted` | Inline code, muted areas |
| `bg-gray-800` | `bg-code-header` | Code block headers |
| `bg-gray-900` | `bg-code` | Code block bodies |

### Text
| Hardcoded | Semantic | Usage |
|---|---|---|
| `text-gray-900` | `text-on-surface` | Headings, primary text |
| `text-gray-800` | `text-on-surface` | Values |
| `text-gray-700` | `text-on-surface` | Body text |
| `text-gray-600` | `text-on-surface-secondary` | Secondary descriptions |
| `text-gray-500` | `text-on-surface-muted` | Labels, hints |
| `text-gray-400` | `text-on-surface-muted` | Placeholders |
| `text-white` | `text-on-surface-inverse` | On colored backgrounds |

### Borders
| Hardcoded | Semantic | Usage |
|---|---|---|
| `border-gray-200` | `border-border` | Standard border |
| `border-gray-300` | `border-border-hover` | Input borders |
| `border-gray-100` | `border-border-divider` | Subtle dividers |
| `divide-gray-100` | `divide-border-divider` | Table row dividers |

### Accent
| Hardcoded | Semantic |
|---|---|
| `bg-indigo-600` | `bg-accent-600` |
| `hover:bg-indigo-700` | `hover:bg-accent-700` |
| `text-indigo-600` | `text-accent-600` |
| `border-indigo-500` | `border-accent-500` |
| `focus:ring-indigo-500` | `focus:ring-accent-500` |
| `bg-indigo-100` | `bg-accent-100` |
| `text-indigo-700` | `text-accent-800` |

### Status
| Hardcoded | Semantic |
|---|---|
| `bg-green-100` / `bg-green-50` | `bg-status-success-bg` |
| `text-green-700` / `text-green-800` | `text-status-success-text` |
| `bg-red-100` | `bg-status-error-bg` |
| `text-red-600` / `text-red-700` | `text-status-error-text` |
| `bg-blue-100` / `bg-blue-50` | `bg-status-info-bg` |
| `text-blue-700` / `text-blue-800` | `text-status-info-text` |
| `bg-amber-100` / `bg-yellow-100` | `bg-status-warning-bg` |
| `text-amber-700` / `text-yellow-800` | `text-status-warning-text` |

---

## Summary

After completing all 9 phases:

1. **Theme switching works** — Users can toggle light/dark/system
2. **All colors are semantic** — No hardcoded `gray-500`, `indigo-600`, etc. in templates
3. **Adding themes is trivial** — One CSS block + one registry entry
4. **No FOUC** — Inline `<head>` script ensures correct theme before paint
5. **Persistent** — User's choice saved to localStorage
6. **Accessible** — System preference respected, proper contrast in both themes
