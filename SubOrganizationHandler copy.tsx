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

import { FC, PropsWithChildren, useState, useCallback, useRef } from 'react';
import { Organization, TokenResponse } from '@asgardeo/browser';
import AsgardeoProvider, { AsgardeoProviderProps } from '../../contexts/Asgardeo/AsgardeoProvider';

interface SubOrganizationHandlerProps extends Omit<AsgardeoProviderProps, 'organizationChain'> {
  /**
   * ID of the sub-organization to switch to
   */
  organizationId: string;
  
  /**
   * Instance ID of the parent organization provider
   */
  switchFromInstanceId: number;
  
  /**
   * Optional callback when organization switch completes
   */
  onSwitchComplete?: (response: TokenResponse | Response) => void;
  
  /**
   * Optional callback when organization switch fails
   */
  onSwitchError?: (error: Error) => void;
}

const SubOrganizationHandler: FC<PropsWithChildren<SubOrganizationHandlerProps>> = ({
  instanceId,
  baseUrl,
  clientId,
  afterSignInUrl,
  afterSignOutUrl,
  organizationId,
  switchFromInstanceId,
  scopes,
  children,
  onSwitchComplete,
  onSwitchError,
  ...rest
}) => {
  const [isSwitching, setIsSwitching] = useState(false);
  const hasSwitchedRef = useRef(false);

  /**
   * Extension hook: Called after provider initialization
   * This is where we handle the automatic sub-org login
   */
  const handleInitialized = useCallback(async ({
    isSignedIn,
    config,
  }: {
    isSignedIn: boolean;
    config: any;
  }) => {
    // Prevent multiple switch attempts
    if (hasSwitchedRef.current || isSwitching) {
      return;
    }

    // Only proceed if user is not already signed in to this instance
    if (isSignedIn) {
      return;
    }

    try {
      setIsSwitching(true);
      hasSwitchedRef.current = true;

      // Get parent organization's session data
      const parentInstanceKey = `instance_${switchFromInstanceId}-${clientId}`;
      console.log(`Attempting sub-organization switch. Retrieving session for parent instance ${switchFromInstanceId} with key ${parentInstanceKey}`);
      const parentSessionData = sessionStorage.getItem(`session_data-${parentInstanceKey}`);
      if (!parentSessionData) {
        console.error(`No session data found for parent instance ${switchFromInstanceId}. Ensure the parent organization is authenticated before attempting sub-org login.`);
      } else {
        console.log(`Parent session data retrieved for instance ${switchFromInstanceId}:`, JSON.parse(parentSessionData));
      }

      if (!parentSessionData) {
        throw new Error(
          `No session data found for parent instance ${switchFromInstanceId}. ` +
          'Ensure the parent organization is authenticated before attempting sub-org login.'
        );
      }

      const parsedParentSession = JSON.parse(parentSessionData);
      
      if (!parsedParentSession.access_token) {
        throw new Error('Parent organization session does not contain a valid access token.');
      }

      // Build the organization object for switching
      const switchToOrganization: Organization = {
        id: organizationId,
        name: '', // Name will be populated after switch
        orgHandle: '', // Will be populated after switch
      };

      // Call the switchOrganization API through the extension context
      // This requires exposing switchOrganization through context or props
      // For now, we'll use the global asgardeo instance
      const AsgardeoReactClient = (await import('../../AsgardeoReactClient')).default;
      const asgardeoClient = new AsgardeoReactClient(instanceId);
      
      const response = await asgardeoClient.switchOrganization(
        switchToOrganization,
        false // Don't require new sign-in since we're using parent's token
      );

      // Notify success
      if (onSwitchComplete) {
        onSwitchComplete(response);
      }

    } catch (error) {
      console.error('Sub-organization auto-login failed:', error);
      
      if (onSwitchError) {
        onSwitchError(error instanceof Error ? error : new Error(String(error)));
      }
      
      // Reset the flag to allow retry
      hasSwitchedRef.current = false;
    } finally {
      setIsSwitching(false);
    }
  }, [instanceId, organizationId, switchFromInstanceId, clientId, isSwitching, onSwitchComplete, onSwitchError]);

  /**
   * Extension hook: Prevent default sign-in behavior
   * We want to handle sign-in through organization switch instead
   */
  const handleBeforeSignIn = useCallback((): boolean => {
    // If we're currently switching or have already switched, prevent default sign-in
    if (isSwitching || hasSwitchedRef.current) {
      return false;
    }
    
    // Allow default sign-in if we haven't initiated a switch yet
    return true;
  }, [isSwitching]);

  return (
    <AsgardeoProvider
      instanceId={instanceId}
      baseUrl={baseUrl}
      clientId={clientId}
      afterSignInUrl={afterSignInUrl}
      afterSignOutUrl={afterSignOutUrl}
      scopes={scopes}
      extensions={{
        onInitialized: handleInitialized,
        beforeSignIn: handleBeforeSignIn,
      }}
      organizationChain={{
        sourceInstanceId: switchFromInstanceId,
        targetOrganizationId: organizationId,
      }}
      {...rest}
    >
      {children}
    </AsgardeoProvider>
  );
};

export default SubOrganizationHandler;