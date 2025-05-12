/**
 * @fileoverview Glean client implementation using the Glean API client.
 *
 * This module provides a client for interacting with the Glean API.
 *
 * Required environment variables:
 * - GLEAN_INSTANCE or GLEAN_SUBDOMAIN: Name of the Glean instance
 * - GLEAN_API_TOKEN: API token for authentication
 *
 * Optional environment variables:
 * - GLEAN_ACT_AS: User to impersonate (only valid with global tokens)
 *
 * @module common/client
 */

import { HTTPClient } from '@gleanwork/api-client/lib/http.js';
import { loadTokens } from '../auth/token-store.js';
import {
  getConfig,
  isGleanTokenConfig,
  isOAuthConfig,
  sanitizeConfig,
} from '../config/config.js';
import { Glean, SDKOptions } from '@gleanwork/api-client';
import { Client } from '@gleanwork/api-client/sdk/client.js';
import { trace } from '../log/logger.js';
import { AuthError, AuthErrorCode } from '../auth/error.js';
import { ensureAuthTokenPresence } from '../auth/auth.js';

let clientInstancePromise: Promise<Client> | null = null;

/**
 * Gets the singleton instance of the Glean client, creating it if necessary.
 *
 * @returns {Promise<Client>} The configured Glean client instance
 * @throws {Error} If required environment variables are missing
 */
export async function getClient(): Promise<Client> {
  if (!clientInstancePromise) {
    clientInstancePromise = (async () => {
      const glean = new Glean(await getAPIClientOptions());
      return glean.client;
    })();
  }
  return clientInstancePromise;
}

function buildHttpClientWithGlobalHeaders(
  headers: Record<string, string>,
): HTTPClient {
  const httpClient = new HTTPClient();

  httpClient.addHook('beforeRequest', (request) => {
    const nextRequest = new Request(request, {
      signal: request.signal || AbortSignal.timeout(5000),
    });
    for (const [key, value] of Object.entries(headers)) {
      nextRequest.headers.set(key, value);
    }
    return nextRequest;
  });

  return httpClient;
}

export async function getAPIClientOptions(): Promise<SDKOptions> {
  const config = getConfig();
  const opts: SDKOptions = {};

  opts.serverURL = config.baseUrl;

  trace('initializing client', opts.serverURL);

  if (isOAuthConfig(config)) {
    if (!(await ensureAuthTokenPresence())) {
      throw new AuthError(
        'No OAuth tokens found. Please run `npx @gleanwork/mcp-server auth` to authenticate.',
        { code: AuthErrorCode.InvalidConfig },
      );
    }

    const tokens = loadTokens();
    if (tokens === null) {
      throw new AuthError(
        'No OAuth tokens found. Please run `npx @gleanwork/mcp-server auth` to authenticate.',
        { code: AuthErrorCode.InvalidConfig },
      );
    }
    opts.apiToken = tokens?.accessToken;
    opts.httpClient = buildHttpClientWithGlobalHeaders({
      'X-Glean-Auth-Type': 'OAUTH',
    });
  } else if (isGleanTokenConfig(config)) {
    opts.apiToken = config.token;

    const { actAs } = config;
    if (actAs) {
      opts.httpClient = buildHttpClientWithGlobalHeaders({
        'X-Glean-Act-As': actAs,
      });
    }
  } else {
    trace(
      'Unexpected code; getConfig() should have errored or returned a valid config by now',
      sanitizeConfig(config),
    );
    throw new AuthError(
      'Missing or invalid Glean configuration. Please check that your environment variables are set correctly (e.g. GLEAN_INSTANCE or GLEAN_SUBDOMAIN).',
      { code: AuthErrorCode.InvalidConfig },
    );
  }

  return opts;
}

/**
 * Resets the client instance. Useful for testing or reconfiguration.
 */
export function resetClient(): void {
  clientInstancePromise = null;
}
