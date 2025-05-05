import {
  getConfig,
  GleanConfig,
  GleanOAuthConfig,
  GleanTokenConfig,
  isBasicConfig,
  isGleanTokenConfig,
} from '../config/config.js';
import open from 'open';
import { debug, error, trace } from '../log/logger.js';
import readline from 'node:readline';
import { loadTokens, saveTokens, Tokens } from './token-store.js';
import {
  AuthResponse,
  isAuthResponse,
  isTokenSuccess,
  TokenError,
  TokenResponse,
} from './types.js';
import { saveOAuthMetadata } from './oauth-cache.js';
import { AuthError } from './error.js';
import { AuthErrorCode } from './error.js';

/**
 * Validate that the configuration can plausibly access the resource.  This
 * means that either a Glean token was provided, or we have enough information
 * to attempt an OAuth flow.
 *
 * If there's no token, OAuth discovery will occur (i.e. requests to OAuth
 * protected resource metadata and OAuth authorization server metadata).
 *
 * If OAuth is configured but no token is present, then the user will be asked
 * to authenticate via the device authorization flow.
 *
 * If OAuth is configured and tokens are already saved, no authorization flow
 * will be attempted.
 *
 * If an authorization token is expired and a refresh token is available,
 * automatic refresh will be attempted.
 *
 * If this returns true, that means we have an access token, but it doesn't
 * guarantee that the token will validate -- it isn't tested
 *
 * This doesn't guarantee that the token will be accepted -- it isn't tested
 * for things like revocation or server rejection due to unaccepted client,
 * OAuth disabled &c..
 */
export async function ensureAuthTokenPresence() {
  trace('validateAccessTokenOrAuth');

  const config = getConfig();
  if (isGleanTokenConfig(config)) {
    return true;
  }

  let tokens = loadTokens();
  if (tokens === null) {
    tokens = await forceAuthorize();
  }

  if (tokens && tokens.isExpired()) {
    debug('Access token expired, attempting refresh');
    await forceRefreshTokens();
    tokens = loadTokens();
  }

  return tokens !== null;
}

/**
 * Go through the device authorization flow.  It's an error to call this with a
 * Glean token config.  With a basic config, will attempt auth discovery (see
 * `discoverOAuthConfig`).
 *
 * Tokens obtained via authorization will be saved with the token store.
 *
 * Returns the tokens obtained from the authorization flow or `null` if no
 * tokens were obtained (e.g. if the user did not authenticate or did not enter
 * the user code).
 */
export async function forceAuthorize() {
  const config = await getConfigAndUpgradeToOAuth();
  if (isGleanTokenConfig(config)) {
    throw new AuthError(
      `Cannot get OAuth access token when using glean-token configuration.  Specify GLEAN_OAUTH_ISSUER and GLEAN_OAUTH_CLIENT_ID and not GLEAN_API_TOKEN to use OAuth.`,
      { code: AuthErrorCode.GleanTokenConfigUsedForOAuth },
    );
  }
  const tokens = await authorize(config);
  if (tokens !== null) {
    saveTokens(tokens);
  }

  return tokens;
}

/**
 * From a basic config, return a `GleanOAuthConfig` if possible.
 *
 * This entails first fetching the OAuth protected resource metadata to obtain:
 *  1. The issuer and
 *  2. The device flow clientId
 *
 * And then fetching the authorization server metadata to obtain:
 *  1. The device authorization endpoint and
 *  2. The token endpoint
 *
 * @returns a complete GleanOAuth config necessary to perform the device
 * authorization flow.
 *
 */
export async function discoverOAuthConfig(): Promise<GleanOAuthConfig> {
  debug('discovering OAuth config');

  const config = getConfig();
  const { issuer, clientId } = await fetchProtectedResourceMetadata(config);

  const { deviceAuthorizationEndpoint, tokenEndpoint } =
    await fetchAuthorizationServerMetadata(issuer);

  const oauthConfig: GleanOAuthConfig = {
    baseUrl: config.baseUrl,
    issuer,
    clientId,
    authorizationEndpoint: deviceAuthorizationEndpoint,
    tokenEndpoint,
    authType: 'oauth',
  };

  debug('OAuth config', oauthConfig);

  return oauthConfig;
}

