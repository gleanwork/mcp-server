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

export function isTokenSuccess(json: any): json is TokenResponse {
  // TODO:: here we go
  return (
    json !== undefined &&
    typeof json === 'object' &&
    json?.token_type == 'Bearer' &&
    'access_token' in json
  );
}

export function isAuthResponse(json: any): json is AuthResponse {
  return (
    json !== undefined &&
    typeof json === 'object' &&
    'device_code' in json &&
    'user_code' in json &&
    'verification_uri' in json &&
    'expires_in' in json &&
    'interval' in json
  );
}
