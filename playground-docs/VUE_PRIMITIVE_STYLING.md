# Asgardeo Vue SDK – Primitive Component Styling Guide

> **Audience**: developers integrating `@asgardeo/vue` into a Vue 3 application  
> **Scope**: how default styles work, how to customise via CSS variables, and how to override with BEM selectors

---

## Table of Contents

1. [Overview](#overview)
2. [How Styles Are Injected](#how-styles-are-injected)
3. [CSS Variables (Design Tokens)](#css-variables-design-tokens)
4. [ThemeProvider – Runtime Theming](#themeprovider--runtime-theming)
5. [BEM Class Reference](#bem-class-reference)
6. [Per-Component Usage & Customisation](#per-component-usage--customisation)
   - [Button](#button)
   - [Alert](#alert)
   - [Card](#card)
   - [Checkbox](#checkbox)
   - [DatePicker](#datepicker)
   - [Divider](#divider)
   - [Logo](#logo)
   - [OtpField](#otpfield)
   - [PasswordField](#passwordfield)
   - [Select](#select)
   - [Spinner](#spinner)
   - [TextField](#textfield)
   - [Typography](#typography)
7. [Customisation Strategies](#customisation-strategies)
   - [Strategy 1 – Global CSS variable override](#strategy-1--global-css-variable-override)
   - [Strategy 2 – ThemeProvider config prop](#strategy-2--themeprovider-config-prop)
   - [Strategy 3 – BEM class targeting](#strategy-3--bem-class-targeting)
   - [Strategy 4 – `class` and `style` prop passthrough](#strategy-4--class-and-style-prop-passthrough)
8. [Codebase Structure](#codebase-structure)

---

## Overview

Primitive components in `@asgardeo/vue` use a zero-runtime CSS approach:

| Concern | Mechanism |
|---|---|
| Class names | BEM methodology — `.asgardeo-button`, `.asgardeo-button--primary`, `.asgardeo-button__content` |
| Default values | CSS custom properties (`--asgardeo-*`) defined in a `:root` rule |
| Runtime theming | `ThemeProvider` writes CSS variables via `documentElement.style.setProperty()` |
| Style injection | One `<style id="asgardeo-vue-styles">` tag injected by `AsgardeoPlugin` at `app.use()` time |

There is **no CSS-in-JS runtime** and **no Emotion / styled-components** dependency. All styling is plain CSS strings bundled with the library.

---

## How Styles Are Injected

When you call `app.use(AsgardeoPlugin, { ... })`, the plugin calls `injectStyles()` once:

```ts
// src/plugins/AsgardeoPlugin.ts (simplified)
const AsgardeoPlugin: Plugin = {
  install(app) {
    injectStyles();                           // ← single <style> tag in <head>
    app.component('AsgardeoProvider', AsgardeoProvider);
  },
};
```

The `injectStyles()` function:
- Is **idempotent** — checks for `document.getElementById('asgardeo-vue-styles')` before inserting
- Assembles CSS strings from each component's `.css.ts` module
- Works in SSR environments (no-op when `document` is `undefined`)

You never need to import a CSS file manually.

---

## CSS Variables (Design Tokens)

All design decisions are expressed as `--asgardeo-*` CSS custom properties. These are defined on `:root` with default values, so components render correctly even without any ThemeProvider.

### Color tokens

| Variable | Default | Purpose |
|---|---|---|
| `--asgardeo-color-primary-main` | `#1a73e8` | Primary interactive colour |
| `--asgardeo-color-primary-dark` | `#174ea6` | Hover state for primary |
| `--asgardeo-color-primary-contrastText` | `#ffffff` | Text on primary backgrounds |
| `--asgardeo-color-secondary-main` | `#424242` | Secondary interactive colour |
| `--asgardeo-color-secondary-contrastText` | `#ffffff` | Text on secondary backgrounds |
| `--asgardeo-color-background-surface` | `#ffffff` | Card / input background |
| `--asgardeo-color-background-disabled` | `#f0f0f0` | Disabled element background |
| `--asgardeo-color-text-primary` | `#1a1a1a` | Default text |
| `--asgardeo-color-text-secondary` | `#666666` | Muted / helper text |
| `--asgardeo-color-border` | `#e0e0e0` | Input and divider borders |
| `--asgardeo-color-error-main` | `#d32f2f` | Error borders / icons |
| `--asgardeo-color-error-contrastText` | `#b71c1c` | Error message text |
| `--asgardeo-color-success-main` | `#4caf50` | Success state |
| `--asgardeo-color-warning-main` | `#ff9800` | Warning state |
| `--asgardeo-color-info-main` | `#bbebff` | Info state |

### Spacing & shape tokens

| Variable | Default | Purpose |
|---|---|---|
| `--asgardeo-spacing-unit` | `8px` | Base spacing multiplier |
| `--asgardeo-border-radius-small` | `4px` | Inputs, badges |
| `--asgardeo-border-radius-medium` | `8px` | Buttons, cards |
| `--asgardeo-border-radius-large` | `16px` | Dialogs, panels |
| `--asgardeo-shadow-small` | `0 2px 8px rgba(0,0,0,.1)` | Subtle elevation |
| `--asgardeo-shadow-medium` | `0 4px 16px rgba(0,0,0,.15)` | Cards |
| `--asgardeo-shadow-large` | `0 8px 32px rgba(0,0,0,.2)` | Dialogs |

### Typography tokens

| Variable | Default | Purpose |
|---|---|---|
| `--asgardeo-typography-fontFamily` | system UI stack | Body / label fonts |
| `--asgardeo-typography-fontSize-xs` | `0.75rem` | Caption, error text |
| `--asgardeo-typography-fontSize-sm` | `0.875rem` | Labels, helper text |
| `--asgardeo-typography-fontSize-md` | `1rem` | Input text, body |
| `--asgardeo-typography-fontSize-lg` | `1.125rem` | Subtitle1, h5 |
| `--asgardeo-typography-fontSize-xl` | `1.25rem` | h3 |
| `--asgardeo-typography-fontSize-2xl` | `1.5rem` | h2 |
| `--asgardeo-typography-fontSize-3xl` | `2.125rem` | h1 |
| `--asgardeo-typography-fontWeight-normal` | `400` | |
| `--asgardeo-typography-fontWeight-medium` | `500` | |
| `--asgardeo-typography-fontWeight-semibold` | `600` | |
| `--asgardeo-typography-fontWeight-bold` | `700` | |
| `--asgardeo-typography-lineHeight-tight` | `1.2` | Headings |
| `--asgardeo-typography-lineHeight-normal` | `1.4` | Default |
| `--asgardeo-typography-lineHeight-relaxed` | `1.6` | Body paragraphs |

---

## ThemeProvider – Runtime Theming

Wrap your application (or a subtree) with `ThemeProvider` to apply a custom theme at runtime. Under the hood it calls `document.documentElement.style.setProperty(key, value)` for each token, which has higher specificity than the `:root` stylesheet rule and therefore wins automatically.

```vue
<template>
  <ThemeProvider :config="myTheme">
    <YourApp />
  </ThemeProvider>
</template>

<script setup lang="ts">
import { ThemeProvider } from '@asgardeo/vue';

const myTheme = {
  colors: {
    primary: {
      main: '#6200ea',
      dark: '#3700b3',
      contrastText: '#ffffff',
    },
  },
  borderRadius: {
    medium: '12px',
  },
};
</script>
```

ThemeProvider accepts the same `ThemeConfig` shape as `@asgardeo/javascript`'s `createTheme()` utility. You only need to provide the tokens you want to override — everything else falls back to the `:root` defaults.

---

## BEM Class Reference

All primitive component classes use the `asgardeo-` vendor prefix and follow BEM (Block–Element–Modifier) naming:

```
.{block}
.{block}--{modifier}
.{block}__{element}
.{block}__{element}--{modifier}
```

The full inventory:

| Component | Block | Modifiers | Elements |
|---|---|---|---|
| Button | `asgardeo-button` | `--solid` `--outline` `--ghost` `--text` `--primary` `--secondary` `--danger` `--small` `--medium` `--large` `--full-width` `--loading` | `__start-icon` `__end-icon` `__content` `__spinner` |
| Alert | `asgardeo-alert` | `--info` `--success` `--warning` `--error` | `__content` `__dismiss` |
| Card | `asgardeo-card` | `--elevated` `--outlined` `--flat` | — |
| Checkbox | `asgardeo-checkbox` | `--error` | `__wrapper` `__input` `__label` `__error` |
| DatePicker | `asgardeo-date-picker` | `--error` | `__label` `__required` `__input` `__error` |
| Divider | `asgardeo-divider` | `--horizontal` `--vertical` `--with-content` | `__line` `__content` |
| Logo | `asgardeo-logo` | — | `__image` |
| OtpField | `asgardeo-otp-field` | — | `__label` `__required` `__inputs` `__digit` `__error` |
| PasswordField | `asgardeo-password-field` | `--error` | `__label` `__required` `__wrapper` `__input` `__toggle` `__error` |
| Select | `asgardeo-select` | `--error` | `__label` `__required` `__input` `__error` `__helper` |
| Spinner | `asgardeo-spinner` | `--small` `--medium` `--large` | `__svg` `__circle` |
| TextField | `asgardeo-text-field` | `--error` | `__label` `__required` `__input` `__error` `__helper` |
| Typography | `asgardeo-typography` | `--h1` `--h2` `--h3` `--h4` `--h5` `--h6` `--subtitle1` `--subtitle2` `--body1` `--body2` `--caption` `--overline` | — |

---

## Per-Component Usage & Customisation

### Button

```vue
<template>
  <!-- Solid primary (default) -->
  <AsgardeoButton variant="solid" color="primary" size="medium">
    Sign in
  </AsgardeoButton>

  <!-- Outline danger with icons -->
  <AsgardeoButton variant="outline" color="danger" :startIcon="TrashIcon">
    Delete account
  </AsgardeoButton>

  <!-- Full-width loading state -->
  <AsgardeoButton variant="solid" color="primary" fullWidth :loading="submitting">
    Continue
  </AsgardeoButton>
</template>
```

**Props**

| Prop | Type | Default | Values |
|---|---|---|---|
| `variant` | `string` | `"solid"` | `"solid"` `"outline"` `"ghost"` `"text"` |
| `color` | `string` | `"primary"` | `"primary"` `"secondary"` `"danger"` |
| `size` | `string` | `"medium"` | `"small"` `"medium"` `"large"` |
| `fullWidth` | `boolean` | `false` | |
| `loading` | `boolean` | `false` | |
| `disabled` | `boolean` | `false` | |

**CSS override example**

```css
/* Increase border radius on all buttons */
.asgardeo-button {
  border-radius: 24px;
}

/* Override only the primary solid hover colour */
.asgardeo-button--solid.asgardeo-button--primary:hover:not(:disabled) {
  background-color: #0056d2;
  border-color: #0056d2;
}
```

---

### Alert

```vue
<template>
  <AsgardeoAlert severity="error" dismissible @dismiss="hideAlert">
    Your session has expired.
  </AsgardeoAlert>

  <AsgardeoAlert severity="success">
    Profile updated successfully.
  </AsgardeoAlert>
</template>
```

**Props**

| Prop | Type | Default | Values |
|---|---|---|---|
| `severity` | `string` | `"info"` | `"info"` `"success"` `"warning"` `"error"` |
| `dismissible` | `boolean` | `false` | |

**CSS override example**

```css
/* Softer error alert */
.asgardeo-alert--error {
  background-color: #fce4ec;
  border-color: #e91e63;
  color: #880e4f;
}
```

---

### Card

```vue
<template>
  <!-- Elevated card (default) -->
  <AsgardeoCard variant="elevated">
    <p>Content goes here</p>
  </AsgardeoCard>

  <!-- Outlined card -->
  <AsgardeoCard variant="outlined">
    <p>Content goes here</p>
  </AsgardeoCard>
</template>
```

**Props**

| Prop | Type | Default | Values |
|---|---|---|---|
| `variant` | `string` | `"elevated"` | `"elevated"` `"outlined"` `"flat"` |

**CSS override example**

```css
/* Extra padding for all cards */
.asgardeo-card {
  padding: 32px;
}
```

---

### Checkbox

```vue
<template>
  <AsgardeoCheckbox
    v-model="agreed"
    label="I agree to the terms and conditions"
    :error="errors.agreed"
  />
</template>
```

**Props**

| Prop | Type | Default |
|---|---|---|
| `modelValue` | `boolean` | `false` |
| `label` | `string` | `""` |
| `error` | `string` | `""` |
| `required` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |

**CSS override example**

```css
/* Larger checkbox */
.asgardeo-checkbox__input {
  width: 20px;
  height: 20px;
}
```

---

### DatePicker

```vue
<template>
  <AsgardeoDatePicker
    v-model="birthDate"
    label="Date of birth"
    :error="errors.birthDate"
    required
  />
</template>
```

**Props**

| Prop | Type | Default |
|---|---|---|
| `modelValue` | `string` | `""` |
| `label` | `string` | `""` |
| `error` | `string` | `""` |
| `required` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |

---

### Divider

```vue
<template>
  <!-- Horizontal rule -->
  <AsgardeoDiv orientation="horizontal" />

  <!-- With centred label -->
  <AsgardeoDiv orientation="horizontal">OR</AsgardeoDiv>

  <!-- Vertical (inline, requires explicit height from parent) -->
  <div style="display:flex; align-items:center; height:40px;">
    <span>Left</span>
    <AsgardeoDiv orientation="vertical" />
    <span>Right</span>
  </div>
</template>
```

**Props**

| Prop | Type | Default | Values |
|---|---|---|---|
| `orientation` | `string` | `"horizontal"` | `"horizontal"` `"vertical"` |

---

### Logo

```vue
<template>
  <AsgardeoLogo
    src="/assets/company-logo.svg"
    alt="Company logo"
    style="height: 48px;"
  />
</template>
```

**Props**

| Prop | Type | Default |
|---|---|---|
| `src` | `string` | — |
| `alt` | `string` | `""` |
| `href` | `string` | `""` |

**CSS override example**

```css
/* Maximum logo height everywhere */
.asgardeo-logo__image {
  max-height: 60px;
}
```

---

### OtpField

```vue
<template>
  <AsgardeoOtpField
    v-model="otp"
    label="One-time password"
    :digits="6"
    :error="otpError"
    required
    @complete="verifyOtp"
  />
</template>
```

**Props**

| Prop | Type | Default |
|---|---|---|
| `modelValue` | `string` | `""` |
| `digits` | `number` | `6` |
| `label` | `string` | `""` |
| `error` | `string` | `""` |
| `required` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |

**CSS override example**

```css
/* Larger digit boxes */
.asgardeo-otp-field__digit {
  width: 56px;
  height: 56px;
  font-size: 1.25rem;
}
```

---

### PasswordField

```vue
<template>
  <AsgardeoPasswordField
    v-model="password"
    label="Password"
    placeholder="Enter your password"
    :error="errors.password"
    required
  />
</template>
```

**Props**

| Prop | Type | Default |
|---|---|---|
| `modelValue` | `string` | `""` |
| `label` | `string` | `""` |
| `placeholder` | `string` | `""` |
| `error` | `string` | `""` |
| `required` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |

---

### Select

```vue
<template>
  <AsgardeoSelect
    v-model="country"
    label="Country"
    :options="countryOptions"
    :error="errors.country"
    helper="Select the country of your primary residence"
    required
  />
</template>

<script setup lang="ts">
const countryOptions = [
  { value: 'us', label: 'United States' },
  { value: 'gb', label: 'United Kingdom' },
];
</script>
```

**Props**

| Prop | Type | Default |
|---|---|---|
| `modelValue` | `string` | `""` |
| `options` | `Array<{ value: string; label: string }>` | `[]` |
| `label` | `string` | `""` |
| `placeholder` | `string` | `""` |
| `error` | `string` | `""` |
| `helper` | `string` | `""` |
| `required` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |

---

### Spinner

```vue
<template>
  <AsgardeoSpinner size="medium" />

  <!-- Coloured via CSS variable override -->
  <AsgardeoSpinner size="large" style="color: #6200ea" />
</template>
```

**Props**

| Prop | Type | Default | Values |
|---|---|---|---|
| `size` | `string` | `"medium"` | `"small"` `"medium"` `"large"` |

**CSS override example**

```css
/* Teal spinner */
.asgardeo-spinner {
  color: #00796b;
}
```

---

### TextField

```vue
<template>
  <AsgardeoTextField
    v-model="email"
    label="Email address"
    type="email"
    placeholder="you@example.com"
    :error="errors.email"
    helper="We will never share your email"
    required
  />
</template>
```

**Props**

| Prop | Type | Default |
|---|---|---|
| `modelValue` | `string` | `""` |
| `type` | `string` | `"text"` |
| `label` | `string` | `""` |
| `placeholder` | `string` | `""` |
| `error` | `string` | `""` |
| `helper` | `string` | `""` |
| `required` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |

**CSS override example**

```css
/* Taller inputs */
.asgardeo-text-field__input {
  padding-top: 12px;
  padding-bottom: 12px;
}
```

---

### Typography

```vue
<template>
  <AsgardeoTypography variant="h2">Welcome back</AsgardeoTypography>
  <AsgardeoTypography variant="body1">
    Sign in to continue to your account.
  </AsgardeoTypography>
  <AsgardeoTypography variant="caption">
    By signing in you agree to our Terms of Service.
  </AsgardeoTypography>
</template>
```

**Props**

| Prop | Type | Default | Values |
|---|---|---|---|
| `variant` | `string` | `"body1"` | `"h1"` `"h2"` `"h3"` `"h4"` `"h5"` `"h6"` `"subtitle1"` `"subtitle2"` `"body1"` `"body2"` `"caption"` `"overline"` |

The component automatically picks the semantic HTML element:
- `h1`–`h6` variants render as `<h1>`–`<h6>`
- `subtitle1`, `subtitle2` render as `<p>`
- `body1`, `body2` render as `<p>`
- `caption`, `overline` render as `<span>`

**CSS override example**

```css
/* Brand-specific heading colour */
.asgardeo-typography--h1,
.asgardeo-typography--h2 {
  color: #121212;
}
```

---

## Customisation Strategies

There are four progressively more targeted ways to change how components look.

### Strategy 1 – Global CSS variable override

Override any `--asgardeo-*` token in your own stylesheet. This is the recommended approach for brand colours, typography, and spacing because a single rule can restyle every component at once.

```css
/* your-app.css */
:root {
  --asgardeo-color-primary-main: #6200ea;
  --asgardeo-color-primary-dark: #3700b3;
  --asgardeo-typography-fontFamily: "Inter", sans-serif;
  --asgardeo-border-radius-medium: 12px;
  --asgardeo-spacing-unit: 9px;
}
```

> **Note**: Your stylesheet must be loaded *after* the SDK injects its defaults (which happens synchronously at `app.use()` call time), or have equal-or-higher specificity. In practice, any stylesheet linked in `index.html` or imported in `main.ts` works correctly.

---

### Strategy 2 – ThemeProvider config prop

Use `ThemeProvider` when you need programmatic theming (dark mode, per-tenant themes, user preferences). It bypasses the cascade entirely by writing to `document.documentElement.style`, which always wins.

```vue
<ThemeProvider :config="theme" :isDark="prefersDark">
  <RouterView />
</ThemeProvider>
```

```ts
const theme = {
  colors: {
    primary: { main: '#6200ea', dark: '#3700b3', contrastText: '#fff' },
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
  },
};
```

---

### Strategy 3 – BEM class targeting

For surgical overrides that can't be expressed as a token change, target the BEM class directly:

```css
/* Make solid-primary buttons use a gradient */
.asgardeo-button--solid.asgardeo-button--primary {
  background: linear-gradient(135deg, #6200ea, #3700b3);
  border-color: transparent;
}

/* Remove the box-shadow focus ring on text fields */
.asgardeo-text-field__input:focus {
  box-shadow: none;
  border-width: 2px;
}

/* Custom OTP digit size */
.asgardeo-otp-field__digit {
  width: 48px;
  height: 48px;
}
```

Because the SDK's selectors are low-specificity (single class), a single class selector in your stylesheet overrides them.

---

### Strategy 4 – `class` and `style` prop passthrough

Every primitive component forwards unknown attributes (including `class` and `style`) to its root element, so you can apply utility classes or inline overrides per-instance:

```vue
<template>
  <!-- Tailwind utility classes work fine -->
  <AsgardeoButton class="mt-4 w-full" variant="solid" color="primary">
    Continue
  </AsgardeoButton>

  <!-- Inline style for a one-off colour -->
  <AsgardeoSpinner :style="{ color: '#e91e63' }" />

  <!-- scoped Vue class binding -->
  <AsgardeoCard class="login-card" variant="elevated">
    <slot />
  </AsgardeoCard>
</template>

<style scoped>
.login-card {
  max-width: 480px;
  margin: 0 auto;
}
</style>
```

---

## Codebase Structure

The styling implementation lives in the following files within `packages/vue/src/`:

```
packages/vue/src/
├── styles/
│   ├── defaults.css.ts        ← :root CSS variable fallbacks
│   ├── animations.css.ts      ← shared @keyframes (asgardeo-spin, asgardeo-spinner-dash)
│   └── injectStyles.ts        ← orchestrator: assembles + injects once
│
└── components/primitives/
    ├── Alert.ts               ← component logic
    ├── Alert.css.ts           ← Alert-specific CSS (BEM rules only)
    ├── Button.ts
    ├── Button.css.ts
    ├── Card.ts
    ├── Card.css.ts
    ├── Checkbox.ts
    ├── Checkbox.css.ts
    ├── DatePicker.ts
    ├── DatePicker.css.ts
    ├── Divider.ts
    ├── Divider.css.ts
    ├── Icons.ts               ← pure SVG helpers; no CSS needed
    ├── Logo.ts
    ├── Logo.css.ts
    ├── OtpField.ts
    ├── OtpField.css.ts
    ├── PasswordField.ts
    ├── PasswordField.css.ts
    ├── Select.ts
    ├── Select.css.ts
    ├── Spinner.ts
    ├── Spinner.css.ts
    ├── TextField.ts
    ├── TextField.css.ts
    ├── Typography.ts
    └── Typography.css.ts
```

**Adding styles for a new component**:
1. Create `MyComponent.css.ts` next to `MyComponent.ts` — export a default CSS string
2. Import it in `styles/injectStyles.ts` and add it to the `STYLES` array
3. Done — no build config changes needed

**Shared animations**:  
Any `@keyframes` used by more than one component must go in `styles/animations.css.ts` to avoid duplicate rule definitions in the injected stylesheet.
