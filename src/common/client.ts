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
 * Interface for the Glean client that provides search and chat functionality.
 */
export interface GleanClient {
  search(params: unknown): Promise<unknown>;
  chat(params: unknown): Promise<unknown>;
  runWorkflow(params: unknown): Promise<unknown>;
  listWorkflows(params?: unknown): Promise<unknown>;
  getWorkflow(workflowId: string): Promise<unknown>;
}

/**
 * Implementation of the Glean client using node-fetch.
 */
class GleanClientImpl implements GleanClient {
  private readonly baseUrl: string;
  private readonly internalBaseUrl: string;
  private readonly headers: Record<string, string>;

  /**
   * Creates a new instance of the Glean client.
   *
   * @param {GleanConfig} config - Configuration for the client
   */
  constructor(private readonly config: GleanConfig) {
    this.baseUrl = `https://${config.subdomain}-be.glean.com/rest/api/v1/`;
    this.internalBaseUrl = `https://${config.subdomain}-be.glean.com/api/v1/`;

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
   * @param {boolean} internal - To call internal endpoints
   * @returns {Promise<unknown>} Response data
   * @throws {GleanError} If the API returns an error
   */
  private async request(endpoint: string, body: unknown, internal: boolean = false): Promise<unknown> {
    const baseUrl = internal ? this.internalBaseUrl : this.baseUrl;
    const url = `${baseUrl}${endpoint}`;

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

  /**
   * Runs a workflow using the Glean API.
   *
   * @param {unknown} params - Workflow parameters
   * @returns {Promise<unknown>} Workflow execution response
   */
  async runWorkflow(params: unknown): Promise<unknown> {
    return this.request('runworkflow', params, true);
  }

  /**
   * Lists all workflows available to the user.
   *
   * @param {unknown} [params] - Optional parameters for filtering workflows
   * @returns {Promise<unknown>} List of available workflows
   */
  async listWorkflows(params?: unknown): Promise<unknown> {
    return this.request('listworkflows', {"namespaces":["PROMPT_TEMPLATE","STATIC_WORKFLOW","AGENT"]}, true);
  }

  /**
   * Gets a specific workflow by ID.
   *
   * @param {string} workflowId - ID of the workflow to retrieve
   * @returns {Promise<unknown>} Workflow details
   */
  async getWorkflow(workflowId: string): Promise<unknown> {
    return this.request(`getworkflow`, {"id": workflowId}, true);
  }
}

/**
 * Validates required environment variables and returns client configuration.
 *
 * @returns {GleanConfig} Configuration object for GleanClient
 * @throws {Error} If required environment variables are missing
 */
function getConfig(internal: boolean = false): GleanConfig {
  const subdomain = process.env.GLEAN_SUBDOMAIN;
  const apiToken = process.env.GLEAN_API_TOKEN;
  const internalApiToken = process.env.GLEAN_API_INTERNAL_TOKEN;
  const actAs = process.env.GLEAN_ACT_AS;

  const token = internal ? internalApiToken : apiToken;
  if (!subdomain) {
    throw new Error('GLEAN_SUBDOMAIN environment variable is required');
  }

  if (!token) {
    throw new Error('GLEAN_API_TOKEN or GLEAN_API_INTERNAL_TOKEN environment variable is required');
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
export function getClient(internal: boolean = false): GleanClient {
  if (!clientInstance) {
    const config = getConfig(internal);
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
