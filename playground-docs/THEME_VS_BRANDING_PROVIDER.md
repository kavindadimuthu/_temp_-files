# ThemeProvider vs BrandingProvider

## ThemeProvider

### What Is It?

`ThemeProvider` is a React context provider that owns the **visual design system** of your application. It manages colors, typography, border radii, spacing, and light/dark mode switching — all the low-level CSS design tokens that control how every UI component looks.

In this SDK it is the single entry point for theme management. Internally it switches between two implementations depending on the platform:

| Implementation | When it activates | Where it gets theme data |
|---|---|---|
| **v1** (classic) | Default / no `FlowMetaProvider` present | Asgardeo Branding API + developer overrides |
| **v2** (flow meta) | `FlowMetaProvider` is present, or `platform === AsgardeoV2` | `GET /flow/meta` endpoint |

### What Does It Do in a Web Application?

1. **Resolves a final `ThemeConfig`** by merging remote branding data (if `inheritFromBranding` is `true`) with any developer-provided overrides.
2. **Controls light/dark mode.** The active color scheme can be seeded from the server (`branding` mode), locked by the developer (`light` / `dark`), or detected from the OS (`system`).
3. **Applies design tokens to the DOM** so every child component receives the correct CSS variables.
4. **Exposes a `useTheme()` hook** that lets any descendant component read or toggle the current theme.

### Example Usage

```tsx
// Minimal — v1 mode, no branding inheritance
<ThemeProvider>
  <App />
</ThemeProvider>

// With explicit overrides and inherited branding
<BrandingProvider brandingPreference={fetchedPreference}>
  <ThemeProvider
    inheritFromBranding={true}
    mode="light"
    theme={{ colors: { primary: { main: '#6944c9' } } }}
  >
    <App />
  </ThemeProvider>
</BrandingProvider>

// v2 mode — theme sourced from /flow/meta
<FlowMetaProvider config={{ baseUrl, type: FlowMetaType.App, id: appId }}>
  <ThemeProvider>
    <App />
  </ThemeProvider>
</FlowMetaProvider>
```

### Key Props

| Prop | Type | Description |
|---|---|---|
| `theme` | `RecursivePartial<ThemeConfig>` | Developer overrides layered on top of any remote theme |
| `mode` | `'light' \| 'dark' \| 'system' \| 'branding'` | How the active color scheme is resolved |
| `inheritFromBranding` | `boolean` | Whether to pull colors from `BrandingProvider` (v1 only) |
| `detection` | `object` | Fine-tunes OS / media-query detection logic |

---

## BrandingProvider

### What Is It?

`BrandingProvider` is a React context provider that manages **organizational branding preferences** fetched from the Asgardeo Branding API. Branding is business-level identity — the logo, brand color palette, and preferred color scheme that an organization configures in the Asgardeo console.

It transforms the raw API response (`BrandingPreference`) into an internal `Theme` object and makes that data available to the rest of the tree, most importantly to `ThemeProvider`.

### What Does It Do in a Web Application?

1. **Holds the fetched `BrandingPreference`** (logos, color palette, layout preferences) from the Asgardeo API.
2. **Transforms branding data into a `Theme` object** that `ThemeProvider` can consume when `inheritFromBranding` is `true`.
3. **Tracks loading and error state** so consumers can show spinners or error messages.
4. **Exposes a `useBrandingContext()` hook** that gives any descendant component access to the raw branding preference data (for rendering logos, names, etc.).

### Example Usage

```tsx
// Controlled — pass the branding preference you fetched yourself
<BrandingProvider
  brandingPreference={apiFetchedPreference}
  isLoading={isFetching}
  error={fetchError}
  refetch={triggerRefetch}
>
  <ThemeProvider inheritFromBranding>
    <App />
  </ThemeProvider>
</BrandingProvider>

// In a child component — reading branding data directly
function OrgLogo() {
  const { brandingPreference, isLoading } = useBrandingContext();
  if (isLoading) return <Spinner />;
  return <img src={brandingPreference?.preference?.organizationDetails?.logoUrl} />;
}
```

### Key Props

| Prop | Type | Description |
|---|---|---|
| `brandingPreference` | `BrandingPreference` | The raw branding object from the Asgardeo API |
| `enabled` | `boolean` | When `false`, branding is entirely ignored |
| `isLoading` | `boolean` | Pass through the loading state from your data fetch |
| `error` | `Error \| null` | Pass through any fetch error |
| `refetch` | `() => Promise<void>` | Callback to re-trigger the branding data fetch |
| `forceTheme` | `'light' \| 'dark'` | Override which color scheme variant of the branding is applied |

---

## Difference Between ThemeProvider and BrandingProvider

Although they work together, they have fundamentally different **responsibilities**:

| Aspect | ThemeProvider | BrandingProvider |
|---|---|---|
| **Primary concern** | Visual design system (design tokens, color scheme, typography, dark/light mode) | Organizational identity (brand colors, logos, layout settings from Asgardeo console) |
| **Data source** | Developer-supplied overrides + optionally BrandingProvider or `/flow/meta` | Asgardeo Branding API (`BrandingPreference` object) |
| **What it exposes** | Resolved CSS design tokens (`ThemeConfig`), active color scheme, `toggleTheme()` | Raw `BrandingPreference`, extracted `Theme`, loading/error state |
| **Who consumes it** | All UI components that need styling (buttons, inputs, cards…) | Components that need organization-specific assets (logos, org name) AND `ThemeProvider` itself |
| **Layer in the tree** | Inner — sits inside `BrandingProvider` | Outer — wraps `ThemeProvider` so theme can inherit brand colors |
| **Can work independently** | Yes — functions without `BrandingProvider` using developer defaults | Yes — stores branding data, but it only affects theme appearance when `ThemeProvider` reads it |
| **SDK placement** | `packages/react/src/contexts/Theme/` | `packages/react/src/contexts/Branding/` |
| **Hook** | `useTheme()` | `useBrandingContext()` |

### Mental Model

```
AsgardeoProvider
└── BrandingProvider          ← "What does this organisation look like?"
    │   Fetches & holds raw brand data: logo, colors, layout
    │
    └── ThemeProvider         ← "How should every UI component be styled?"
            Reads brand colors (if inheritFromBranding=true)
            Merges with developer overrides
            Resolves final design tokens for the entire component tree
                └── <App />
```

In short:

- **`BrandingProvider`** answers *"What brand identity has this organization configured?"*
- **`ThemeProvider`** answers *"What design tokens should every component use right now?"*

`BrandingProvider` is a **data source**; `ThemeProvider` is a **design system engine**. They are designed to compose — `BrandingProvider` feeds brand colors up to `ThemeProvider`, which then applies them consistently across every UI component in the tree.
