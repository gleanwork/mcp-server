import {
  getConfig,
  GleanConfig,
  GleanOAuthConfig,
  GleanTokenConfig,
  isBasicConfig,
  isGleanTokenConfig,
  isOAuthConfig,
} from '../config/config.js';
import open from 'open';
import { debug, error, trace } from '../log/logger.js';
import readline from 'node:readline';
import { loadTokens, saveTokens, Tokens } from './token-store.js';
import {
  AuthResponse,
  isAuthResponse,
  isAuthResponseWithURL,
  isTokenSuccess,
  TokenError,
  TokenResponse,
} from './types.js';
import { saveOAuthMetadata } from './oauth-cache.js';
import { AuthError } from './error.js';
import { AuthErrorCode } from './error.js';
import { parse as parseDomain } from 'tldts';

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
  if (isGleanTokenConfig(config)) {
    throw new AuthError(
      '[internal error] attempting OAuth flow with a Glean-issued non-OAuth token',
      { code: AuthErrorCode.InvalidConfig },
    );
  } else if (isOAuthConfig(config)) {
    return config;
  }

  let { issuer, clientId, clientSecret } = config;
  if (typeof issuer !== 'string' || typeof clientId !== 'string') {
    trace('request protected resource metadata');
    const resourceMetadata = await fetchProtectedResourceMetadata(config);
    issuer = resourceMetadata.issuer;
    clientId = resourceMetadata.clientId;
    clientSecret = resourceMetadata?.clientSecret;
  } else {
    trace('using environment variables for issuer and client id');
  }

  const { deviceAuthorizationEndpoint, tokenEndpoint } =
    await fetchAuthorizationServerMetadata(issuer);

  const oauthConfig: GleanOAuthConfig = {
    baseUrl: config.baseUrl,
    issuer,
    clientId,
    clientSecret,
    authorizationEndpoint: deviceAuthorizationEndpoint,
    tokenEndpoint,
    authType: 'oauth',
  };

  debug('OAuth config', oauthConfig);

  return oauthConfig;
}

function failAuthorizationServerMetadataFetch(cause: any): never {
  throw new AuthError(
    'Unable to fetch OAuth authorization server metadata: please contact your Glean administrator and ensure device flow authorization is configured correctly.',
    { code: AuthErrorCode.AuthServerMetadataNetwork, cause },
  );
}

async function fetchOpenIdConfiguration(issuer: string): Promise<Response> {
  const url = `${issuer}/.well-known/openid-configuration`;
  let response;
  try {
    response = await fetch(url);
    trace('GET', url, response.status);
  } catch (cause: any) {
    error(cause);
    failAuthorizationServerMetadataFetch(cause);
  }
  if (!response.ok) {
    failAuthorizationServerMetadataFetch(undefined);
  }
  return response;
}

async function fetchOauthAuthorizationServerConfig(
  issuer: string,
): Promise<Response> {
  const url = `${issuer}/.well-known/oauth-authorization-server`;
  let response;
  try {
    response = await fetch(url);
    trace('GET', url, response.status);
  } catch (cause: any) {
    error(cause);
    failAuthorizationServerMetadataFetch(cause);
  }
  if (!response.ok) {
    failAuthorizationServerMetadataFetch(undefined);
  }
  return response;
}

