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

/**
 * Encodes a plain `<AuthenticatorName>:<IdPName>` string into the base64url format
 * used by the Asgardeo / WSO2 IS Native Authentication API as `authenticatorId`.
 */
const toAuthenticatorId = (value: string): string =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

/**
 * Constants representing Application Native Authentication related configurations and constants.
 *
 * The `SupportedAuthenticators` values are the base64url-encoded `authenticatorId` strings
 * returned by the Asgardeo Native Authentication API (format: `AuthenticatorName:IdPName`).
 * They are computed at module load time from their human-readable source strings so that
 * the source and compiled artifacts do not contain opaque hard-coded base64 literals.
 */
const ApplicationNativeAuthenticationConstants: {
  readonly SupportedAuthenticators: {
    readonly EmailOtp: string;
    readonly Facebook: string;
    readonly GitHub: string;
    readonly Google: string;
    readonly IdentifierFirst: string;
    readonly LinkedIn: string;
    readonly MagicLink: string;
    readonly Microsoft: string;
    readonly Passkey: string;
    readonly PushNotification: string;
    readonly SignInWithEthereum: string;
    readonly SmsOtp: string;
    readonly Totp: string;
    readonly UsernamePassword: string;
  };
} = {
  SupportedAuthenticators: {
    EmailOtp: toAuthenticatorId('email-otp-authenticator:LOCAL'),
    Facebook: toAuthenticatorId('FacebookAuthenticator:Facebook'),
    GitHub: toAuthenticatorId('GithubAuthenticator:GitHub'),
    Google: toAuthenticatorId('GoogleOIDCAuthenticator:Google'),
    IdentifierFirst: toAuthenticatorId('IdentifierExecutor:LOCAL'),
    LinkedIn: toAuthenticatorId('LinkedInOIDC:LinkedIn'),
    MagicLink: toAuthenticatorId('MagicLinkAuthenticator:LOCAL'),
    Microsoft: toAuthenticatorId('OpenIDConnectAuthenticator:Microsoft'),
    Passkey: toAuthenticatorId('FIDOAuthenticator:LOCAL'),
    PushNotification: toAuthenticatorId('push-notification-authenticator:LOCAL'),
    SignInWithEthereum: toAuthenticatorId('OpenIDConnectAuthenticator:Sign In With Ethereum'),
    SmsOtp: toAuthenticatorId('sms-otp-authenticator:LOCAL'),
    Totp: toAuthenticatorId('totp:LOCAL'),
    UsernamePassword: toAuthenticatorId('BasicAuthenticator:LOCAL'),
  },
} as const;

export default ApplicationNativeAuthenticationConstants;
