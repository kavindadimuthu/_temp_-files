// import { OrganizationSwitcher, SignInButton, SignOutButton, SubOrganizationHandler, useAsgardeo } from '@asgardeo/react';
import { OrganizationContext, OrganizationSwitcher, SignedIn, SignInButton, SignOutButton, useAsgardeo } from '@asgardeo/react';
// import { AsgardeoProvider } from '@asgardeo/react';
import { useState, useEffect } from 'react';

// Component to display provider details
export function ProviderInfo({
  providername,
  providerid,
  parentInstanceId,
  showActions = true,
}: {
  providername: string;
  providerid: number;
  parentInstanceId?: number;
  showActions?: boolean;
}) {
  const asgardeo = useAsgardeo();
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);

  // Check user sign-in status when component mounts
  useEffect(() => {
    setIsSignedIn(!!asgardeo?.isSignedIn);
    setIsLoading(!!asgardeo?.isLoading);
    setIsInitialized(!!asgardeo?.isInitialized);
  }, [asgardeo]);

  // Fetch access token when user is signed in
  useEffect(() => {
    if (asgardeo?.isSignedIn) {
      asgardeo.getAccessToken().then(token => setAccessToken(token));
      setUserEmail(asgardeo?.user?.email || null);
      setUserUsername(asgardeo?.user?.username || null);
      setOrganizationName(asgardeo?.organization?.name || null);
      setPlatform(asgardeo?.platform || null);
      setBaseUrl(asgardeo?.baseUrl || null);
    }
  }, [asgardeo?.isSignedIn]);


  // refactor to use tailwind classes insetad of inline styles
  return (
    <div className='border-2 border-blue-500 p-4 mb-4 rounded-lg bg-blue-50 h-full'>
      <h3 className='mt-0'> Provider: {providername} </h3>
      <p><strong>Instance ID:</strong> {providerid}</p>
      <p><strong>Initialized:</strong> {isInitialized ? '✅ Yes' : '❌ No'}</p>
      <p><strong>Loading:</strong> {isLoading ? '⏳ Yes' : '✅ No'}</p>
      <p><strong>Signed In:</strong> {isSignedIn ? '✅ Yes' : '❌ No'}</p>
      <p><strong>Parent Instance ID:</strong> {parentInstanceId !== undefined ? parentInstanceId : 'N/A'}</p>

      <div className="mt-3">
        <p><strong>User:</strong> {userUsername || 'N/A'}</p>
        <p><strong>Email:</strong> {userEmail || 'N/A'}</p>
        <p><strong>Organization:</strong> {organizationName || 'N/A'}</p>
        <p><strong>Platform:</strong> {platform || 'N/A'}</p>
        <p><strong>Base URL:</strong> {baseUrl || 'N/A'}</p>
        <p><strong>Access Token:</strong> {accessToken ? accessToken : 'N/A'}</p>
      </div>

      {/* Organization section */}
      <div className="mt-3">
        <OrganizationSwitcher />
      </div>

      {/* Actions section */}
      {showActions && (
        <div className="mt-4">
          {!isSignedIn ? <SignInButton /> : <SignOutButton />}
      </div>
      )}
    </div>
  );
}

export default function DebuggerPage() {

  return (
    <div style={{ padding: "24px" }}>
      <h1>Multi Organization Management Support</h1>
      <p style={{ color: "#666", marginBottom: "24px" }}>
        This page demonstrates the support for multiple Asgardeo providers within the same React application
      </p>

      <div className="flex w-full gap-8 border p-4 rounded-lg">
        {/* <div className="flex-1">
          <AsgardeoProvider
            
            instanceId={2}
            baseUrl={import.meta.env.VITE_ASGARDEO_NESTED_BASE_URL}
            clientId={import.meta.env.VITE_ASGARDEO_NESTED_CLIENT_ID}
            afterSignInUrl={import.meta.env.VITE_ASGARDEO_NESTED_AFTER_SIGN_IN_URL}
            afterSignOutUrl={import.meta.env.VITE_ASGARDEO_NESTED_AFTER_SIGN_OUT_URL}
            // baseUrl={import.meta.env.VITE_ASGARDEO_BASE_URL}
            // clientId={import.meta.env.VITE_ASGARDEO_CLIENT_ID}
            // afterSignInUrl={import.meta.env.VITE_ASGARDEO_AFTER_SIGN_IN_URL}
            // afterSignOutUrl={import.meta.env.VITE_ASGARDEO_AFTER_SIGN_OUT_URL}
            // storage='webWorker'
            preferences={{ theme: { inheritFromBranding: false, } }}
            scopes="openid address email profile user:email read:user internal_organization_create internal_organization_view internal_organization_update internal_organization_delete internal_org_organization_update internal_org_organization_create internal_org_organization_view internal_org_organization_delete"
          >
            <ProviderInfo
              providername="Nested"
              providerid={2}
            />
          </AsgardeoProvider>
        </div> */}

        <div className="flex-1">
          {/* <RootOrgComponent /> */}
          <ProviderInfo
            providername="Primary organization"
            providerid={0}
          />
        </div>

          <SignedIn>
        <div className="flex-1">
          <OrganizationContext
            instanceId={5}
            sourceInstanceId={1}
            targetOrganizationId='a157834a-1794-41e1-9dcd-2d22c1c6fc6a'
          >
            <ProviderInfo
              providername="Organization Context"
              providerid={5}
              parentInstanceId={1}
              showActions={false}
            />
          </OrganizationContext>
        </div>
          </SignedIn>
      </div>
    </div>
  );
}



