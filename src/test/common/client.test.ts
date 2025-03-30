import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getClient, resetClient } from '../../common/client';
import { GleanError, GleanAuthenticationError } from '../../common/errors';
import fetch from 'node-fetch';

// Mock node-fetch
vi.mock('node-fetch', () => {
  return {
    default: vi.fn(),
  };
});

describe('GleanClient', () => {
  beforeEach(() => {
    process.env.GLEAN_SUBDOMAIN = 'test';
    process.env.GLEAN_API_TOKEN = 'test-token';

    resetClient();

    vi.mocked(fetch).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();

    delete process.env.GLEAN_SUBDOMAIN;
    delete process.env.GLEAN_API_TOKEN;
    delete process.env.GLEAN_ACT_AS;
  });

  describe('request handling', () => {
    it('should handle JSON responses correctly', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve({ data: 'test' }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const client = getClient();
      const result = await client.search({});

      expect(result).toEqual({ data: 'test' });
    });

    it('should handle expired token errors correctly', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: {
          get: () => 'text/plain; charset=utf-8',
        },
        text: () => Promise.resolve('Token has expired\nNot allowed'),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

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
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: {
          get: () => 'text/plain; charset=utf-8',
        },
        text: () => Promise.resolve('Invalid Secret\nNot allowed'),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

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
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: () => 'text/plain; charset=utf-8',
        },
        text: () => Promise.resolve('Something went wrong'),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

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
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const client = getClient();
      const promise = client.search({});

      await expect(promise).rejects.toBeInstanceOf(GleanError);
      await expect(promise).rejects.toMatchObject({
        status: 500,
        message: 'Failed to connect to Glean API: Network error',
        response: { error: new Error('Network error') },
      });
    });
  });
});
