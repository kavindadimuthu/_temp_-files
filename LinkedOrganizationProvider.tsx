/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FC, PropsWithChildren, useEffect, useRef, useCallback } from 'react';
import { Organization, TokenResponse } from '@asgardeo/browser';
import AsgardeoProvider, { AsgardeoProviderProps } from '../../contexts/Asgardeo/AsgardeoProvider';
import useAsgardeo from '../../contexts/Asgardeo/useAsgardeo';

interface LinkedOrganizationProviderProps extends Omit<AsgardeoProviderProps, 'organizationChain'> {
  /**
   * ID of the organization to authenticate with
   */
  targetOrganizationId: string;
  
  /**
   * Instance ID of the source organization provider to chain from
   */
  sourceInstanceId: number;
  
  /**
   * Callback when organization authentication completes successfully
   */
  onAuthComplete?: (response: TokenResponse | Response) => void;
  
  /**
   * Callback when organization authentication fails
   */
  onAuthError?: (error: Error) => void;
}

interface LinkedOrganizationControllerProps {
  /**
   * ID of the organization to authenticate with
   */
  targetOrganizationId: string;
  
  /**
   * Callback when organization authentication completes successfully
   */
  onAuthComplete?: (response: TokenResponse | Response) => void;
  
  /**
   * Callback when organization authentication fails
   */
  onAuthError?: (error: Error) => void;
  
  /**
   * Children to render
   */
  children: React.ReactNode;
}

/**
 * Inner controller component that handles organization switch using the Asgardeo context.
 * This component uses the `useAsgardeo` hook to access `switchOrganization` from the provider context,
 * avoiding the need to create multiple client instances.
 */
const LinkedOrganizationController: FC<LinkedOrganizationControllerProps> = ({
  targetOrganizationId,
  onAuthComplete,
  onAuthError,
  children,
}) => {
  const { isInitialized, isSignedIn, switchOrganization, isLoading } = useAsgardeo();
  const hasAuthenticatedRef = useRef(false);
  const isAuthenticatingRef = useRef(false);

  /**
   * Handle the organization switch when the provider is initialized and user is not signed in.
   * Uses the `switchOrganization` function from the Asgardeo context.
   */
  useEffect(() => {
    const performOrganizationSwitch = async () => {
      // Prevent multiple authentication attempts
      if (hasAuthenticatedRef.current || isAuthenticatingRef.current) {
        return;
      }

      // Wait for initialization to complete
      if (!isInitialized || isLoading) {
        return;
      }

      // Only proceed if user is not already signed in to this instance
      if (isSignedIn) {
        hasAuthenticatedRef.current = true;
        return;
      }

      try {
        isAuthenticatingRef.current = true;
        hasAuthenticatedRef.current = true;

        // Build the organization object for authentication
        const targetOrganization: Organization = {
          id: targetOrganizationId,
          name: '', // Name will be populated after authentication
          orgHandle: '', // Will be populated after authentication
        };

        // Call the switchOrganization API from context (handles token exchange)
        const response = await switchOrganization(targetOrganization);

        // Notify success
        if (onAuthComplete) {
          onAuthComplete(response);
        }
      } catch (error) {
        console.error('Linked organization authentication failed:', error);
        
        if (onAuthError) {
          onAuthError(error instanceof Error ? error : new Error(String(error)));
        }
        
        // Reset the flag to allow retry
        hasAuthenticatedRef.current = false;
      } finally {
        isAuthenticatingRef.current = false;
      }
    };

    performOrganizationSwitch();
  }, [isInitialized, isSignedIn, isLoading, targetOrganizationId, switchOrganization, onAuthComplete, onAuthError]);

  return <>{children}</>;
};

/**
 * Provider for authenticating users in a linked organization context.
 * 
 * This component enables authentication delegation where a user authenticated
 * in one organization (source) can be automatically authenticated in another
 * organization (target) using token exchange.
 * 
 * The component follows an extension-based approach:
 * - Uses `AsgardeoProvider` with `organizationChain` configuration
 * - Uses `LinkedOrganizationController` as an inner component to handle the organization switch
 * - The controller accesses `switchOrganization` from the Asgardeo context, avoiding multiple client instances
 * 
 * @example
 * ```tsx
 * // Primary organization provider
 * <AsgardeoProvider instanceId={0} {...primaryConfig}>
 *   <App />
 * </AsgardeoProvider>
 * 
 * // Linked organization provider
 * <LinkedOrganizationProvider
 *   instanceId={1}
 *   sourceInstanceId={0}
 *   targetOrganizationId="linked-org-123"
 *   {...linkedConfig}
 * >
 *   <LinkedOrgApp />
 * </LinkedOrganizationProvider>
 * ```
 */
const LinkedOrganizationProvider: FC<PropsWithChildren<LinkedOrganizationProviderProps>> = ({
  instanceId,
  baseUrl,
  clientId,
  afterSignInUrl,
  afterSignOutUrl,
  targetOrganizationId,
  sourceInstanceId,
  scopes,
  children,
  onAuthComplete,
  onAuthError,
  extensions,
  ...rest
}) => {
  /**
   * Extension hook: Prevent default sign-in behavior during organization switch.
   * We want to handle authentication through organization chain instead.
   */
  const handleBeforeSignIn = useCallback((): boolean => {
    // Allow the provider's default sign-in behavior
    // The LinkedOrganizationController will handle organization-specific authentication
    return true;
  }, []);

  /**
   * Merge user-provided extensions with the built-in beforeSignIn handler.
   * User-provided extensions take precedence.
   */
  const mergedExtensions = {
    beforeSignIn: extensions?.beforeSignIn ?? handleBeforeSignIn,
    onInitialized: extensions?.onInitialized,
    onSignInSuccess: extensions?.onSignInSuccess,
    onSessionUpdate: extensions?.onSessionUpdate,
  };

  return (
    <AsgardeoProvider
      instanceId={instanceId}
      baseUrl={baseUrl}
      clientId={clientId}
      afterSignInUrl={afterSignInUrl}
      afterSignOutUrl={afterSignOutUrl}
      scopes={scopes}
      extensions={mergedExtensions}
      organizationChain={{
        sourceInstanceId: sourceInstanceId,
        targetOrganizationId: targetOrganizationId,
      }}
      {...rest}
    >
      <LinkedOrganizationController
        targetOrganizationId={targetOrganizationId}
        onAuthComplete={onAuthComplete}
        onAuthError={onAuthError}
      >
        {children}
      </LinkedOrganizationController>
    </AsgardeoProvider>
  );
};

export default LinkedOrganizationProvider;
