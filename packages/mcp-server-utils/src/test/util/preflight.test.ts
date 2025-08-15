import { describe, it, expect, beforeEach } from 'vitest';
import { validateInstance } from '../../util/preflight.js';
import '@gleanwork/mcp-test-utils/mocks/setup';

describe('Preflight Validation', () => {
  beforeEach(() => {
    // Reset any environment variables that might affect the tests
    delete process.env.GLEAN_URL;
    delete process.env.GLEAN_INSTANCE;
  });

  it('returns true for a valid instance name', async () => {
    const result = await validateInstance('valid-instance');
    expect(result).toBe(true);
  });

  it('returns false for invalid instance name', async () => {
    expect(await validateInstance('invalid-instance')).toEqual(false);
  });

  it('returns false for network errors', async () => {
    expect(await validateInstance('network-error')).toEqual(false);
  });

  it('returns false if `instance` is missing', async () => {
    expect(await validateInstance('')).toEqual(false);
  });
});
