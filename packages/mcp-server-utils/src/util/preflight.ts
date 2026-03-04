import { trace, error } from '../log/logger.js';

/**
 * Validates that the given instance name or server URL is valid by checking its liveness endpoint.
 * When GLEAN_SERVER_URL is set, validates using that URL directly.
 * Otherwise, makes a fetch request to https://{instance}-be.glean.com/liveness_check
 *
 * @param instance - The instance name to validate
 * @returns A Promise that resolves to true if the instance is valid
 */
export async function validateInstance(instance: string): Promise<boolean> {
  // If GLEAN_SERVER_URL is set, skip instance name validation and validate the server URL directly
  const serverUrl = process.env.GLEAN_SERVER_URL;
  if (serverUrl) {
    return validateServerUrl(serverUrl);
  }

  if (!instance) {
    trace('No instance provided for validation');
    return false;
  }

  try {
    const url = `https://${instance}-be.glean.com/liveness_check`;
    trace(`Checking instance validity with: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    // We only care that the request succeeds, not about the response content
    if (!response.ok) {
      error(
        `Instance validation failed for ${instance}: ${response.status} ${response.statusText}`,
      );
      return false;
    }

    return true;
  } catch (err) {
    const cause = err instanceof Error ? err : new Error(String(err));

    error(`Instance validation failed: ${cause.message}`);
    return false;
  }
}

/**
 * Validates a server URL by checking its liveness endpoint.
 *
 * @param serverUrl - The full server URL to validate
 * @returns A Promise that resolves to true if the server is reachable
 */
async function validateServerUrl(serverUrl: string): Promise<boolean> {
  try {
    const normalizedUrl = /^https?:\/\//i.test(serverUrl)
      ? serverUrl
      : `https://${serverUrl}`;
    const url = `${normalizedUrl.replace(/\/+$/, '')}/liveness_check`;
    trace(`Checking server URL validity with: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      error(
        `Server URL validation failed for ${serverUrl}: ${response.status} ${response.statusText}`,
      );
      return false;
    }

    return true;
  } catch (err) {
    const cause = err instanceof Error ? err : new Error(String(err));
    error(`Server URL validation failed: ${cause.message}`);
    return false;
  }
}
