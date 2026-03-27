# Primitive Component Styling: React SDK vs Vue SDK — Deep Analysis

> **Scope**: This document analyzes how styling is implemented for primitive UI components across the `@asgardeo/react` and `@asgardeo/vue` SDKs, explains the mechanics of each approach, compares them side-by-side, and recommends the best path forward for an SDK context.

---

## Table of Contents

- [Primitive Component Styling: React SDK vs Vue SDK — Deep Analysis](#primitive-component-styling-react-sdk-vs-vue-sdk--deep-analysis)
  - [Table of Contents](#table-of-contents)
  - [1. React SDK Styling Approach](#1-react-sdk-styling-approach)
    - [1.1 Technology Stack](#11-technology-stack)
    - [1.2 File Layout Convention](#12-file-layout-convention)
    - [1.3 How `useStyles` Works](#13-how-usestyles-works)
    - [1.4 Dual Class System: Emotion + BEM](#14-dual-class-system-emotion--bem)
    - [1.5 Theme Integration](#15-theme-integration)
    - [1.6 End-to-End Data Flow](#16-end-to-end-data-flow)
  - [2. Vue SDK Styling Approach](#2-vue-sdk-styling-approach)
    - [2.1 Technology Stack](#21-technology-stack)
    - [2.2 File Layout Convention](#22-file-layout-convention)
    - [2.3 How `injectStyles` Works](#23-how-injectstyles-works)
    - [2.4 CSS Variable Defaults and Overrides](#24-css-variable-defaults-and-overrides)
    - [2.5 How Components Apply Classes](#25-how-components-apply-classes)
    - [2.6 Theme Integration](#26-theme-integration)
    - [2.7 End-to-End Data Flow](#27-end-to-end-data-flow)
  - [3. Side-by-Side Comparison](#3-side-by-side-comparison)
  - [4. The Better Approach for an SDK](#4-the-better-approach-for-an-sdk)
    - [Context: What Makes an SDK Unique](#context-what-makes-an-sdk-unique)
    - [Verdict: The Vue Approach Is Stronger for an SDK Context](#verdict-the-vue-approach-is-stronger-for-an-sdk-context)
      - [Why Vue's Approach Wins](#why-vues-approach-wins)
      - [Where React's Approach Has Advantages](#where-reacts-approach-has-advantages)
  - [5. Recommendation: A Unified Ideal Approach](#5-recommendation-a-unified-ideal-approach)
    - [The Ideal Model: Per-Component Static CSS + CSS Variables](#the-ideal-model-per-component-static-css--css-variables)
    - [What the Current Codebases Should Do](#what-the-current-codebases-should-do)
    - [Summary: Decision Matrix](#summary-decision-matrix)

---

## 1. React SDK Styling Approach

### 1.1 Technology Stack

The React SDK uses **CSS-in-JS via [`@emotion/css`](https://emotion.sh/docs/@emotion/css)**. Emotion generates unique, hashed CSS class names at runtime from tagged template literals and injects them into the `<head>` dynamically.

Key imports in every component's style file:

```ts
import { css } from '@emotion/css';  // generates hashed class names
import { cx }  from '@emotion/css';  // composes multiple class names (in component .tsx)
import { useMemo } from 'react';     // memoizes class generation
```

### 1.2 File Layout Convention

Every primitive component folder has exactly two files:

```
packages/react/src/components/primitives/Button/
├── Button.styles.ts   ← Emotion style definitions (the useStyles hook)
└── Button.tsx         ← React component implementation
```

This one-to-one co-location is consistent across all primitives: `Alert`, `Card`, `TextField`, `Spinner`, `Typography`, `OtpField`, etc.

### 1.3 How `useStyles` Works

Each `*.styles.ts` exports a default function called `useStyles`. It is a **React hook** (calls `useMemo` internally) and its signature takes the current `theme`, `colorScheme`, and all relevant component props that affect visual output:

```ts
// Button.styles.ts (simplified)
const useStyles = (
  theme: Theme,
  colorScheme: string,       // used as a memoization key to re-compute on theme toggle
  color: ButtonColor,        // 'primary' | 'secondary' | 'tertiary' | string
  variant: ButtonVariant,    // 'solid' | 'outline' | 'text' | 'icon'
  size: ButtonSize,
  fullWidth: boolean,
  disabled: boolean,
  loading: boolean,
  shape: 'square' | 'round',
): Record<string, string | null> =>
  useMemo(() => {
    // Each piece of the component gets its own Emotion class
    const baseButton: string = css`
      display: inline-flex;
      align-items: center;
      border-radius: ${theme.vars.components?.Button?.root?.borderRadius
        || theme.vars.borderRadius.medium};
      font-family: ${theme.vars.typography.fontFamily};
      /* ... */
    `;

    const sizeStyles = {
      small:  css`padding: ...; font-size: ${theme.vars.typography.fontSizes.sm};`,
      medium: css`padding: ...; font-size: ${theme.vars.typography.fontSizes.md};`,
      large:  css`padding: ...; font-size: ${theme.vars.typography.fontSizes.lg};`,
    };

    const variantStyles = {
      'primary-solid':   css`background-color: ${theme.vars.colors.primary.main}; ...`,
      'primary-outline': css`background-color: transparent; color: ${theme.vars.colors.primary.main}; ...`,
      'secondary-solid': css`background-color: ${theme.vars.colors.secondary.main}; ...`,
      // ... one entry per color × variant combination
    };

    return {
      button:  baseButton,
      size:    sizeStyles[size],
      variant: variantStyles[`${color}-${variant}`] ?? variantStyles['primary-solid'],
      // ...
    };
  }, [theme, colorScheme, color, variant, size, fullWidth, disabled, loading]);
```

The key insight: `theme.vars.colors.primary.main` is **not a raw color value**. It is a CSS custom property reference string, e.g. `var(--asgardeo-color-primary-main)`. So the Emotion `css` blocks embed CSS variable references, not hard-coded colors. This means the actual color change on theme toggle happens via CSS cascade, not by recomputing Emotion classes.

### 1.4 Dual Class System: Emotion + BEM

The component `Button.tsx` applies **two distinct sets of class names simultaneously**:

```tsx
// Button.tsx
import { withVendorCSSClassPrefix, bem } from '@asgardeo/browser';
import { cx } from '@emotion/css';
import useStyles from './Button.styles';
import useTheme from '../../../contexts/Theme/useTheme';

const Button = forwardRef(({ color, variant, size, fullWidth, loading, ... }, ref) => {
  const { theme, colorScheme } = useTheme();
  const styles = useStyles(theme, colorScheme, color, variant, size, fullWidth, disabled, loading, shape);

  return (
    <button
      className={cx(
        // ── Layer 1: Semantic BEM classes (vendor-prefixed, human-readable) ──
        withVendorCSSClassPrefix(bem('button')),            // → "asgardeo-button"
        withVendorCSSClassPrefix(bem('button', variant)),   // → "asgardeo-button__solid"
        withVendorCSSClassPrefix(bem('button', color)),     // → "asgardeo-button__primary"
        withVendorCSSClassPrefix(bem('button', size)),      // → "asgardeo-button__medium"
        withVendorCSSClassPrefix(bem('button', shape)),     // → "asgardeo-button__square"
        fullWidth ? withVendorCSSClassPrefix(bem('button', 'fullWidth')) : undefined,

        // ── Layer 2: Emotion generated hashed classes (carry actual CSS rules) ──
        styles['button'],    // → "css-abc123" (base layout, border-radius, font)
        styles['size'],      // → "css-def456" (padding, font-size for current size)
        styles['variant'],   // → "css-ghi789" (color, bg, hover/focus states)
        styles['fullWidth'],
        styles['loading'],
        styles['shape'],

        // ── Layer 3: Consumer className passthrough ──
        className,
      )}
    >
```

**Why both?**
- **BEM classes** (`asgardeo-button`, `asgardeo-button__solid`) are stable, predictable, human-readable. SDK consumers can target them in their own CSS for overrides. They also serve as test selectors.
- **Emotion classes** (`css-abc123`) carry the real CSS rules (layout, spacing, interactions). Emotion guarantees uniqueness so there are no global conflicts.

The `bem()` utility in `@asgardeo/javascript` builds BEM string suffixes:

```ts
// bem('button')           → 'button'
// bem('button', 'solid')  → 'button__solid'
// bem('button', null, 'loading') → 'button--loading'  (modifier format)
```

Then `withVendorCSSClassPrefix()` adds the `asgardeo-` prefix:

```ts
withVendorCSSClassPrefix('button')        // → 'asgardeo-button'
withVendorCSSClassPrefix('button__solid') // → 'asgardeo-button__solid'
```

### 1.5 Theme Integration

The React `ThemeProvider` performs the following steps:

1. **Resolves** a `Theme` object from `createTheme(themeConfig, isDark)` — defined in `@asgardeo/javascript`. This object has two parallel structures:
   - `theme.colors.primary.main` → actual hex value (e.g., `"#1a73e8"`)
   - `theme.vars.colors.primary.main` → CSS variable reference (e.g., `"var(--asgardeo-color-primary-main)"`)
2. **Writes CSS custom properties** to `document.documentElement` via `applyThemeToDOM(theme)`, which iterates `theme.cssVariables` (a flat `Record<string, string>` of all CSS var name → value pairs).
3. **Provides** the `Theme` object through React context (`ThemeContext`).
4. **Components** call `useTheme()` to get the `Theme` object and pass it to their `useStyles` hook.
5. **`useStyles`** embeds `theme.vars.xxx` (which are `var(--asgardeo-xxx)` strings) into Emotion templates, not raw values.

This creates a **layered resolution**:

```
ThemeConfig (user overrides + branding + defaults)
    ↓  createTheme()
Theme object (theme.vars = CSS var reference strings)
    ↓  applyThemeToDOM()
document.documentElement CSS variables (actual resolved values)
    ↑  var(--asgardeo-color-primary-main)  ← referenced by Emotion styles
Emotion CSS classes (in <head> <style> tags)
    ↑  applied to DOM elements
Components (className={cx(bemClass, emotionClass)})
```

### 1.6 End-to-End Data Flow

```
User configures ThemeProvider (theme prop)
        │
        ▼
createTheme(config, isDark) → { vars: { colors: { primary: { main: 'var(--asgardeo-color-primary-main)' } } }, cssVariables: { '--asgardeo-color-primary-main': '#1a73e8' } }
        │
        ├──► applyThemeToDOM() → sets document.documentElement CSS variables
        │
        └──► ThemeContext.provide({ theme, colorScheme })
                │
                ▼
        Button component calls useTheme()
                │
                ▼
        useStyles(theme, colorScheme, 'primary', 'solid', 'medium', ...)
                │
                ▼
        useMemo computes Emotion class names:
        - baseButton = css`border-radius: var(--asgardeo-border-radius-medium); ...`
        - variant    = css`background-color: var(--asgardeo-color-primary-main); ...`
                │
                ▼
        Emotion inserts <style>.css-abc123 { background-color: var(--asgardeo-color-primary-main) }</style>
                │
                ▼
        Browser resolves var(--asgardeo-color-primary-main) → '#1a73e8'
```

---

## 2. Vue SDK Styling Approach

### 2.1 Technology Stack

The Vue SDK uses **static CSS injection with CSS custom properties** (CSS Variables). There is no CSS-in-JS runtime. All component styles are pre-written as a single static CSS string, injected into the DOM once at plugin install time.

No external CSS styling library is used in the Vue primitives.

### 2.2 File Layout Convention

Vue SDK primitive components are **single-file TypeScript render functions** (`*.ts`, not `*.vue`):

```
packages/vue/src/components/primitives/
├── Alert.ts
├── Button.ts
├── Card.ts
├── TextField.ts
├── Spinner.ts
├── Typography.ts
└── ... (all in one flat directory, no sub-directories)

packages/vue/src/styles/
└── injectStyles.ts   ← ALL component styles in one monolithic CSS string
```

There are no per-component style files. All primitive styling lives in `injectStyles.ts`.

### 2.3 How `injectStyles` Works

`injectStyles.ts` contains a constant `STYLES` — a multi-thousand-line CSS string encompassing styles for **every** primitive: Button, Card, Alert, TextField, PasswordField, Select, Checkbox, OtpField, DatePicker, Divider, Logo, Typography, Spinner.

```ts
const STYLE_ID = 'asgardeo-vue-styles';

const STYLES = `
/* Default CSS variable fallback values for when ThemeProvider isn't present */
:root {
  --asgardeo-color-primary-main: #1a73e8;
  --asgardeo-color-primary-dark: #174ea6;
  --asgardeo-color-primary-contrastText: #ffffff;
  /* ... all design tokens ... */
  --asgardeo-spacing-unit: 8px;
  --asgardeo-border-radius-medium: 8px;
}

/* BUTTON */
.asgardeo-button {
  display: inline-flex;
  align-items: center;
  border-radius: var(--asgardeo-border-radius-medium);
  font-family: var(--asgardeo-typography-fontFamily);
  /* ... */
}
.asgardeo-button--small  { padding: ...; font-size: var(--asgardeo-typography-fontSize-sm); }
.asgardeo-button--medium { padding: ...; font-size: var(--asgardeo-typography-fontSize-md); }
.asgardeo-button--large  { padding: ...; font-size: var(--asgardeo-typography-fontSize-lg); }

.asgardeo-button--solid.asgardeo-button--primary {
  background-color: var(--asgardeo-color-primary-main);
  color: var(--asgardeo-color-primary-contrastText);
  border-color: var(--asgardeo-color-primary-main);
}
.asgardeo-button--solid.asgardeo-button--primary:hover:not(:disabled) {
  background-color: var(--asgardeo-color-primary-dark);
}

/* CARD, ALERT, TEXT FIELD, ... (all in same string) */
`;

export function injectStyles(): void {
  if (typeof document === 'undefined') return;  // SSR guard
  if (document.getElementById(STYLE_ID)) return; // idempotent — no-op if already injected

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}
```

`injectStyles()` is called from the **Vue plugin installer**:

```ts
// AsgardeoPlugin.ts
const AsgardeoPlugin: Plugin = {
  install(app) {
    injectStyles();  // inject all CSS once at app startup
    app.component('AsgardeoProvider', AsgardeoProvider);
  },
};
```

This means: styles exist in the DOM from the moment the SDK is initialized, regardless of which components are actually used.

### 2.4 CSS Variable Defaults and Overrides

The `:root` block in `STYLES` provides **default fallback values** for all design tokens. This has an important consequence: components render with reasonable styling even if no `ThemeProvider` is wrapped around them. This is different from the React SDK where `useTheme()` throws if no `ThemeProvider` is present.

When a `ThemeProvider` is mounted, it **overrides** these defaults by writing inline styles to `document.documentElement`:

```ts
// ThemeProvider.ts (Vue)
const applyToDom = (theme: Theme) => {
  const root = document.documentElement;
  Object.entries(theme.cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value); // overrides :root defaults with inline styles (higher specificity)
  });
};

watch(resolvedTheme, (theme) => applyToDom(theme), { immediate: true });
```

Because `element.style.setProperty()` (inline style) has higher specificity than `:root { ... }` (stylesheet rule), the ThemeProvider values always win without any specificity battle.

### 2.5 How Components Apply Classes

Vue primitive components build their class string by calling `withVendorCSSClassPrefix()` on BEM segment strings. There are no JS-computed styles — only class name composition:

```ts
// Button.ts
const Button = defineComponent({
  name: 'Button',
  props: {
    variant: { type: String as PropType<'solid' | 'outline' | 'ghost' | 'text'>, default: 'solid' },
    color:   { type: String as PropType<'primary' | 'secondary' | 'danger'>, default: 'primary' },
    size:    { type: String as PropType<'small' | 'medium' | 'large'>, default: 'medium' },
    // ...
  },
  setup(props, { slots, emit, attrs }) {
    return () => {
      const cssClass = [
        withVendorCSSClassPrefix('button'),                          // asgardeo-button
        withVendorCSSClassPrefix(`button--${props.variant}`),        // asgardeo-button--solid
        withVendorCSSClassPrefix(`button--${props.color}`),          // asgardeo-button--primary
        withVendorCSSClassPrefix(`button--${props.size}`),           // asgardeo-button--medium
        props.fullWidth ? withVendorCSSClassPrefix('button--full-width') : '',
        props.loading   ? withVendorCSSClassPrefix('button--loading') : '',
        (attrs['class'] as string) || '',                            // consumer className passthrough
      ].filter(Boolean).join(' ');

      return h('button', {
        class: cssClass,
        // ... event handlers, disabled, etc.
      }, [ /* slots */ ]);
    };
  },
});
```

The CSS selector `.asgardeo-button--solid.asgardeo-button--primary` in `injectStyles.ts` then targets this rendered element because **both classes are present simultaneously**, which is standard CSS multi-class specificity.

The `TextField` component follows the same pattern but uses modifier logic driven by component state:

```ts
const wrapperClass = [
  withVendorCSSClassPrefix('text-field'),
  hasError ? withVendorCSSClassPrefix('text-field--error') : '',
  (attrs['class'] as string) || '',
].filter(Boolean).join(' ');
```

And the CSS handles this:

```css
.asgardeo-text-field--error .asgardeo-text-field__input {
  border-color: var(--asgardeo-color-error-main);
}
```

### 2.6 Theme Integration

The Vue `ThemeProvider` follows a similar resolution pipeline to the React one but without any JS-level memoization of styles:

1. **Merges** user-provided `theme` prop with branding theme from `BrandingProvider` (if present).
2. **Calls** `createTheme(config, isDark)` from `@asgardeo/javascript` to produce a `Theme` object with a `cssVariables` map.
3. **Writes** CSS custom properties to `document.documentElement` using `style.setProperty()`.
4. **Provides** the theme via Vue's `provide/inject` system (`THEME_KEY`).
5. **Watches** for theme changes reactively — when `resolvedTheme` changes (e.g., user toggles dark mode), the watcher fires `applyToDom()` again.

The static CSS in `injectStyles.ts` reads the CSS variables automatically via the cascade. Components never need to re-render for a theme change unless props change.

### 2.7 End-to-End Data Flow

```
Vue app calls app.use(AsgardeoPlugin)
        │
        ▼
injectStyles() → inserts single <style id="asgardeo-vue-styles"> with all CSS
(includes :root defaults for CSS variables)
        │
        ▼
User mounts ThemeProvider / AsgardeoProvider
        │
        ▼
createTheme(config, isDark) → { cssVariables: { '--asgardeo-color-primary-main': '#1a73e8', ... } }
        │
        ▼
applyToDom() → document.documentElement.style.setProperty('--asgardeo-color-primary-main', '#1a73e8')
(overrides :root defaults via inline style specificity)
        │
        ▼
Browser resolves var(--asgardeo-color-primary-main) in static CSS → '#1a73e8'
        │
        ▼
Button component builds class string: "asgardeo-button asgardeo-button--solid asgardeo-button--primary asgardeo-button--medium"
        │
        ▼
Browser matches .asgardeo-button--solid.asgardeo-button--primary rule → applies styles
```

---

## 3. Side-by-Side Comparison

| Aspect | React SDK (`@asgardeo/react`) | Vue SDK (`@asgardeo/vue`) |
|---|---|---|
| **Styling technology** | Emotion CSS-in-JS (`@emotion/css`) | Static CSS string injection — no CSS-in-JS |
| **External dependency** | `@emotion/css` runtime (adds ~7kb gzipped to bundle) | None (zero additional runtime) |
| **Style file structure** | Per-component `*.styles.ts` file (co-located) | One monolithic `injectStyles.ts` for all primitives |
| **Class names on elements** | Hashed Emotion classes + vendor BEM classes | Vendor BEM classes only |
| **Prop-driven style branching** | Done in JavaScript (`useMemo`, object keyed by `${color}-${variant}`) | Done in CSS (multi-class selectors: `.asgardeo-button--solid.asgardeo-button--primary`) |
| **Type-safety on styles** | Strongly typed hook signature; `Record<string, string>` return | No style type system (plain strings) |
| **Theme value binding** | `theme.vars.xxx` (CSS var ref strings) embedded in Emotion templates at call time | Static CSS references `var(--asgardeo-xxx)` directly |
| **Re-computation on theme change** | `useMemo` dependency on `[theme, colorScheme, ...]` recomputes class objects | No recomputation; CSS vars cascade handles it |
| **Without ThemeProvider** | `useTheme()` throws; component fails to render | `:root` defaults in injected CSS provide fallback values |
| **SSR / hydration** | Requires `@emotion/server` for SSR; hydration mismatch risk | Works natively; CSS injected client-side, no hydration conflict |
| **When styles hit the DOM** | On first render of the component (lazy) | At plugin install time (eager, all-at-once) |
| **CSS specificity model** | Emotion generates atomic-like classes; specificity is per-class and low | Standard cascade with BEM; specificity predictable by convention |
| **Consumer override mechanism** | Target stable BEM class names (Emotion classes not stable) | Target BEM class names |
| **Animation/pseudo-class support** | Full (Emotion template supports `&:hover`, `&:focus`, nested etc.) | Full standard CSS |
| **Dark mode style switching** | CSS variables cascade handles it (no re-render required for color changes) | CSS variables cascade handles it |
| **Bundle size impact** | Emotion runtime + per-component style strings | Inline CSS string (~few KB, no runtime) |
| **Consistency enforcement** | Each dev writes their own `useStyles` (risk of drift) | All styles in one file — easier to audit consistency |
| **Testing** | Styles testable at hook level (pure function) | Styles in CSS; visual regression testing required |
| **Co-location (DX)** | High — style file is right next to component | Low — styles separated into one global file |

---

## 4. The Better Approach for an SDK

### Context: What Makes an SDK Unique

A UI SDK (like `@asgardeo/react` and `@asgardeo/vue`) has constraints that differ from a typical application:

1. **It is consumed as a library** — the host application controls the surrounding CSS environment. The SDK must not cause global style pollution or specificity wars.
2. **Bundle size matters** — every consumer pays the SDK's bundle cost. Runtime CSS-in-JS adds weight that benefits only the SDK author.
3. **Theming must be consumer-controlled** — colors, spacing, and radii must be overriddable by the host app without forking the SDK.
4. **SSR / meta-frameworks are common targets** — Next.js, Nuxt, SvelteKit. The styling approach must work in these contexts without special configuration.
5. **External override API** — developers building on top of the SDK need a stable, documented hook for styling overrides, not auto-generated class names that change across versions.

### Verdict: The Vue Approach Is Stronger for an SDK Context

The Vue SDK's **static CSS + CSS Variables** approach wins on the criteria that matter most for an SDK:

#### Why Vue's Approach Wins

**1. Zero runtime overhead**

The Vue approach injects CSS once at startup. After that, there is no per-render style computation. Every theme update flows through CSS variable cascade — the fastest path possible in the browser. The React Emotion approach re-invokes `useMemo` on every prop change that could affect styles, and Emotion must reconcile its internal cache.

**2. Smaller footprint**

`@emotion/css` is a non-trivial runtime dependency added to every consumer's bundle. The Vue SDK has no such dependency. For a library distributed to thousands of integrators, this matters.

**3. Genuine SSR compatibility**

The Vue approach is SSR-neutral — it injects styles only on the client (`typeof document === 'undefined'` guard). The fallback `:root` values mean components render correctly on the server without any special setup. The React Emotion approach requires `@emotion/server` integration for SSR (critical flush of styles, cache extraction) and risks hydration mismatches.

**4. Predictable, stable class names**

The Vue SDK exposes only `asgardeo-button`, `asgardeo-button--solid`, etc. — stable, documented class names that never change between renders. Consumers can write `[data-asgardeo] .asgardeo-button { ... }` and it will work across versions. The React approach emits both BEM classes (stable) and Emotion hashed classes (unstable), which can confuse consumers trying to override styles.

**5. Resilient without ThemeProvider**

The Vue `:root` fallback values are a major DX win. If an SDK consumer forgets to add a `ThemeProvider` or adds a component outside the provider tree, it degrades gracefully rather than throwing. The React `useTheme()` throws synchronously.

**6. CSS multi-class selectors are the natural idiom for variant+color state**

The pattern `.asgardeo-button--solid.asgardeo-button--primary` is idiomatic CSS. It is readable, searchable by grep, and imposes no JS step between "props change" and "styles change". The React approach's `variantStyles['primary-solid']` string-keyed lookup in a JS object replicates what CSS naturally expresses.

#### Where React's Approach Has Advantages

The React approach is superior in the following narrow cases:

1. **Complex, prop-driven runtime calculations** — styles that cannot be expressed in pure CSS (e.g., `width: ${iconSizeMap[size]}`) are natural in Emotion. In a pure-CSS approach you must use CSS variables or fixed class slots.
2. **TypeScript type safety on style inputs** — the `useStyles` hook signature is fully typed, making it impossible to pass an unsupported `size` value at compile time.
3. **Per-component style isolation** — with Emotion, each component's styles are a distinct hash. You cannot accidentally break `TextField` by editing `Button` styles. In the monolithic Vue file, editing one component's section could affect another with a shared prefix.
4. **Testability of logic** — the `useStyles` function is a pure function that can be unit-tested: `expect(useStyles(theme, 'light', 'primary', 'solid', ...)).toMatchObject({ variant: expect.stringContaining('css-') })`.

---

## 5. Recommendation: A Unified Ideal Approach

Given the SDK context, the **best approach combines the Vue strategy's runtime simplicity with the React strategy's co-location discipline**:

### The Ideal Model: Per-Component Static CSS + CSS Variables

```
packages/react/src/components/primitives/Button/
├── Button.css         ← per-component static CSS (no Emotion, no JS)
└── Button.tsx         ← imports Button.css; applies BEM class names only
```

or, for a zero-JS-import experience:

```
packages/shared/styles/primitives/
├── button.css
├── text-field.css
├── alert.css
└── index.css          ← re-exports all, consumed by both react and vue packages
```

Key principles for this model:

1. **CSS variables everywhere** — no hard-coded color values; all design tokens via `--asgardeo-xxx`.
2. **BEM class names only** — no hashed Emotion classes; all class names are stable and documented.
3. **`:root` fallbacks** — default `:root` block in a `defaults.css` so components render without a provider.
4. **No CSS-in-JS runtime** — the `@emotion/css` dependency is removed.
5. **Multi-class CSS selectors for variant/color combinatorics** — `.asgardeo-button--solid.asgardeo-button--primary` instead of JS object keying.
6. **Component-level CSS modules (optional)** — if co-location is important, use CSS Modules (TypeScript-supported via `*.module.css`) for scoped styles. CSS Modules are a build-time transform with no runtime cost.
7. **ThemeProvider writes CSS variables** — the existing `applyThemeToDOM()` / `createTheme()` mechanism in `@asgardeo/javascript` is already correct and should be kept.

### What the Current Codebases Should Do

| SDK | Action |
|---|---|
| **Vue SDK** | Already on the right track. The main gap: the monolithic `injectStyles.ts` should be split into per-component CSS files to improve maintainability. Add a CSS lint step to enforce BEM naming. |
| **React SDK** | Consider migrating from Emotion to either CSS Modules or plain CSS with BEM classes. The `useStyles` hook pattern is a useful pattern for organizing style logic, but the Emotion runtime dependency and per-render memoization cost can be eliminated by inlining CSS variable references in static CSS. |

### Summary: Decision Matrix

| Criterion | Emotion (React current) | Static CSS + Vars (Vue current) | CSS Modules + Vars (ideal) |
|---|:---:|:---:|:---:|
| Zero runtime cost | ✗ | ✓ | ✓ |
| SSR compatible out of box | ✗ | ✓ | ✓ |
| Bundle size | ✗ | ✓ | ✓ |
| Stable class names for consumers | Partial | ✓ | ✓ |
| Co-located styles | ✓ | ✗ | ✓ |
| TypeScript type safety on styles | ✓ | ✗ | Partial |
| Graceful render without ThemeProvider | ✗ | ✓ | ✓ |
| CSS selector-driven variant logic | ✗ | ✓ | ✓ |
| Easy to audit all button styles | ✗ | ✓ | ✓ |
| Easy to audit without touching other components | ✓ | ✗ | ✓ |
| Scales to large component sets | Partial | ✗ (monolith) | ✓ |

> **Bottom line**: The Vue SDK's static CSS + CSS Variables approach is the better foundation for an SDK. Its main weakness (the monolithic single-file style blob) is an organizational issue — solved by splitting into per-component CSS files — not a fundamental architectural problem. The React SDK's use of Emotion introduces non-trivial costs (bundle, SSR complexity, render-time computation) that do not justify the benefits in a library distribution context.

---

*Document last updated: March 2026*
