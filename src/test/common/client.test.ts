import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getClient, resetClient } from '../../common/client';
import { GleanError, GleanAuthenticationError } from '../../common/errors';
import '../mocks/setup';

describe('GleanClient', () => {
  beforeEach(() => {
    // delete BASE_URL because it takes precedence over SUBDOMAIN
    delete process.env.GLEAN_BASE_URL;
    process.env.GLEAN_SUBDOMAIN = 'test';
    process.env.GLEAN_API_TOKEN = 'test-token';
    resetClient();
  });

  afterEach(() => {
    delete process.env.GLEAN_SUBDOMAIN;
    delete process.env.GLEAN_API_TOKEN;
    delete process.env.GLEAN_ACT_AS;
  });

  describe('request handling', () => {
    it('should handle JSON responses correctly', async () => {
      const client = getClient();
      const result = await client.search({});

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('trackingToken');
      expect(result).toHaveProperty('sessionInfo');
    });

    it('should handle expired token errors correctly', async () => {
      process.env.GLEAN_API_TOKEN = 'expired_token';
      resetClient();
      const client = getClient();

      const promise = client.search({});

      await expect(promise).rejects.toBeInstanceOf(GleanAuthenticationError);
      await expect(promise).rejects.toMatchObject({
        status: 401,
        message: 'Authentication token has expired',
        response: {
          message: 'Authentication token has expired',
          originalResponse: 'Token has expired\nNot allowed',
        },
      });
    });

    it('should handle invalid token errors correctly', async () => {
      process.env.GLEAN_API_TOKEN = 'invalid_token';
      resetClient();
      const client = getClient();

      const promise = client.search({});

      await expect(promise).rejects.toBeInstanceOf(GleanAuthenticationError);
      await expect(promise).rejects.toMatchObject({
        status: 401,
        message: 'Invalid authentication token',
        response: {
          message: 'Invalid authentication token',
          originalResponse: 'Invalid Secret\nNot allowed',
        },
      });
    });

    it('should handle non-JSON error responses correctly', async () => {
      process.env.GLEAN_API_TOKEN = 'server_error';
      resetClient();
      const client = getClient();

      const promise = client.search({});

      await expect(promise).rejects.toBeInstanceOf(GleanError);
      await expect(promise).rejects.toMatchObject({
        status: 500,
        message: 'Glean API error: Internal Server Error',
        response: {
          message: 'Glean API error: Internal Server Error',
          originalResponse: 'Something went wrong',
        },
      });
    });

    it('should handle network errors correctly', async () => {
      process.env.GLEAN_API_TOKEN = 'network_error';
      resetClient();
      const client = getClient();

      const promise = client.search({});

      await expect(promise).rejects.toBeInstanceOf(GleanError);
      await expect(promise).rejects.toMatchObject({
        status: 500,
        message: 'Glean API error: Unhandled Exception',
        response: {
          message: 'Glean API error: Unhandled Exception',
          originalResponse: 'Network error',
        },
      });
    });
  });
});
