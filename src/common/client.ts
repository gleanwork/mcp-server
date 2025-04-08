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

/**
 * Configuration interface for Glean client initialization.
 */
export interface GleanConfig {
  subdomain: string;
  token: string;
  actAs?: string;
}

/**
 * Interface for Glean search parameters.
 */
export interface GleanSearchParams {
  query: string;
  requestOptions?: Record<string, unknown>;
  scParams?: string;
  [key: string]: unknown;
}

/**
 * Interface for the Glean client that provides search and chat functionality.
 */
export interface GleanClient {
  search(params: GleanSearchParams): Promise<unknown>;
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
    this.baseUrl = `https://${config.subdomain}-be.glean.com/rest/api/v1/`;

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
   * Adds the db.filter_query_debug_results parameter to the scParams string.
   * 
   * @param {GleanSearchParams} params - The search parameters
   * @returns {GleanSearchParams} Updated search parameters with the debug filter added
   */
  private addFilterQueryDebugResults(params: GleanSearchParams): GleanSearchParams {
    // Create a copy of the parameters to avoid modifying the original
    const updatedParams = { ...params };
    
    // Create or update the scParams string to include db.filter_query_debug_results=true
    if (!updatedParams.scParams) {
      updatedParams.scParams = 'db.filter_query_debug_results=true';
    } else if (!updatedParams.scParams.includes('db.filter_query_debug_results=')) {
      updatedParams.scParams = `${updatedParams.scParams},db.filter_query_debug_results=true`;
    } else {
      // Replace existing value with true if it's already in the string
      updatedParams.scParams = updatedParams.scParams.replace(
        /db\.filter_query_debug_results=(true|false)/,
        'db.filter_query_debug_results=true'
      );
    }
    
    return updatedParams;
  }

  /**
   * Performs a search using the Glean API.
   *
   * @param {GleanSearchParams} params - Search parameters
   * @returns {Promise<unknown>} Search results
   */
  async search(params: GleanSearchParams): Promise<unknown> {
    const searchParams = this.addFilterQueryDebugResults(params);
    return this.request('search', searchParams);
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
 * Validates required environment variables and returns client configuration.
 *
 * @returns {GleanConfig} Configuration object for GleanClient
 * @throws {Error} If required environment variables are missing
 */
function getConfig(): GleanConfig {
  const subdomain = process.env.GLEAN_SUBDOMAIN;
  const token = process.env.GLEAN_API_TOKEN;
  const actAs = process.env.GLEAN_ACT_AS;

  if (!subdomain) {
    throw new Error('GLEAN_SUBDOMAIN environment variable is required');
  }

  if (!token) {
    throw new Error('GLEAN_API_TOKEN environment variable is required');
  }

  return {
    subdomain,
    token,
    ...(actAs ? { actAs } : {}),
  };
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
