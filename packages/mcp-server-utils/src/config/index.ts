import { stripUndefined } from '../util/object.js';

export interface GleanConfigTokenAccess {
  authType: 'token';
  token: string;
  actAs?: string;
}

export interface GleanBasicConfigNoToken {
  authType: 'unknown';
  baseUrl: string;
}

/**
 * Common configuration shared across all Glean configurations.
 */
export interface GleanCommonConfig {
  baseUrl: string;
}

export type GleanTokenConfig = GleanCommonConfig & GleanConfigTokenAccess;
export type GleanBasicConfig = GleanCommonConfig & GleanBasicConfigNoToken;

/**
 * Configuration interface for Glean client initialization.
 */
export type GleanConfig = GleanBasicConfig | GleanTokenConfig;

/**
 * Type guard to check if a GleanConfig uses token authentication
 */
export function isGleanTokenConfig(
  config: GleanConfig,
): config is GleanConfig & GleanConfigTokenAccess {
  return (config as GleanConfigTokenAccess).authType === 'token';
}

/**
 * Type guard to check if a GleanConfig uses basic authentication
 */
export function isBasicConfig(
  config: GleanConfig,
): config is GleanConfig & GleanBasicConfig {
  return (config as GleanBasicConfig).authType === 'unknown';
}

/**
 * Validates required environment variables and returns client configuration.
 *
 * @returns A promise that resolves to GleanConfig
 * @throws {Error} If required environment variables are missing
 */
export async function getConfig(): Promise<GleanConfig> {
  return getLocalConfig();
}

function getLocalConfig(): GleanConfig {
  const instance = process.env.GLEAN_INSTANCE || process.env.GLEAN_SUBDOMAIN;
  const baseUrl = process.env.GLEAN_URL;
  const token = process.env.GLEAN_API_TOKEN;
  const actAs = process.env.GLEAN_ACT_AS;

  if (token !== undefined) {
    return buildTokenConfig({
      token,
      instance,
      baseUrl,
      actAs,
    });
  }

  const config: GleanConfig = buildBasicConfig({
    instance,
    baseUrl,
  });

  return {
    ...stripUndefined(config),
    baseUrl: config.baseUrl,
    authType: config.authType,
  };
}

// SafeConfig is a partial record of all possible non-sensitive keys from GleanConfig, except 'token'.
type SafeConfig = Partial<
  Record<
    Exclude<keyof GleanBasicConfig | keyof GleanTokenConfig, 'token'>,
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
}: {
  instance?: string;
  baseUrl?: string;
}): GleanBasicConfig {
  return {
    authType: 'unknown',
    baseUrl: buildGleanBaseUrl({ instance, baseUrl }),
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