export async function fetchAuthorizationServerMetadata(
  issuer: string,
): Promise<{ deviceAuthorizationEndpoint: string; tokenEndpoint: string }> {
  const authorizationServerMetadataUrl = `${issuer}/.well-known/oauth-authorization-server`;

  let response;
  try {
    response = await fetch(authorizationServerMetadataUrl);
    trace('GET', authorizationServerMetadataUrl, response.status);
  } catch (cause: any) {
    error(cause);
    throw new AuthError(
      'Unable to fetch OAuth authorization server metadata: please contact your Glean administrator and ensure device flow authorization is configured correctly.',
      { code: AuthErrorCode.AuthServerMetadataNetwork, cause },
    );
  }

  let responseJson;
  try {
    responseJson = (await response.json()) as Record<string, any>;
    trace(responseJson);
  } catch (cause: any) {
    throw new AuthError(
      'Unable to fetch OAuth authorization server metadata: please contact your Glean administrator and ensure device flow authorization is configured correctly.',
      { code: AuthErrorCode.AuthServerMetadataParse, cause },
    );
  }

  const deviceAuthorizationEndpoint =
    responseJson['device_authorization_endpoint'];
  const tokenEndpoint = responseJson['token_endpoint'];

  if (typeof tokenEndpoint !== 'string') {
    throw new AuthError(
      'OAuth authorization server metadata did not include a token endpoint: please contact your Glean administrator and ensure device flow authorization is configured correctly.',
      { code: AuthErrorCode.AuthServerMetadataMissingTokenEndpoint },
    );
  }

  if (typeof deviceAuthorizationEndpoint !== 'string') {
    throw new AuthError(
      'OAuth authorization server metadata did not include a device authorization endpoint: please contact your Glean administrator and ensure device flow authorization is configured correctly.',
      { code: AuthErrorCode.AuthServerMetadataMissingDeviceEndpoint },
    );
  }

  return {
    deviceAuthorizationEndpoint,
    tokenEndpoint,
  };
}

export async function fetchProtectedResourceMetadata(
  config: GleanConfig,
): Promise<{ issuer: string; clientId: string }> {
  const origin = new URL(config.baseUrl).origin;
  const protectedResourceUrl = `${origin}/.well-known/oauth-protected-resource`;

  let response;
  try {
    response = await fetch(protectedResourceUrl);
    trace('GET', protectedResourceUrl, response.status);
  } catch (cause: any) {
    error(cause);
    throw new AuthError(
      'Unable to fetch OAuth protected resource metadata: please contact your Glean administrator and ensure device flow authorization is configured correctly.',
      { code: AuthErrorCode.ProtectedResourceMetadataNetwork, cause },
    );
  }

  if (!response.ok) {
    throw new AuthError(
      'Unable to fetch OAuth protected resource metadata: please contact your Glean administrator and ensure device flow authorization is configured correctly.',
      { code: AuthErrorCode.ProtectedResourceMetadataNotOk },
    );
  }

  let responseJson;
  try {
    responseJson = (await response.json()) as Record<string, any>;
    trace(JSON.stringify(responseJson, null, 2));
  } catch (cause: any) {
    throw new AuthError(
      'Unexpected OAuth protected resource metadata: please contact your Glean administrator and ensure device flow authorization is configured correctly.',
      { code: AuthErrorCode.ProtectedResourceMetadataParse, cause },
    );
  }

  const authServers = responseJson['authorization_servers'];
  const clientId = responseJson['glean_device_flow_client_id'];

  let issuer;
  if (Array.isArray(authServers) && authServers.length > 0) {
    issuer = authServers[0];
  }

  if (typeof issuer !== 'string') {
    throw new AuthError(
      'OAuth protected resource metadata did not include any authorization servers: please contact your Glean administrator and ensure device flow authorization is configured correctly.',
      { code: AuthErrorCode.ProtectedResourceMetadataMissingAuthServers },
    );
  }
  if (typeof clientId !== 'string') {
    throw new AuthError(
      'OAuth protected resource metadata did not include a device flow client id: please contact your Glean administrator and ensure device flow authorization is configured correctly.',
      { code: AuthErrorCode.ProtectedResourceMetadataMissingClientId },
    );
  }

  return {
    issuer,
    clientId,
  };
}

export async function forceRefreshTokens() {
  trace('forceRefreshTokens');

  const config = await getConfigAndUpgradeToOAuth();

  if (isGleanTokenConfig(config)) {
    throw new AuthError(
      `Cannot refresh OAuth access token when using glean-token configuration.  Specify GLEAN_OAUTH_ISSUER and GLEAN_OAUTH_CLIENT_ID and not GLEAN_API_TOKEN to use OAuth.`,
      { code: AuthErrorCode.GleanTokenConfigUsedForOAuthRefresh },
    );
  }

  let tokens = loadTokens();
  if (tokens === null) {
    throw new AuthError(`Cannot refresh: unable to locate refresh token.`, {
      code: AuthErrorCode.RefreshTokenNotFound,
    });
  }

  tokens = await fetchTokenViaRefresh(tokens, config);
  saveTokens(tokens);
}

/**
 * see <https://datatracker.ietf.org/doc/html/rfc6749#section-6>
 */
