import { attemptUpgradeConfigToOAuth } from '../auth/auth.js';
import { loadOAuthMetadata } from '../auth/oauth-cache.js';
import { stripUndefined } from '../util/object.js';

export interface GleanConfigTokenAccess {
  authType: 'token';
  token: string;
  actAs?: string;
}

export interface GleanConfigOAuthAccess {
  authType: 'oauth';
  issuer: string;
  clientId: string;
  /**
   * Client secret for the device flow OAuth client.
   *
   * Note this is not actually a secret and does not secure anything.  It
   * should be thought of as an extension of the client identifier.
   *
   * It's not recommended to even use client secrets for public OAuth clients,
   * but some providers require its use even for clients that cannot keep
   * secrets.
   */
  clientSecret?: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
}

/**
 * Config where the user has only specified the baseUrl.  In order to
 * authenticate we'd have to upgrade to a GleanOAuthConfig by querying the
 * resource's metadata.
 */
export interface GleanBasicConfigNoToken {
  authType: 'unknown';
  issuer?: string;
  clientId?: string;
  /**
   * Client secret for the device flow OAuth client.
   *
   * Note this is not actually a secret and does not secure anything.  It
   * should be thought of as an extension of the client identifier.
   *
   * It's not recommended to even use client secrets for public OAuth clients,
   * but some providers require its use even for clients that cannot keep
   * secrets.
   */
  clientSecret?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
}

interface GleanCommonConfig {
  baseUrl: string;
}

/**
 * PKCE fields for device flow with PKCE (e.g. onelogin.com)
 */
export interface GleanPkceFields {
  codeVerifier?: string;
  codeChallenge?: string;
  //PKCE code challenge method (usually 'S256')
  codeChallengeMethod?: string;
}
export type GleanTokenConfig = GleanCommonConfig & GleanConfigTokenAccess;

export type GleanOAuthConfig = GleanCommonConfig &
  GleanConfigOAuthAccess &
  GleanPkceFields;
export type GleanBasicConfig = GleanCommonConfig & GleanBasicConfigNoToken;

/**
 * Configuration interface for Glean client initialization.
 */
export type GleanConfig =
  | GleanBasicConfig
  | GleanTokenConfig
  | GleanOAuthConfig;

/**
 * Type guard to check if a GleanConfig uses token authentication
 */
export function isGleanTokenConfig(
  config: GleanConfig,
): config is GleanConfig & GleanConfigTokenAccess {
  return (config as GleanConfigTokenAccess).authType === 'token';
}

/**
 * Type guard to check if a GleanConfig uses OAuth authentication
 */
export function isOAuthConfig(
  config: GleanConfig,
): config is GleanConfig & GleanConfigOAuthAccess {
  return (config as GleanConfigOAuthAccess).authType === 'oauth';
}

/**
 * Type guard to check if a GleanConfig uses OAuth authentication
 */
export function isBasicConfig(
  config: GleanConfig,
): config is GleanConfig & GleanBasicConfig {
  return (config as GleanBasicConfig).authType === 'unknown';
}

/**
 * Type that represents the return value of getConfig based on the discoverOAuth option.
 * When discoverOAuth is true, the return type cannot be GleanBasicConfig.
 */
type GetConfigReturn<T extends GetConfigOptions> =
  T['discoverOAuth'] extends true
    ? GleanTokenConfig | GleanOAuthConfig
    : GleanConfig;

interface GetConfigOptions {
  discoverOAuth?: boolean;
}

/**
 * Validates required environment variables and returns client configuration.
 *
 * @param opts - Configuration options
 * @param opts.discoverOAuth - If true, attempts to discover OAuth
 * configuration via network calls to load oauth protected resource metadata.
 * Guarantees the return type is not a GleanBasicConfig
 * @returns A promise that resolves to:
 *   - GleanTokenConfig | GleanOAuthConfig if discoverOAuth is true
 *   - GleanConfig (which may include GleanBasicConfig) if discoverOAuth is false
 * @throws {Error} If required environment variables are missing
 */
