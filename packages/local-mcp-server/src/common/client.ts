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
import { VERSION } from './version.js';
import {
  getConfig,
  isGleanTokenConfig,
  sanitizeConfig,
} from '@gleanwork/mcp-server-utils/config';
import { trace } from '@gleanwork/mcp-server-utils/logger';
import { Glean, SDK_METADATA, SDKOptions } from '@gleanwork/api-client';
import { Client } from '@gleanwork/api-client/sdk/client.js';

let clientInstancePromise: Promise<Client> | null = null;

const USER_AGENT = `speakeasy-sdk/typescript ${VERSION} ${SDK_METADATA.genVersion} ${SDK_METADATA.openapiDocVersion} @gleanwork/local-mcp-server`;
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
  const config = await getConfig();
  const opts: SDKOptions = {};

  opts.serverURL = config.baseUrl;

  trace('initializing client', opts.serverURL);

  if (isGleanTokenConfig(config)) {
    opts.apiToken = config.token;

    const { actAs } = config;
    if (actAs) {
      opts.httpClient = buildHttpClientWithGlobalHeaders({
        'X-Glean-Act-As': actAs,
        'user-agent': USER_AGENT,
      });
    }
  } else {
    trace(
      'No API token provided. Requests will be made without authentication.',
      sanitizeConfig(config),
    );
    // Continue without authentication - let the API reject if needed
    opts.httpClient = buildHttpClientWithGlobalHeaders({
      'user-agent': USER_AGENT,
    });
  }

  return opts;
}

/**
 * Resets the client instance. Useful for testing or reconfiguration.
 */
export function resetClient(): void {
  clientInstancePromise = null;
}
