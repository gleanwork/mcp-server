/**
 * @fileoverview Glean client implementation using the Glean API client.
 *
 * This module provides a client for interacting with the Glean API.
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

import { Glean } from '@gleanwork/api-client';
import { Client } from '@gleanwork/api-client/sdk/client.js';

/**
 * Singleton instance of the Glean client.
 */
let clientInstance: Client | null = null;

/**
 * Gets the singleton instance of the Glean client, creating it if necessary.
 *
 * @returns {Client} The configured Glean client instance
 * @throws {Error} If required environment variables are missing
 */
export function getClient(): Client {
  if (!clientInstance) {
    const subdomain = process.env.GLEAN_SUBDOMAIN;
    const token = process.env.GLEAN_API_TOKEN;

    if (!subdomain) {
      throw new Error('GLEAN_SUBDOMAIN environment variable is required');
    }

    if (!token) {
      throw new Error('GLEAN_API_TOKEN environment variable is required');
    }

    const glean = new Glean({
      domain: subdomain,
      bearerAuth: token,
    });

    clientInstance = glean.client;
  }

  return clientInstance;
}

/**
 * Resets the client instance. Useful for testing or reconfiguration.
 */
export function resetClient(): void {
  clientInstance = null;
}
