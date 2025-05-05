/**
 * @fileoverview Glean client implementation using node-fetch.
 *
 * This module provides a client for interacting with the Glean API using node-fetch.
 * It implements search and chat functionality according to the OpenAPI specification
 * and handles authentication and error handling.
 *
 * Required environment variables:
 * - GLEAN_SUBDOMAIN: Subdomain of the Glean instance
 * - GLEAN_API_TOKEN: API token for authentication
 *
 * Optional environment variables:
 * - GLEAN_ACT_AS: User to impersonate (only valid with global tokens)
 *
 * @module common/client
 */

import fetch, { Response } from 'node-fetch';
import { GleanError, createGleanError } from './errors.js';
import { loadTokens } from '../auth/token-store.js';
import { getConfig, GleanConfig, isBasicConfig, isOAuthConfig } from '../config/config.js';

/**
 * Interface for the Glean client that provides search and chat functionality.
 */
export interface GleanClient {
  search(params: unknown): Promise<unknown>;
  chat(params: unknown): Promise<unknown>;
}

/**
 * Implementation of the Glean client using node-fetch.
 */
class GleanClientImpl implements GleanClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  /**
   * Creates a new instance of the Glean client.
   *
   * @param {GleanConfig} config - Configuration for the client
   */
  constructor(private readonly config: GleanConfig) {
    this.baseUrl = config.baseUrl;

    // FIXME: this is a hack for now; we'll use the generated client soon.
    if (isBasicConfig(config)) {
      throw new Error(`[internal error]: Basic configuration with no token.  Upgrade to OAuth config before building a client.`);
    } else if (isOAuthConfig(config)) {
      const tokens = loadTokens();
      if (tokens === null) {
        throw new Error(`[internal error]: No tokens.  Authenticate before building a client.`);
      }

      this.headers = {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
        'X-Glean-Auth-Type': 'OAUTH',
      };
    } else {
      // Set up headers based on token type and actAs parameter
      this.headers = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      };

      // Add X-Scio-Actas header if actAs is provided (for global tokens)
      if (config.actAs) {
        this.headers['X-Scio-Actas'] = config.actAs;
      }
    }
  }

  /**
   * Makes a request to the Glean API.
   *
   * @param {string} endpoint - API endpoint to call
   * @param {unknown} body - Request body
   * @returns {Promise<unknown>} Response data
   * @throws {GleanError} If the API returns an error
   */
  private async request(endpoint: string, body: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response: Response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });

      let data: Record<string, unknown>;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        let errorMessage: string;

        if (response.status === 401) {
          if (typeof data === 'object' && data && 'message' in data) {
            const message = String(data.message);
            if (message.includes('expired')) {
              errorMessage = 'Authentication token has expired';
            } else if (message.includes('Invalid Secret')) {
              errorMessage = 'Invalid authentication token';
            } else {
              errorMessage = message;
            }
          } else {
            errorMessage = 'Authentication failed';
          }
        } else {
          errorMessage = `Glean API error: ${response.statusText}`;
        }

        throw createGleanError(response.status, {
          message: errorMessage,
          originalResponse: data.message,
        });
      }

      return data;
    } catch (error) {
      if (error instanceof GleanError) {
        throw error;
      }

      throw new GleanError(
        `Failed to connect to Glean API: ${
          error instanceof Error ? error.message : String(error)
        }`,
        500,
        { error },
      );
    }
  }

  /**
   * Performs a search using the Glean API.
   *
   * @param {unknown} params - Search parameters
   * @returns {Promise<unknown>} Search results
   */
  async search(params: unknown): Promise<unknown> {
    return this.request('search', params);
  }

  /**
   * Initiates or continues a chat conversation with Glean AI.
   *
   * @param {unknown} params - Chat parameters
   * @returns {Promise<unknown>} Chat response
   */
  async chat(params: unknown): Promise<unknown> {
    return this.request('chat', params);
  }
}

/**
 * Singleton instance of the Glean client.
 */
let clientInstance: GleanClient | null = null;

/**
 * Gets the singleton instance of the Glean client, creating it if necessary.
 *
 * @returns {GleanClient} The configured Glean client instance
 * @throws {Error} If required environment variables are missing
 */
export function getClient(): GleanClient {
  if (!clientInstance) {
    const config = getConfig();
    clientInstance = new GleanClientImpl(config);
  }

  return clientInstance;
}

/**
 * Resets the client instance. Useful for testing or reconfiguration.
 */
export function resetClient(): void {
  clientInstance = null;
}
