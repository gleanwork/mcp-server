export enum AuthErrorCode {
  /** Unknown error */
  Unknown = 'ERR_A_00',
  /** Using glean-token config for OAuth flow */
  GleanTokenConfigUsedForOAuth = 'ERR_A_01',
  /** Network error fetching OAuth authorization server metadata */
  AuthServerMetadataNetwork = 'ERR_A_02',
  /** Parse error in OAuth authorization server metadata */
  AuthServerMetadataParse = 'ERR_A_03',
  /** Token endpoint missing in OAuth server metadata */
  AuthServerMetadataMissingTokenEndpoint = 'ERR_A_04',
  /** Device authorization endpoint missing in OAuth server metadata */
  AuthServerMetadataMissingDeviceEndpoint = 'ERR_A_05',
  /** Network error fetching OAuth protected resource metadata */
  ProtectedResourceMetadataNetwork = 'ERR_A_06',
  /** Non-ok response fetching OAuth protected resource metadata */
  ProtectedResourceMetadataNotOk = 'ERR_A_07',
  /** Parse error in OAuth protected resource metadata */
  ProtectedResourceMetadataParse = 'ERR_A_08',
  /** Authorization servers missing in OAuth protected resource metadata */
  ProtectedResourceMetadataMissingAuthServers = 'ERR_A_09',
  /** Device flow client id missing in OAuth protected resource metadata */
  ProtectedResourceMetadataMissingClientId = 'ERR_A_10',
  /** Tried to refresh tokens with glean-token config */
  GleanTokenConfigUsedForOAuthRefresh = 'ERR_A_11',
  /** No saved refresh token found */
  RefreshTokenNotFound = 'ERR_A_12',
  /** Refresh token property missing */
  RefreshTokenMissing = 'ERR_A_13',
  /** Unexpected response fetching access token */
  UnexpectedAccessTokenResponse = 'ERR_A_14',
  /** Server error when fetching token */
  FetchTokenServerError = 'ERR_A_15',
  /** Unexpected error requesting authorization grant */
  UnexpectedAuthGrantError = 'ERR_A_16',
  /** Timed out waiting for OAuth device flow polling */
  OAuthPollingTimeout = 'ERR_A_17',
  /** No interactive terminal for OAuth device authorization flow */
  NoInteractiveTerminal = 'ERR_A_18',
  /** Invalid or missing Glean configuration */
  InvalidConfig = 'ERR_A_19',
  /** Unexpected response fetching access token */
  UnexpectedAuthGrantResponse = 'ERR_A_20',
  /** Missing OAuth metadata required for MCP remote setup */
  MissingOAuthMetadata = 'ERR_A_21',
  /** Missing OAuth tokens required for MCP remote setup */
  MissingOAuthTokens = 'ERR_A_22',
}

/**
 * AuthError is an error that will be shown to the end user (with a message, no
 * stack trace).
 *
 * If AuthError is caught it should be re-thrown directly.
 */
export class AuthError extends Error {
  public code: AuthErrorCode;

  constructor(
    message: string,
    options: { code?: AuthErrorCode; cause?: unknown } = {},
  ) {
    const code = options.code ?? AuthErrorCode.Unknown;
    const { cause } = options;
    super(`${code}: ${message}`, cause !== undefined ? { cause } : undefined);
    this.code = code;
    this.name = 'AuthError';
    Error.captureStackTrace(this, this.constructor);
  }
}
