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
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
}

interface GleanCommonConfig {
  baseUrl: string;
}

export type GleanTokenConfig = GleanCommonConfig & GleanConfigTokenAccess;
export type GleanOAuthConfig = GleanCommonConfig & GleanConfigOAuthAccess;
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
 * Validates required environment variables and returns client configuration.
 *
 * @returns {GleanConfig} Configuration object for GleanClient
 * @throws {Error} If required environment variables are missing
 */
export function getConfig(): GleanConfig {
  const subdomain = process.env.GLEAN_SUBDOMAIN;
  const baseUrl = process.env.GLEAN_BASE_URL;
  const token = process.env.GLEAN_API_TOKEN;
  const actAs = process.env.GLEAN_ACT_AS;
  const issuer = process.env.GLEAN_OAUTH_ISSUER;
  const clientId = process.env.GLEAN_OAUTH_CLIENT_ID;
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
      subdomain,
      baseUrl,
      actAs,
    });
  }

  let config: GleanConfig = buildBasicConfig({
    subdomain,
    baseUrl,
    issuer,
    clientId,
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
    return {
      ...oauthConfig,
      ...config,
      authType: 'oauth',
    };
  }

  // No saved OAuth config, just returrn a basic config and try to discover
  // OAuth.
  return config;
}

function buildGleanBaseUrl({
  baseUrl,
  subdomain,
}: {
  baseUrl?: string;
  subdomain?: string;
}): string {
  if (!baseUrl) {
    if (!subdomain) {
      throw new Error('GLEAN_SUBDOMAIN environment variable is required');
    }
    return `https://${subdomain}-be.glean.com/rest/api/v1/`;
  }

  return baseUrl;
}

function buildBasicConfig({
  subdomain,
  baseUrl,
  issuer,
  clientId,
  authorizationEndpoint,
  tokenEndpoint,
}: {
  subdomain?: string;
  baseUrl?: string;
  issuer?: string;
  clientId?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
}): GleanBasicConfig {
  return {
    authType: 'unknown',
    baseUrl: buildGleanBaseUrl({ subdomain, baseUrl }),
    issuer,
    clientId,
    authorizationEndpoint,
    tokenEndpoint,
  };
}

function buildTokenConfig({
  token,
  actAs,
  baseUrl,
  subdomain,
}: {
  token: string;
  actAs?: string;
  baseUrl?: string;
  subdomain?: string;
}): GleanConfig {
  if (!token) {
    throw new Error('GLEAN_API_TOKEN environment variable is required');
  }

  return {
    authType: 'token',
    baseUrl: buildGleanBaseUrl({ subdomain, baseUrl }),
    token,
    ...(actAs ? { actAs } : {}),
  };
}
