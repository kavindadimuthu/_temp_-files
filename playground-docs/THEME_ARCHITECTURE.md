# Theme Architecture Guide — Vue SDK Playground

## Table of Contents

- [1. Current State Analysis](#1-current-state-analysis)
- [2. Problems with the Current Approach](#2-problems-with-the-current-approach)
- [3. Proposed Architecture](#3-proposed-architecture)
- [4. Design Token System](#4-design-token-system)
- [5. Theme Definition Structure](#5-theme-definition-structure)
- [6. Vue Composable Design](#6-vue-composable-design)
- [7. Tailwind CSS v4 Integration](#7-tailwind-css-v4-integration)
- [8. Component Migration Strategy](#8-component-migration-strategy)
- [9. Adding a New Theme (Future)](#9-adding-a-new-theme-future)
- [10. File Structure Overview](#10-file-structure-overview)

---

## 1. Current State Analysis

### Tech Stack
- **Vue 3** (Composition API + `<script setup>`)
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin)
- **Vite 7** build tool
- **Vue Router 4**

### Current Styling Approach

The playground currently uses two CSS files:

**`base.css`** — Defines CSS custom properties for light/dark colors, but only switches via `@media (prefers-color-scheme: dark)`. This means theme switching is exclusively OS-driven with no user control.

**`main.css`** — Imports Tailwind and `base.css`. No additional theme logic.

### Hardcoded Color Usage Across Components

All **30+ component files** use hardcoded Tailwind color utility classes. Here is the complete audit:

#### Color Families Used

| Color Family | Usage Count (approx.) | Usage Context |
|---|---|---|
| **Gray** (50–900) | ~120+ classes | Backgrounds, text, borders, dividers — the primary palette |
| **Indigo** (50–800) | ~25+ classes | Primary accent — buttons, links, active tabs, focus rings |
| **White** | ~20+ classes | Card backgrounds, button text, sidebar text |
| **Red** (100–700) | ~10+ classes | Error states, destructive buttons/badges |
| **Green** (50–800) | ~12+ classes | Success states, badges |
| **Blue** (50–800) | ~8+ classes | Info badges, status indicators |
| **Amber** (100–700) | ~8+ classes | Warning badges, caution text |
| **Yellow** (100–800) | ~3 classes | Warning badges |
| **Emerald** (100–700) | ~4 classes | Connected state indicators |
| **Sky** (600–700) | ~2 classes | Specific action buttons |

#### Files with Hardcoded Colors

| Category | Files | Color Classes |
|---|---|---|
| **Layout Components** | `Sidebar.vue`, `CodeBlock.vue`, `PageHeader.vue`, `SectionCard.vue`, `TabGroup.vue` | Heavy gray, white, indigo usage |
| **Shared Components** | `EventLog.vue`, `ResultPanel.vue` | Gray, blue, green, red, yellow badges |
| **Views** | `OverviewView.vue`, `AuthFlowsView.vue` | Gray, white, indigo, amber, green, red |
| **Component Tabs** | `PrimitivesTab.vue`, `ActionsTab.vue`, `ControlTab.vue`, `PresentationTab.vue`, `SocialLoginsTab.vue` | Gray, indigo, red, green, yellow, blue |
| **API Sections** | All 8 `*ApiSection.vue` files | Gray, indigo, amber, red, green, emerald, sky, blue |

### The `base.css` Custom Properties (Currently Unused by Components)

```css
:root {
  --color-background: var(--vt-c-white);
  --color-background-soft: var(--vt-c-white-soft);
  --color-background-mute: var(--vt-c-white-mute);
  --color-border: var(--vt-c-divider-light-2);
  --color-border-hover: var(--vt-c-divider-light-1);
  --color-heading: var(--vt-c-text-light-1);
  --color-text: var(--vt-c-text-light-1);
}
```

> **Key Issue**: These CSS variables exist but are **not referenced** by any component. Every component uses direct Tailwind classes like `bg-gray-50`, `text-gray-700`, etc.

---

## 2. Problems with the Current Approach

| # | Problem | Impact |
|---|---|---|
| 1 | **No user-controlled theme switching** | Users cannot toggle dark/light mode; only OS preference is respected |
| 2 | **Hardcoded colors everywhere** | Changing the color scheme requires editing 30+ files |
| 3 | **Inconsistent surface hierarchy** | `bg-white`, `bg-gray-50`, `bg-gray-100` used interchangeably without semantic meaning |
| 4 | **No dark mode support in components** | Zero `dark:` variant classes used in any template |
| 5 | **CSS custom properties exist but are orphaned** | `base.css` defines semantic variables nobody uses |
| 6 | **No single source of truth** | No theme config file; colors are scattered across templates |
| 7 | **Accent color is not configurable** | Indigo is hardcoded as the primary accent in 25+ places |

---

## 3. Proposed Architecture

### Strategy: CSS Custom Properties + Tailwind `@theme` + Data Attribute Switching

```
┌─────────────────────────────────────────────────────────┐
│                    index.html                            │
│         <html data-theme="light">                        │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────▼────────────────────┐
    │          CSS Layer (themes.css)      │
    │                                     │
    │  [data-theme="light"] {             │
    │    --surface-primary: #ffffff;       │
    │    --text-primary: #111827;          │
    │    --accent-600: #4f46e5;           │
    │    ...                              │
    │  }                                  │
    │                                     │
    │  [data-theme="dark"] {              │
    │    --surface-primary: #111827;       │
    │    --text-primary: #f9fafb;         │
    │    --accent-600: #818cf8;           │
    │    ...                              │
    │  }                                  │
    └────────────────┬────────────────────┘
                     │
    ┌────────────────▼────────────────────┐
    │     Tailwind @theme Integration     │
    │                                     │
    │  @theme {                           │
    │    --color-surface: var(--surface-  │
    │      primary);                      │
    │    --color-on-surface: var(--text-  │
    │      primary);                      │
    │    ...                              │
    │  }                                  │
    └────────────────┬────────────────────┘
                     │
    ┌────────────────▼────────────────────┐
    │    Components (Tailwind classes)     │
    │                                     │
    │  <div class="bg-surface             │
    │              text-on-surface">       │
    │  <button class="bg-accent-600       │
    │                 text-on-accent">     │
    └────────────────┬────────────────────┘
                     │
    ┌────────────────▼────────────────────┐
    │     Vue Composable (useTheme)       │
    │                                     │
    │  - Reads/writes data-theme attr     │
    │  - Persists to localStorage         │
    │  - Respects system preference       │
    │  - Exposes reactive theme state     │
    └─────────────────────────────────────┘
```

### Why This Approach?

| Criterion | Benefit |
|---|---|
| **Scalability** | Adding a new theme = adding one CSS ruleset. Zero component changes. |
| **Performance** | CSS custom properties are resolved by the browser — no JS runtime cost for styling |
| **Tailwind-native** | Tailwind v4's `@theme` directive is designed exactly for this pattern |
| **SSR-friendly** | Data attribute on `<html>` prevents flash of wrong theme |
| **No `dark:` duplication** | Unlike Tailwind's `dark:` modifier approach, semantic tokens mean each class is written once |

---

## 4. Design Token System

### Token Naming Convention

Tokens follow a **semantic naming** pattern, not a color-specific one. This way, component code says *what role* the color plays, not which exact color it is.

```
Category     Purpose            Token Name
─────────    ────────           ──────────
Surface      Page background    --surface-primary
             Card background    --surface-secondary
             Muted background   --surface-muted
             Elevated surface   --surface-elevated

Text         Primary text       --text-primary
             Secondary text     --text-secondary
             Muted/disabled     --text-muted
             Inverse text       --text-inverse

Border       Default border     --border-default
             Hover border       --border-hover
             Divider lines      --border-divider

Accent       Primary button     --accent-600
             Primary hover      --accent-700
             Soft background    --accent-50
             Soft text          --accent-700
             Focus ring         --accent-500

Status       Success bg         --status-success-bg
             Success text       --status-success-text
             Error bg           --status-error-bg
             Error text         --status-error-text
             Warning bg         --status-warning-bg
             Warning text       --status-warning-text
             Info bg            --status-info-bg
             Info text          --status-info-text

Code         Code background    --code-bg
             Code text          --code-text
             Code header bg     --code-header-bg
             Code header text   --code-header-text

Sidebar      Sidebar bg         --sidebar-bg
             Sidebar header bg  --sidebar-header-bg
             Sidebar text       --sidebar-text
             Sidebar active bg  --sidebar-active-bg
             Sidebar active txt --sidebar-active-text
             Sidebar hover bg   --sidebar-hover-bg
```

### Mapping: Current Hardcoded → Semantic Token

| Current Class | Semantic Replacement | Role |
|---|---|---|
| `bg-white` | `bg-surface-secondary` | Card background |
| `bg-gray-50` | `bg-surface-primary` / `bg-surface-muted` | Page/section background |
| `bg-gray-100` | `bg-surface-muted` | Inline code background, muted areas |
| `bg-gray-900` | `bg-sidebar-header` / `bg-code-bg` | Sidebar header, code blocks |
| `bg-gray-800` | `bg-code-header` | Code block header |
| `text-gray-900` | `text-primary` | Headings, primary text |
| `text-gray-800` | `text-primary` | Body text, values |
| `text-gray-700` | `text-primary` | Normal text |
| `text-gray-600` | `text-secondary` | Descriptions |
| `text-gray-500` | `text-secondary` / `text-muted` | Labels, secondary info |
| `text-gray-400` | `text-muted` | Placeholders, disabled |
| `text-gray-100` | `text-code` | Code text |
| `border-gray-200` | `border-default` | Card borders |
| `border-gray-300` | `border-hover` | Input borders |
| `border-gray-100` | `border-divider` | Dividers |
| `divide-gray-100` | `divide-divider` | Table/list dividers |
| `bg-indigo-600` | `bg-accent-600` | Primary buttons |
| `hover:bg-indigo-700` | `hover:bg-accent-700` | Primary button hover |
| `text-indigo-600` | `text-accent` | Links, active tab text |
| `border-indigo-500` | `border-accent` | Active tab border |
| `focus:ring-indigo-500` | `focus:ring-accent` | Focus rings |
| `bg-indigo-100` | `bg-accent-soft` | Soft accent backgrounds |
| `text-indigo-700` | `text-accent-emphasis` | Accent text on soft backgrounds |
| `bg-green-100` / `bg-green-50` | `bg-status-success` | Success badge bg |
| `text-green-700` / `text-green-800` | `text-status-success` | Success badge text |
| `bg-red-100` | `bg-status-error` | Error badge bg |
| `text-red-600` / `text-red-700` | `text-status-error` | Error text |
| `bg-blue-100` / `bg-blue-50` | `bg-status-info` | Info badge bg |
| `text-blue-700` / `text-blue-800` | `text-status-info` | Info badge text |
| `bg-amber-100` / `bg-yellow-100` | `bg-status-warning` | Warning badge bg |
| `text-amber-700` / `text-yellow-800` | `text-status-warning` | Warning badge text |

---

## 5. Theme Definition Structure

### Light Theme

```css
[data-theme="light"] {
  /* ── Surfaces ── */
  --surface-primary: #f9fafb;      /* gray-50 */
  --surface-secondary: #ffffff;     /* white */
  --surface-muted: #f3f4f6;        /* gray-100 */
  --surface-elevated: #ffffff;      /* white + shadow */

  /* ── Text ── */
  --text-primary: #111827;          /* gray-900 */
  --text-secondary: #4b5563;        /* gray-600 */
  --text-muted: #9ca3af;           /* gray-400 */
  --text-inverse: #ffffff;          /* white */

  /* ── Borders ── */
  --border-default: #e5e7eb;        /* gray-200 */
  --border-hover: #d1d5db;          /* gray-300 */
  --border-divider: #f3f4f6;        /* gray-100 */

  /* ── Accent (Indigo) ── */
  --accent-50: #eef2ff;
  --accent-100: #e0e7ff;
  --accent-500: #6366f1;
  --accent-600: #4f46e5;
  --accent-700: #4338ca;
  --accent-800: #3730a3;

  /* ── Status Colors ── */
  --status-success-bg: #dcfce7;     /* green-100 */
  --status-success-text: #15803d;   /* green-700 */
  --status-error-bg: #fee2e2;       /* red-100 */
  --status-error-text: #b91c1c;     /* red-700 */
  --status-warning-bg: #fef3c7;     /* amber-100 */
  --status-warning-text: #b45309;   /* amber-700 */
  --status-info-bg: #dbeafe;        /* blue-100 */
  --status-info-text: #1d4ed8;      /* blue-700 */

  /* ── Code Blocks ── */
  --code-bg: #111827;               /* gray-900 */
  --code-text: #f3f4f6;            /* gray-100 */
  --code-header-bg: #1f2937;        /* gray-800 */
  --code-header-text: #9ca3af;      /* gray-400 */

  /* ── Sidebar ── */
  --sidebar-bg: #ffffff;
  --sidebar-header-bg: #111827;     /* gray-900 */
  --sidebar-text: #374151;          /* gray-700 */
  --sidebar-active-bg: #111827;     /* gray-900 */
  --sidebar-active-text: #ffffff;
  --sidebar-hover-bg: #f3f4f6;      /* gray-100 */

  /* ── Misc ── */
  --shadow-color: rgba(0, 0, 0, 0.1);
  --overlay-color: rgba(0, 0, 0, 0.25);
}
```

### Dark Theme

```css
[data-theme="dark"] {
  /* ── Surfaces ── */
  --surface-primary: #111827;       /* gray-900 */
  --surface-secondary: #1f2937;     /* gray-800 */
  --surface-muted: #374151;         /* gray-700 */
  --surface-elevated: #1f2937;

  /* ── Text ── */
  --text-primary: #f9fafb;          /* gray-50 */
  --text-secondary: #d1d5db;        /* gray-300 */
  --text-muted: #6b7280;           /* gray-500 */
  --text-inverse: #111827;          /* gray-900 */

  /* ── Borders ── */
  --border-default: #374151;        /* gray-700 */
  --border-hover: #4b5563;          /* gray-600 */
  --border-divider: #1f2937;        /* gray-800 */

  /* ── Accent (Indigo — lighter for dark bg) ── */
  --accent-50: #1e1b4b;
  --accent-100: #312e81;
  --accent-500: #818cf8;
  --accent-600: #6366f1;
  --accent-700: #818cf8;
  --accent-800: #a5b4fc;

  /* ── Status Colors (softer on dark bg) ── */
  --status-success-bg: #064e3b;
  --status-success-text: #6ee7b7;
  --status-error-bg: #7f1d1d;
  --status-error-text: #fca5a5;
  --status-warning-bg: #78350f;
  --status-warning-text: #fcd34d;
  --status-info-bg: #1e3a5f;
  --status-info-text: #93c5fd;

  /* ── Code Blocks ── */
  --code-bg: #0f172a;              /* slate-900 */
  --code-text: #e2e8f0;           /* slate-200 */
  --code-header-bg: #1e293b;       /* slate-800 */
  --code-header-text: #94a3b8;     /* slate-400 */

  /* ── Sidebar ── */
  --sidebar-bg: #1f2937;
  --sidebar-header-bg: #0f172a;
  --sidebar-text: #d1d5db;
  --sidebar-active-bg: #4f46e5;
  --sidebar-active-text: #ffffff;
  --sidebar-hover-bg: #374151;

  /* ── Misc ── */
  --shadow-color: rgba(0, 0, 0, 0.3);
  --overlay-color: rgba(0, 0, 0, 0.5);
}
```

---

## 6. Vue Composable Design

### `useThemeSwitch()` Composable

```typescript
// src/composables/useThemeSwitch.ts

import { ref, watch, readonly } from 'vue';

export type ThemeId = 'light' | 'dark' | 'system';
// Future: | 'high-contrast' | 'solarized' | 'nord' | etc.

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  icon: string; // SVG path or component name
}

const STORAGE_KEY = 'vue-sdk-playground-theme';
const ATTRIBUTE = 'data-theme';

// Available themes registry — add new themes here
export const themes: ThemeConfig[] = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'System', icon: 'monitor' },
];

// Resolve 'system' to actual theme
function resolveSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

// Module-level singleton state
const currentTheme = ref<ThemeId>(loadSavedTheme());
const resolvedTheme = ref<'light' | 'dark'>(resolveActual(currentTheme.value));

function loadSavedTheme(): ThemeId {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && themes.some(t => t.id === saved)) return saved as ThemeId;
  return 'system';
}

function resolveActual(theme: ThemeId): 'light' | 'dark' {
  return theme === 'system' ? resolveSystemTheme() : theme;
}

function applyTheme(theme: ThemeId) {
  const resolved = resolveActual(theme);
  document.documentElement.setAttribute(ATTRIBUTE, resolved);
  resolvedTheme.value = resolved;
}

// Listen for OS theme changes when in 'system' mode
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (currentTheme.value === 'system') {
        applyTheme('system');
      }
    });
}

export function useThemeSwitch() {
  function setTheme(theme: ThemeId) {
    currentTheme.value = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }

  function toggleTheme() {
    const next = resolvedTheme.value === 'light' ? 'dark' : 'light';
    setTheme(next);
  }

  // Apply on first use
  applyTheme(currentTheme.value);

  return {
    currentTheme: readonly(currentTheme),
    resolvedTheme: readonly(resolvedTheme),
    themes,
    setTheme,
    toggleTheme,
    isDark: () => resolvedTheme.value === 'dark',
  };
}
```

### Key Design Decisions

1. **Singleton pattern** — State is module-level so all components share the same theme
2. **`system` option** — Respects OS preference with live updates via `matchMedia` listener
3. **localStorage persistence** — Theme choice survives page reloads
4. **Extensible registry** — The `themes` array is the single place to register new themes
5. **`data-theme` attribute** — Applied to `<html>` for CSS matching with zero JS overhead

---

## 7. Tailwind CSS v4 Integration

### Using `@theme` Directive

Tailwind CSS v4 supports custom theme tokens via the `@theme` directive. This allows us to register CSS custom properties as first-class Tailwind utilities.

```css
/* src/assets/main.css */

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
```

### Resulting Tailwind Utilities

After `@theme` registration, these classes become available:

```html
<!-- Instead of: bg-white / bg-gray-50 -->
<div class="bg-surface">
<div class="bg-surface-secondary">

<!-- Instead of: text-gray-900 / text-gray-700 -->
<span class="text-on-surface">
<span class="text-on-surface-secondary">

<!-- Instead of: border-gray-200 -->
<div class="border-border">

<!-- Instead of: bg-indigo-600 hover:bg-indigo-700 -->
<button class="bg-accent-600 hover:bg-accent-700">

<!-- Instead of: bg-green-100 text-green-700 -->
<span class="bg-status-success-bg text-status-success-text">
```

---

## 8. Component Migration Strategy

### Migration Priority

Components should be migrated in this order, from most impactful to least:

| Priority | Component | Reason |
|---|---|---|
| 1 | `base.css` / `main.css` | Foundation — replace with theme system |
| 2 | `App.vue` | Root — sets page background |
| 3 | `Sidebar.vue` | Always visible — high visual impact |
| 4 | `SectionCard.vue` | Used everywhere — one change fixes many views |
| 5 | `PageHeader.vue` | Used on every page |
| 6 | `TabGroup.vue` | Used on 3 pages |
| 7 | `CodeBlock.vue` | Code areas |
| 8 | `ResultPanel.vue` | Repeated across API sections |
| 9 | `EventLog.vue` | Repeated across sections |
| 10 | `OverviewView.vue` | Most complex view |
| 11 | `AuthFlowsView.vue` | Second most complex |
| 12 | All `*ApiSection.vue` (8 files) | Similar structure, batch-migrate |
| 13 | All `*Tab.vue` (5 files) | Similar structure, batch-migrate |

### Migration Pattern (Example)

**Before:**
```html
<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <h2 class="text-lg font-semibold text-gray-900">{{ title }}</h2>
  <p class="text-sm text-gray-500">{{ description }}</p>
</div>
```

**After:**
```html
<div class="bg-surface-secondary rounded-lg shadow-sm border border-border p-6">
  <h2 class="text-lg font-semibold text-on-surface">{{ title }}</h2>
  <p class="text-sm text-on-surface-secondary">{{ description }}</p>
</div>
```

No component logic changes. Only class name replacements.

---

## 9. Adding a New Theme (Future)

Adding a new theme (e.g., "Nord") requires exactly **two steps**:

### Step 1: Define the theme's CSS variables

```css
/* In themes.css — add a new block */
[data-theme="nord"] {
  --surface-primary: #2e3440;
  --surface-secondary: #3b4252;
  --text-primary: #eceff4;
  --accent-600: #88c0d0;
  /* ... fill in all tokens ... */
}
```

### Step 2: Register it in the composable

```typescript
// In useThemeSwitch.ts — add to the themes array
export const themes: ThemeConfig[] = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'nord', label: 'Nord', icon: 'snowflake' },   // ← new
  { id: 'system', label: 'System', icon: 'monitor' },
];
```

**That's it.** Zero component changes. The CSS custom properties cascade automatically.

---

## 10. File Structure Overview

```
src/
├── assets/
│   ├── main.css          # Tailwind imports + @theme directive
│   └── themes.css        # All theme definitions (light, dark, future)
├── composables/
│   └── useThemeSwitch.ts # Theme state management composable
├── components/
│   ├── ThemeSwitcher.vue # Theme toggle UI component
│   ├── Sidebar.vue       # Updated with semantic classes
│   ├── layout/
│   │   ├── CodeBlock.vue
│   │   ├── PageHeader.vue
│   │   ├── SectionCard.vue
│   │   └── TabGroup.vue
│   └── shared/
│       ├── EventLog.vue
│       └── ResultPanel.vue
├── views/                # All views updated with semantic classes
│   ├── ...
│   ├── apis/
│   └── components/
└── ...
```