async function fetchTokenViaRefresh(tokens: Tokens, config: GleanOAuthConfig) {
  const { refreshToken } = tokens;
  if (refreshToken === undefined) {
    throw new AuthError(`Cannot refresh: no refresh token provided.`, {
      code: AuthErrorCode.RefreshTokenMissing,
    });
  }

  trace('Starting refresh flow');

  // see <https://datatracker.ietf.org/doc/html/rfc6749#section-6>
  const url = config.tokenEndpoint;
  const params = new URLSearchParams();
  params.set('client_id', config.clientId);
  params.set('grant_type', 'refresh_token');
  params.set('refresh_token', refreshToken);

  const options: RequestInit = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  };
  trace(options.method ?? 'GET', url, options);

  let response, responseRaw;
  try {
    responseRaw = await fetch(url, options);
    trace(responseRaw.status, responseRaw.statusText);
    response = await responseRaw.json();
  } catch (cause: any) {
    throw new AuthError('Unexpected response fetching access token.', {
      code: AuthErrorCode.UnexpectedAccessTokenResponse,
      cause,
    });
  }

  if (isTokenSuccess(response)) {
    // Uncomment for testing.  This will write tokens to the log.
    trace('/token', response);
    return Tokens.buildFromTokenResponse(response);
  } else {
    const errorResponse = response as TokenError;
    trace('/token', errorResponse?.error);
    throw new AuthError(
      `Unable to fetch token.  Server responded ${responseRaw.status}: ${errorResponse?.error}`,
      { code: AuthErrorCode.FetchTokenServerError, cause: errorResponse },
    );
  }
}

async function authorize(config: GleanOAuthConfig): Promise<Tokens | null> {
  trace('Starting OAuth authorization flow');

  try {
    const authResponse = await fetchDeviceAuthorization(config);
    const tokenPoller = pollForToken(authResponse, config);
    await promptUserAndOpenVerificationPage(authResponse);
    const tokenResponse = await tokenPoller;
    return Tokens.buildFromTokenResponse(tokenResponse);
  } catch (cause: any) {
    if (cause instanceof AuthError) {
      throw cause;
    }
    throw new Error('Unexpected error obtaining authorization token', {
      cause,
    });
  }
}

async function waitForUserEnter() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise<void>((resolve) => {
    rl.once('line', () => {
      rl.close();
      resolve();
    });
  });
}

async function promptUserAndOpenVerificationPage(authResponse: AuthResponse) {
  console.log(`
! First copy your one-time code: ${authResponse.user_code}
Press Enter to log in to Glean.
`);

  await waitForUserEnter();
  await open(authResponse.verification_uri);
}

async function pollForToken(
  authResponse: AuthResponse,
  config: GleanOAuthConfig,
): Promise<TokenResponse> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      // e.g. https://authorization-server/token
      const url = config.tokenEndpoint;
      const params = new URLSearchParams();
      params.set('client_id', config.clientId);
      params.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
      params.set('device_code', authResponse.device_code);

      const options: RequestInit = {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      };
      trace(options.method ?? 'GET', url, options);
      const responseRaw = await fetch(url, options);
      trace(responseRaw.status, responseRaw.statusText);
      const response = await responseRaw.json();

      if (isTokenSuccess(response)) {
        trace('/token', response);
        resolve(response);
      } else {
        const errorResponse = response as TokenError;
        trace('/token', errorResponse?.error);
        if (errorResponse.error == 'authorization_pending') {
          setTimeout(poll, authResponse.interval * 1_000);
        } else {
          reject(
            new AuthError('Unexpected error requesting authorization grant', {
              code: AuthErrorCode.UnexpectedAuthGrantError,
              cause: errorResponse,
            }),
          );
        }
      }
    };

    poll().catch(reject);
  });
}

async function getConfigAndUpgradeToOAuth(): Promise<
  GleanTokenConfig | GleanOAuthConfig
> {
  let config = getConfig();
  if (isBasicConfig(config)) {
    config = await discoverOAuthConfig();
    saveOAuthMetadata(config);
  }

  return config;
}

async function fetchDeviceAuthorization(
  config: GleanOAuthConfig,
): Promise<AuthResponse> {
  const params = new URLSearchParams();
  params.set('client_id', config.clientId);
  params.set('scope', 'openid profile offline_access');

  // e.g. https://some-authorization-server/authorize
  const url = config.authorizationEndpoint;
  const options: RequestInit = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  };

  trace(options.method ?? 'GET', url, options);

  const response = await fetch(url, options);
  const responseJson = await response.json();

  if (!isAuthResponse(responseJson)) {
    throw [response, responseJson];
  }

  return responseJson;
}
