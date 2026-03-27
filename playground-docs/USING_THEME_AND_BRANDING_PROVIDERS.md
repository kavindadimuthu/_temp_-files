# Using ThemeProvider and BrandingProvider as a Developer

This guide shows you, as a developer, exactly how to wire up `ThemeProvider` and `BrandingProvider`
in your application code with real, copy-paste-ready examples.

---

## Table of Contents

1. [Using ThemeProvider](#1-using-themeprovider)
   - 1.1 [The simplest setup — via AsgardeoProvider](#11-the-simplest-setup--via-asgardeoprovider)
   - 1.2 [Using ThemeProvider standalone (without AsgardeoProvider)](#12-using-themeprovider-standalone-without-asgardeoprovider)
   - 1.3 [Prop reference](#13-prop-reference)
   - 1.4 [Theme mode options](#14-theme-mode-options)
   - 1.5 [Applying custom theme overrides](#15-applying-custom-theme-overrides)
   - 1.6 [Reading the theme in child components — useTheme()](#16-reading-the-theme-in-child-components--usetheme)
   - 1.7 [Building a dark/light mode toggle](#17-building-a-darklight-mode-toggle)
   - 1.8 [RTL direction support](#18-rtl-direction-support)
2. [Using BrandingProvider](#2-using-brandingprovider)
   - 2.1 [The simplest setup — via AsgardeoProvider](#21-the-simplest-setup--via-asgardeoprovider)
   - 2.2 [Using BrandingProvider standalone](#22-using-brandingprovider-standalone)
   - 2.3 [Prop reference](#23-prop-reference)
   - 2.4 [Reading branding data in child components — useBrandingContext()](#24-reading-branding-data-in-child-components--usebrandingcontext)
   - 2.5 [Rendering an organization logo from branding data](#25-rendering-an-organization-logo-from-branding-data)
   - 2.6 [Forcing a specific theme mode with forceTheme](#26-forcing-a-specific-theme-mode-with-forcetheme)
   - 2.7 [Disabling branding at runtime](#27-disabling-branding-at-runtime)

---

## 1. Using ThemeProvider

### 1.1 The simplest setup — via AsgardeoProvider

The easiest way to enable `ThemeProvider` is through `AsgardeoProvider`.
When you use `AsgardeoProvider`, it automatically wraps your app with both
`BrandingProvider` **and** `ThemeProvider` — you control their behavior through
the `preferences.theme` prop.

```tsx
// main.tsx  or  App.tsx
import { AsgardeoProvider } from '@asgardeo/react';

function App() {
  return (
    <AsgardeoProvider
      baseUrl="https://api.asgardeo.io/t/your-org"
      clientId="your-client-id"
      afterSignInUrl={window.location.origin}
      preferences={{
        theme: {
          mode: 'system',           // follow OS light/dark preference
          inheritFromBranding: true, // pull colors from Asgardeo branding API
        },
      }}
    >
      <YourApp />
    </AsgardeoProvider>
  );
}
```

That is all that is needed for the default case.  Everything inside `<YourApp>`
can now call `useTheme()` to access the resolved theme.

---

### 1.2 Using ThemeProvider standalone (without AsgardeoProvider)

If you need to use `ThemeProvider` without the full Asgardeo auth stack:

```tsx
import { ThemeProvider } from '@asgardeo/react';

function Root() {
  return (
    <ThemeProvider mode="light">
      <YourApp />
    </ThemeProvider>
  );
}
```

> **Important:** `ThemeProvider` internally calls `useAsgardeo()` to determine
> the platform (v1 vs v2). If you use it outside an `AsgardeoProvider` you must
> always wrap it inside one — or use `AsgardeoProvider` directly.

---

### 1.3 Prop reference

| Prop | Type | Default | What it does |
|---|---|---|---|
| `theme` | `RecursivePartial<ThemeConfig>` | `undefined` | Developer-supplied overrides. Highest priority, merged on top of everything. |
| `mode` | `'light' \| 'dark' \| 'system' \| 'class' \| 'branding'` | `'light'` | Controls how the active color scheme is resolved. |
| `inheritFromBranding` | `boolean` | `true` | When `true`, brand colors from `BrandingProvider` are applied to the theme. |
| `detection` | `BrowserThemeDetection` | `{}` | Fine-tunes how `'system'` / `'class'` detection works (e.g. custom CSS class names). |

The same props are also available inside `preferences.theme` when using `AsgardeoProvider`:

| `preferences.theme` key | Maps to `ThemeProvider` prop |
|---|---|
| `mode` | `mode` |
| `inheritFromBranding` | `inheritFromBranding` |
| `overrides` | `theme` |
| `direction` | `theme.direction` |

---

### 1.4 Theme mode options

```tsx
// Always light
<ThemeProvider mode="light">…</ThemeProvider>

// Always dark
<ThemeProvider mode="dark">…</ThemeProvider>

// Follow the operating system's preference (prefers-color-scheme)
<ThemeProvider mode="system">…</ThemeProvider>

// Follow the activeTheme field in the Asgardeo branding configuration
// (requires BrandingProvider + inheritFromBranding={true})
<ThemeProvider mode="branding" inheritFromBranding>…</ThemeProvider>

// Read a CSS class on <html> to decide the scheme
// e.g. <html class="dark"> → dark  |  <html class="light"> → light
<ThemeProvider mode="class" detection={{ darkClass: 'dark', lightClass: 'light' }}>
  …
</ThemeProvider>
```

When you use `AsgardeoProvider` the same options go into `preferences.theme.mode`:

```tsx
<AsgardeoProvider
  preferences={{ theme: { mode: 'system' } }}
  ...
>
```

---

### 1.5 Applying custom theme overrides

`ThemeProvider` accepts a `theme` prop (type `RecursivePartial<ThemeConfig>`) that
lets you override any design token. Partial objects are deep-merged, so you only
need to specify what you want to change.

```tsx
import { ThemeProvider } from '@asgardeo/react';

<ThemeProvider
  mode="system"
  theme={{
    colors: {
      primary: {
        main: '#6944c9',   // custom brand purple
        contrastText: '#ffffff',
      },
      background: {
        surface: '#f5f5f5',
      },
    },
    borderRadius: {
      large: 16,
      medium: 8,
    },
  }}
>
  <YourApp />
</ThemeProvider>
```

Via `AsgardeoProvider`:

```tsx
<AsgardeoProvider
  preferences={{
    theme: {
      mode: 'system',
      overrides: {
        colors: {
          primary: { main: '#6944c9' },
        },
      },
    },
  }}
  ...
>
```

**Precedence order (highest → lowest):**
1. Developer `theme` overrides (your code)
2. Asgardeo branding colors (from `BrandingProvider`)
3. SDK default theme

---

### 1.6 Reading the theme in child components — `useTheme()`

Any component that lives inside `ThemeProvider` can call `useTheme()` to read
the resolved theme values and control the color scheme.

```tsx
import { useTheme } from '@asgardeo/react';

function Navbar() {
  const {
    theme,           // resolved Theme object with all design tokens
    colorScheme,     // 'light' | 'dark'
    direction,       // 'ltr' | 'rtl'
    toggleTheme,     // () => void — toggles between light and dark
    isBrandingLoading, // boolean — true while branding data is still loading
    brandingError,   // Error | null — set if the branding fetch failed
  } = useTheme();

  return (
    <nav
      style={{
        backgroundColor: theme.colors.background.surface,
        color: theme.colors.text.primary,
        borderBottom: `1px solid ${theme.colors.outlined.border}`,
      }}
    >
      <span>Current mode: {colorScheme}</span>
    </nav>
  );
}
```

> `useTheme()` throws an error if called outside a `ThemeProvider`.

---

### 1.7 Building a dark/light mode toggle

```tsx
import { useTheme } from '@asgardeo/react';

function ThemeToggleButton() {
  const { colorScheme, toggleTheme, theme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: theme.colors.primary.main,
        color: theme.colors.primary.contrastText,
        borderRadius: theme.borderRadius.medium,
        padding: '8px 16px',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      Switch to {colorScheme === 'light' ? 'Dark' : 'Light'} mode
    </button>
  );
}
```

---

### 1.8 RTL direction support

Pass `direction: 'rtl'` inside the `theme` override to make the SDK flip the
UI for right-to-left languages such as Arabic or Hebrew.

```tsx
<ThemeProvider
  theme={{ direction: 'rtl' }}
>
  <YourArabicApp />
</ThemeProvider>
```

Or via `AsgardeoProvider`:

```tsx
<AsgardeoProvider
  preferences={{ theme: { direction: 'rtl' } }}
  ...
>
```

`ThemeProvider` automatically sets `document.documentElement.dir` to the chosen
direction so CSS logical properties work without extra configuration.

---

## 2. Using BrandingProvider

### 2.1 The simplest setup — via AsgardeoProvider

`AsgardeoProvider` manages the branding data fetch internally and wires up
`BrandingProvider` automatically. You enable or disable it through
`preferences.theme.inheritFromBranding`:

```tsx
<AsgardeoProvider
  baseUrl="https://api.asgardeo.io/t/your-org"
  clientId="your-client-id"
  preferences={{
    theme: {
      inheritFromBranding: true, // fetch & apply Asgardeo branding — default is true
    },
  }}
>
  <YourApp />
</AsgardeoProvider>
```

Set `inheritFromBranding: false` to completely skip the branding API call.

---

### 2.2 Using BrandingProvider standalone

Use `BrandingProvider` on its own when you want to fetch the branding data
yourself (e.g. from a custom endpoint or cached store) and supply it manually.

```tsx
import { BrandingProvider, ThemeProvider } from '@asgardeo/react';
import { getBrandingPreference } from '@asgardeo/browser';
import { useEffect, useState } from 'react';

function Root() {
  const [brandingPreference, setBrandingPreference] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getBrandingPreference({ baseUrl: 'https://api.asgardeo.io/t/your-org' })
      .then(setBrandingPreference)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <BrandingProvider
      brandingPreference={brandingPreference}
      isLoading={isLoading}
      error={error}
    >
      <ThemeProvider inheritFromBranding mode="branding">
        <YourApp />
      </ThemeProvider>
    </BrandingProvider>
  );
}
```

**Always place `BrandingProvider` as the outer wrapper and `ThemeProvider` inside
it** — so `ThemeProvider` can read the branding data.

---

### 2.3 Prop reference

| Prop | Type | Default | What it does |
|---|---|---|---|
| `brandingPreference` | `BrandingPreference \| null` | `undefined` | The raw branding object fetched from the Asgardeo API. |
| `enabled` | `boolean` | `true` | When `false`, branding is completely ignored (theme/logo data cleared). |
| `isLoading` | `boolean` | `false` | Pass through the loading state from your data fetch. |
| `error` | `Error \| null` | `null` | Pass through any error from your data fetch. |
| `refetch` | `() => Promise<void>` | `undefined` | Callback that triggers a fresh branding data fetch. |
| `forceTheme` | `'light' \| 'dark'` | `undefined` | Ignores the `activeTheme` in the branding response and forces this scheme. |

---

### 2.4 Reading branding data in child components — `useBrandingContext()`

```tsx
import { useBrandingContext } from '@asgardeo/react';

function BrandingDebug() {
  const {
    brandingPreference, // BrandingPreference | null — the full raw API response
    theme,              // Theme | null — transformed, SDK-ready theme object
    activeTheme,        // 'light' | 'dark' | null — scheme from branding config
    isLoading,          // boolean
    error,              // Error | null
    refetch,            // () => Promise<void> — re-fetch branding on demand
  } = useBrandingContext();

  if (isLoading) return <p>Loading branding…</p>;
  if (error) return <p>Branding error: {error.message}</p>;

  return (
    <div>
      <p>Active theme: {activeTheme}</p>
      <p>Primary color: {theme?.colors?.primary?.main}</p>
    </div>
  );
}
```

> `useBrandingContext()` throws an error if called outside a `BrandingProvider`.

---

### 2.5 Rendering an organization logo from branding data

A common use-case is rendering your organization's logo that administrators
configure in the Asgardeo console.

```tsx
import { useBrandingContext } from '@asgardeo/react';

function OrgLogo({ size = 48 }: { size?: number }) {
  const { brandingPreference, isLoading } = useBrandingContext();

  if (isLoading) {
    return <div style={{ width: size, height: size, background: '#e0e0e0', borderRadius: 4 }} />;
  }

  const logoUrl = brandingPreference?.preference?.organizationDetails?.logoUrl;
  const orgName = brandingPreference?.preference?.organizationDetails?.displayName ?? 'Organization';

  if (!logoUrl) return <span>{orgName}</span>;

  return <img src={logoUrl} alt={`${orgName} logo`} height={size} />;
}
```

---

### 2.6 Forcing a specific theme mode with `forceTheme`

Sometimes you want to override what the organization configured. For example,
always render the login page in dark mode regardless of the branding setting:

```tsx
<BrandingProvider
  brandingPreference={brandingPreference}
  forceTheme="dark"   // always dark, ignores branding activeTheme
>
  <ThemeProvider inheritFromBranding>
    <LoginPage />
  </ThemeProvider>
</BrandingProvider>
```

---

### 2.7 Disabling branding at runtime

```tsx
const [brandingEnabled, setBrandingEnabled] = useState(true);

<BrandingProvider
  brandingPreference={brandingPreference}
  enabled={brandingEnabled}
>
  <ThemeProvider inheritFromBranding={brandingEnabled}>
    <App />
  </ThemeProvider>
</BrandingProvider>

// Toggle it off when needed
<button onClick={() => setBrandingEnabled(false)}>
  Use default theme
</button>
```

When `enabled` is `false`, `BrandingProvider` clears the `theme` and
`activeTheme` in context, and `ThemeProvider` falls back to SDK defaults or your
`theme` overrides.

---

## Quick-reference cheat sheet

```
AsgardeoProvider (owns data fetching + auth)
│
├── preferences.theme.inheritFromBranding  → controls BrandingProvider.enabled
├── preferences.theme.mode                 → controls ThemeProvider.mode
├── preferences.theme.overrides            → controls ThemeProvider.theme
└── preferences.theme.direction            → sets RTL/LTR on ThemeProvider

BrandingProvider (data layer — holds raw BrandingPreference)
│  props: brandingPreference, enabled, isLoading, error, refetch, forceTheme
│  hook:  useBrandingContext() → { brandingPreference, theme, activeTheme, isLoading, error, refetch }
│
└── ThemeProvider (design engine — resolves final design tokens)
       props: theme, mode, inheritFromBranding, detection
       hook:  useTheme() → { theme, colorScheme, direction, toggleTheme, isBrandingLoading, brandingError }
```