export async function fetchAuthorizationServerMetadata(
  issuer: string,
): Promise<{ deviceAuthorizationEndpoint: string; tokenEndpoint: string }> {
  let response;
  try {
    response = await fetchOpenIdConfiguration(issuer);
  } catch (cause: any) {
    trace(
      'Falling back to',
      `${issuer}/.well-known/oauth-authorization-server`,
      cause,
    );
    response = await fetchOauthAuthorizationServerConfig(issuer);
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

interface ProtectedResourceMetadata {
  issuer: string;
  clientId: string;
  clientSecret?: string;
}
export async function fetchProtectedResourceMetadata(
  config: GleanConfig,
): Promise<ProtectedResourceMetadata> {
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
  const clientSecret = responseJson['glean_device_flow_client_sec'];

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

  const result: ProtectedResourceMetadata = {
    issuer,
    clientId,
  };

  if (clientSecret !== undefined) {
    result.clientSecret = clientSecret;
  }

  return result;
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
  if (typeof config.clientSecret === 'string') {
    // These "secrets" are obviously not secure since public OAuth clients by
    // definition cannot keep secrets.
    //
    // However, some OAuth providers insist on generating and requiring client
    // secrets even for public OAuth clients.
    params.set('client_secret', config.clientSecret);
  }
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

  if (!process.stdin.isTTY) {
    throw new AuthError(
      'OAuth device authorization flow requires an interactive terminal.',
      { code: AuthErrorCode.NoInteractiveTerminal },
    );
  }

  let cause: any = undefined;
  try {
    const authResponse = await fetchDeviceAuthorization(config);
    const tokenPoller = pollForToken(authResponse, config).catch((e) => {
      cause = e;
    });
    await promptUserAndOpenVerificationPage(authResponse);
    const tokenResponse = await tokenPoller;
    if (cause !== undefined) {
      throw cause;
    }
    return Tokens.buildFromTokenResponse(tokenResponse as TokenResponse);
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
Authorizing Glean MCP-server.  Please log in to Glean.

! First copy your one-time code: ${authResponse.user_code}

Press Enter continue.
`);

  await waitForUserEnter();
  await open(authResponse.verification_uri);
}

async function pollForToken(
  authResponse: AuthResponse,
  config: GleanOAuthConfig,
): Promise<TokenResponse> {
  return new Promise((resolve, reject) => {
    const timeoutMs = 10 * 60 * 1000; // 10 minutes
    const startTime = Date.now();

    const poll = async () => {
      const now = Date.now();
      if (now - startTime >= timeoutMs) {
        reject(
          new AuthError(
            'OAuth device flow timed out after 10 minutes. Please try again.',
            { code: AuthErrorCode.OAuthPollingTimeout },
          ),
        );
        return;
      }
      // e.g. https://authorization-server/token
      const url = config.tokenEndpoint;
      const params = new URLSearchParams();
      params.set('client_id', config.clientId);
      if (typeof config.clientSecret === 'string') {
        // These "secrets" are obviously not secure since public OAuth clients by
        // definition cannot keep secrets.
        //
        // However, some OAuth providers insist on generating and requiring client
        // secrets even for public OAuth clients.
        params.set('client_secret', config.clientSecret);
      }
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

/**
 * Returns the OAuth scopes we need for the issuer.
 *
 * This will always include "openid profile" but some providers may need other
 * scopes to make the user email available.  We require the user email for the
 * token to be valid.
 */
export function getOAuthScopes(config: GleanOAuthConfig): string {
  const { issuer: issuer } = config;
  const domain = parseDomain(issuer).domain ?? '';

  trace(`computing scopes for issuer: '${issuer}', domain: '${domain}'`);

  switch (domain) {
    case 'google.com':
      return 'openid profile https://www.googleapis.com/auth/userinfo.email';
    case 'okta.com':
      return 'openid profile offline_access';
    default:
      return 'openid profile';
  }
}

export async function fetchDeviceAuthorization(
  config: GleanOAuthConfig,
): Promise<AuthResponse> {
  const params = new URLSearchParams();
  params.set('client_id', config.clientId);
  params.set('scope', getOAuthScopes(config));

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

  trace(
    options.method ?? 'GET',
    url,
    options.headers,
    Object.fromEntries(params.entries()),
  );

  const response = await fetch(url, options);
  const responseJson = await response.json();

  if (
    !(
      response.ok &&
      responseJson !== undefined &&
      typeof responseJson === 'object'
    )
  ) {
    throw new AuthError('Error obtaining auth grant', {
      code: AuthErrorCode.UnexpectedAuthGrantError,
      cause: new Error(
        JSON.stringify({ status: response.status, body: responseJson }),
      ),
    });
  }

  const result = { ...responseJson } as any;

  if (isAuthResponseWithURL(responseJson)) {
    result['verification_uri'] = result['verification_url'];
    delete result['verification_url'];
  } else if (!isAuthResponse(responseJson)) {
    throw new AuthError('Unexpected auth grant response', {
      code: AuthErrorCode.UnexpectedAuthGrantResponse,
      cause: new Error(JSON.stringify(responseJson)),
    });
  }

  return result;
}
