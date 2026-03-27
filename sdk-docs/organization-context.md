The `OrganizationContext` component creates a nested authentication context scoped to a specific organization. It automatically handles the token exchange required to authenticate with a child organization, using the sign-in session of the nearest parent `AsgardeoProvider` as the source identity.

## Overview

In multi-organization applications, users may need to interact with resources in a child organization while signed in to a parent organization. The `OrganizationContext` component sets up an independent Asgardeo provider instance for the target organization, performs the organization token exchange silently in the background, and makes the resulting session available to its children through the standard `useAsgardeo` hook.

Each `OrganizationContext` instance must have a unique `instanceId` that identifies it within the application. You can nest multiple `OrganizationContext` components to traverse an organization hierarchy.

## Usage

Wrap the content that requires access to the child organization's session inside `OrganizationContext`. The parent context must have an active sign-in session before the organization token exchange can proceed.

### Basic usage

Grant access to a specific organization's context:

```javascript title="OrganizationContext basic usage"
import { AsgardeoProvider, OrganizationContext, SignedIn } from '@asgardeo/react';

const App = () => {
  return (
    <AsgardeoProvider
      clientId="<client_id>"
      baseUrl="https://api.asgardeo.io/t/<root_org>"
    >
      <SignedIn>
        <OrganizationContext
          instanceId={1}
          targetOrganizationId="<child_org_id>"
          clientId="<child_app_client_id>"
        >
          <ChildOrgDashboard />
        </OrganizationContext>
      </SignedIn>
    </AsgardeoProvider>
  );
};
```

!!! info "Note"

    The token exchange starts only after the parent provider has an active sign-in session. Wrap the `OrganizationContext` inside a `SignedIn` component or check `isSignedIn` before rendering it.

### Using a custom base URL

By default, `OrganizationContext` uses the parent provider's `baseUrl`. Override this when the child organization resides on a different base URL:

```javascript title="Custom base URL"
<OrganizationContext
  instanceId={1}
  targetOrganizationId="<child_org_id>"
  clientId="<child_app_client_id>"
  baseUrl="https://api.asgardeo.io/t/<child_org>"
>
  <ChildOrgDashboard />
</OrganizationContext>
```

### Nested organization contexts

Chain multiple `OrganizationContext` components to traverse deeper into an organization hierarchy. Each level must have a unique `instanceId`:

```javascript title="Nested organization contexts"
<AsgardeoProvider
  clientId="<client_id>"
  baseUrl="https://api.asgardeo.io/t/<root_org>"
>
  <OrganizationContext
    instanceId={1}
    targetOrganizationId="<child_org_id>"
    clientId="<child_app_client_id>"
  >
    <OrganizationContext
      instanceId={2}
      targetOrganizationId="<grandchild_org_id>"
      clientId="<grandchild_app_client_id>"
    >
      <GrandchildOrgDashboard />
    </OrganizationContext>
  </OrganizationContext>
</AsgardeoProvider>
```

### Specifying a source instance

By default, `OrganizationContext` uses the nearest parent provider as the token exchange source. Use `sourceInstanceId` to explicitly specify a different source instance when the component tree does not reflect the authentication chain:

```javascript title="Custom source instance"
<OrganizationContext
  instanceId={2}
  sourceInstanceId={1}
  targetOrganizationId="<child_org_id>"
  clientId="<child_app_client_id>"
>
  <ChildOrgDashboard />
</OrganizationContext>
```

### Accessing the organization session

Inside `OrganizationContext`, use the `useAsgardeo` hook to access the child organization's authentication state:

```javascript title="Accessing child org session"
import { useAsgardeo } from '@asgardeo/react';

const ChildOrgDashboard = () => {
  const { isSignedIn, user, getAccessToken } = useAsgardeo();

  if (!isSignedIn) {
    return <p>Authenticating with organization...</p>;
  }

  return <p>Signed in as {user?.username} in child organization</p>;
};
```

## Props

| Prop                  | Type        | Required | Description                                                                                                      |
|-----------------------|-------------|----------|------------------------------------------------------------------------------------------------------------------|
| `instanceId`          | `number`    | ✅       | A unique identifier for this provider instance. Must be unique across the application when multiple contexts exist. |
| `targetOrganizationId`| `string`    | ✅       | The ID of the organization to authenticate with.                                                                 |
| `children`            | `ReactNode` | ✅       | Content to render within the organization's authentication context.                                              |
| `clientId`            | `string`    | ❌       | The OAuth2 client ID for the child organization's application. Defaults to the parent provider's `clientId`.    |
| `baseUrl`             | `string`    | ❌       | The base URL for the child organization. Defaults to the parent provider's `baseUrl`.                           |
| `sourceInstanceId`    | `number`    | ❌       | The `instanceId` of the provider to use as the token exchange source. Defaults to the nearest parent provider.  |
| `afterSignInUrl`      | `string`    | ❌       | The URL to redirect to after sign-in. Inherited from the parent provider if not specified.                       |
| `afterSignOutUrl`     | `string`    | ❌       | The URL to redirect to after sign-out. Inherited from the parent provider if not specified.                      |
| `scopes`              | `string[]`  | ❌       | The OAuth2 scopes to request for the organization session.                                                       |

## Notes

- The `instanceId` must be unique across all `AsgardeoProvider` and `OrganizationContext` instances in the application.
- The parent provider must have an active sign-in session before the organization token exchange can start. Rendering `OrganizationContext` before sign-in has no effect.
- The token exchange runs automatically and silently as soon as the parent session becomes available.
- This component only supports browser-based React applications (Client-Side Rendering).
- Children inside `OrganizationContext` read from the child organization's session, not the parent's. Use `SignedIn` inside the context to guard content until the child session is ready.