export async function getConfig<T extends GetConfigOptions = GetConfigOptions>(
  opts?: T,
): Promise<GetConfigReturn<T>> {
  const config = getLocalConfig();

  if (opts?.discoverOAuth === true && !isOAuthConfig(config)) {
    return attemptUpgradeConfigToOAuth(config);
  } else {
    // It's probably possible to avoid this cast with some type guards, but
    // it's annoying.
    return config as GetConfigReturn<T>;
  }
}

function getLocalConfig(): GleanConfig {
  const instance = process.env.GLEAN_INSTANCE || process.env.GLEAN_SUBDOMAIN;
  const baseUrl = process.env.GLEAN_BASE_URL;
  const token = process.env.GLEAN_API_TOKEN;
  const actAs = process.env.GLEAN_ACT_AS;
  const issuer = process.env.GLEAN_OAUTH_ISSUER;
  const clientId = process.env.GLEAN_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GLEAN_OAUTH_CLIENT_SECRET;
  const authorizationEndpoint = process.env.GLEAN_OAUTH_AUTHORIZATION_ENDPOINT;
  const tokenEndpoint = process.env.GLEAN_OAUTH_TOKEN_ENDPOINT;

  if (token !== undefined && (issuer !== undefined || clientId !== undefined)) {
    throw new Error(
      `Specify either GLEAN_OAUTH_ISSUER and GLEAN_OAUTH_CLIENT_ID or GLEAN_API_TOKEN, but not both.`,
    );
  }

  if (token !== undefined) {
    return buildTokenConfig({
      token,
      instance,
      baseUrl,
      actAs,
    });
  }

  let config: GleanConfig = buildBasicConfig({
    instance,
    baseUrl,
    issuer,
    clientId,
    clientSecret,
    authorizationEndpoint,
    tokenEndpoint,
  });

  config = {
    ...stripUndefined(config),
    baseUrl: config.baseUrl,
    authType: config.authType,
  };

  const oauthConfig = loadOAuthMetadata();
  if (oauthConfig !== null) {
    // We have a saved OAuth config that's recent. No need to discover
    // anything, but let the user override individual things, mostly for
    // testing/debugging.
    const result: GleanOAuthConfig = {
      ...oauthConfig,
      ...config,
      authType: 'oauth',
    };

    if ('clientSecret' in result && result.clientSecret === undefined) {
      delete result['clientSecret'];
    }

    return result;
  }

  // No saved OAuth config, just return a basic config and try to discover
  // OAuth.
  return config;
}

// SafeConfig is a partial record of all possible non-sensitive keys from GleanConfig, except 'token'.
type SafeConfig = Partial<
  Record<
    Exclude<
      keyof GleanBasicConfig | keyof GleanTokenConfig | keyof GleanOAuthConfig,
      'token'
    >,
    unknown
  >
>;

export function sanitizeConfig(config: GleanConfig): SafeConfig {
  const result = { ...config } as any;

  if ('token' in result) {
    delete result.token;
  }

  return result;
}

function buildGleanBaseUrl({
  baseUrl,
  instance,
}: {
  baseUrl?: string;
  instance?: string;
}): string {
  if (!baseUrl) {
    if (!instance) {
      throw new Error('GLEAN_INSTANCE environment variable is required');
    }
    return `https://${instance}-be.glean.com/`;
  }

  return baseUrl;
}

function buildBasicConfig({
  instance,
  baseUrl,
  issuer,
  clientId,
  clientSecret,
  authorizationEndpoint,
  tokenEndpoint,
}: {
  instance?: string;
  baseUrl?: string;
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
}): GleanBasicConfig {
  return {
    authType: 'unknown',
    baseUrl: buildGleanBaseUrl({ instance, baseUrl }),
    issuer,
    clientId,
    clientSecret,
    authorizationEndpoint,
    tokenEndpoint,
  };
}

function buildTokenConfig({
  token,
  actAs,
  baseUrl,
  instance,
}: {
  token: string;
  actAs?: string;
  baseUrl?: string;
  instance?: string;
}): GleanConfig {
  if (!token) {
    throw new Error('GLEAN_API_TOKEN environment variable is required');
  }

  return {
    authType: 'token',
    baseUrl: buildGleanBaseUrl({ instance, baseUrl }),
    token,
    ...(actAs ? { actAs } : {}),
  };
}
