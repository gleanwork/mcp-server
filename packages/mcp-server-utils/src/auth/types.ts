export interface TokenError {
  error: string;
  error_description: string;
}

export interface TokenResponse {
  token_type: 'Bearer';
  access_token: string;
  scope?: string;
  /**
   * Seconds after which the access token expires and a new one is needed using
   * the one-time refresh token.
   */
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
}

export interface AuthResponse {
  /**
   * Grant code we'll exchange for an access token
   */
  device_code: string;
  /**
   * Code user has to enter at `verification_uri`
   */
  user_code: string;
  /**
   * Where the user has to navigate to on a browser to enter `user_code`.
   */
  verification_uri: string;
  /**
   * TTL of `device_code`
   */
  expires_in: number;
  /**
   * How long we should wait between polls.
   */
  interval: number;
}

export type AuthResponseWithURL = Omit<AuthResponse, 'verification_uri'> & {
  verification_url: string;
};

export function isTokenSuccess(json: any): json is TokenResponse {
  return (
    json !== undefined &&
    typeof json === 'object' &&
    json?.token_type == 'Bearer' &&
    'access_token' in json
  );
}

export function isAuthResponse(json: any): json is AuthResponse {
  return hasCommonAuthResponseFields(json) && 'verification_uri' in json;
}
export function isAuthResponseWithURL(json: any): json is AuthResponseWithURL {
  return hasCommonAuthResponseFields(json) && 'verification_url' in json;
}

function hasCommonAuthResponseFields(json: any): boolean {
  return (
    json !== undefined &&
    typeof json === 'object' &&
    'device_code' in json &&
    'user_code' in json &&
    'expires_in' in json &&
    'interval' in json
  );
}

// https://github.com/gleanwork/typescript-sdk/blob/0fcb3efd3405a2d96af549ba5b6490fd9ffbb292/src/shared/auth.ts#L106-L111
export interface McpRemoteClientInfo {
  client_id: string;
  client_secret?: string;
  redirect_uris: string[];
}

// https://github.com/gleanwork/typescript-sdk/blob/0fcb3efd3405a2d96af549ba5b6490fd9ffbb292/src/shared/auth.ts#L62-L70
export interface McpRemoteTokens {
  access_token: string;
  token_type: string;
  expires_in?: number | undefined;
  scope?: string | undefined;
  refresh_token?: string | undefined;
}
