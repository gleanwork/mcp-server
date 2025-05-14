import { trace, error } from '../log/logger.js';

/**
 * Validates that the given instance name is valid by checking its liveness endpoint.
 * Makes a fetch request to https://{instance}-be.glean.com/liveness_check
 *
 * @param instance - The instance name to validate
 * @returns A Promise that resolves to true if the instance is valid
 */
export async function validateInstance(instance: string): Promise<boolean> {
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
