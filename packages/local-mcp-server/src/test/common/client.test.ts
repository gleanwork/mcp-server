import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getClient,
  getAPIClientOptions,
  resetClient,
} from '../../common/client.js';
import { getConfig } from '@gleanwork/mcp-server-utils/config';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { Logger } from '@gleanwork/mcp-server-utils/logger';

// Mock the config module
vi.mock('@gleanwork/mcp-server-utils/config', () => ({
  getConfig: vi.fn(),
  isGleanTokenConfig: vi.fn(),
  sanitizeConfig: vi.fn(),
}));

// Helper to set up XDG temp dir
function setupXdgTemp() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'client-test-'));
  process.env.XDG_STATE_HOME = tmpDir;
  return tmpDir;
}

describe('client', () => {
  let tmpDir: string;
  let originalXdgStateHome: string | undefined;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    originalXdgStateHome = process.env.XDG_STATE_HOME;
    tmpDir = setupXdgTemp();
    resetClient();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    if (originalXdgStateHome) {
      process.env.XDG_STATE_HOME = originalXdgStateHome;
    } else {
      delete process.env.XDG_STATE_HOME;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    Logger.reset();
    vi.clearAllMocks();
  });

  describe('getAPIClientOptions', () => {
    it('should configure client with token config', async () => {
      const mockConfig = {
        authType: 'token' as const,
        baseUrl: 'https://test-company-be.glean.com/',
        token: 'test-token',
      };

      vi.mocked(getConfig).mockResolvedValue(mockConfig);
      const { isGleanTokenConfig } =
        await import('@gleanwork/mcp-server-utils/config');
      vi.mocked(isGleanTokenConfig).mockReturnValue(true);

      const opts = await getAPIClientOptions();

      expect(opts.serverURL).toBe('https://test-company-be.glean.com/');
      expect(opts.apiToken).toBe('test-token');
    });

    it('should configure client with actAs header when provided', async () => {
      const mockConfig = {
        authType: 'token' as const,
        baseUrl: 'https://test-company-be.glean.com/',
        token: 'test-token',
        actAs: 'user@example.com',
      };

      vi.mocked(getConfig).mockResolvedValue(mockConfig);
      const { isGleanTokenConfig } =
        await import('@gleanwork/mcp-server-utils/config');
      vi.mocked(isGleanTokenConfig).mockReturnValue(true);

      const opts = await getAPIClientOptions();

      expect(opts.serverURL).toBe('https://test-company-be.glean.com/');
      expect(opts.apiToken).toBe('test-token');
      expect(opts.httpClient).toBeDefined();
    });

    it('should configure client without authentication when no token provided', async () => {
      const mockConfig = {
        authType: 'unknown' as const,
        baseUrl: 'https://test-company-be.glean.com/',
      };

      vi.mocked(getConfig).mockResolvedValue(mockConfig);
      const { isGleanTokenConfig } =
        await import('@gleanwork/mcp-server-utils/config');
      vi.mocked(isGleanTokenConfig).mockReturnValue(false);

      const opts = await getAPIClientOptions();

      expect(opts.serverURL).toBe('https://test-company-be.glean.com/');
      expect(opts.apiToken).toBeUndefined();
      expect(opts.httpClient).toBeDefined();
    });
  });

  describe('getClient', () => {
    it('should return the same client instance on multiple calls', async () => {
      const mockConfig = {
        authType: 'token' as const,
        baseUrl: 'https://test-company-be.glean.com/',
        token: 'test-token',
      };

      vi.mocked(getConfig).mockResolvedValue(mockConfig);
      const { isGleanTokenConfig } =
        await import('@gleanwork/mcp-server-utils/config');
      vi.mocked(isGleanTokenConfig).mockReturnValue(true);

      const client1 = await getClient();
      const client2 = await getClient();

      expect(client1).toBe(client2);
    });

    it('should create a new client instance after reset', async () => {
      const mockConfig = {
        authType: 'token' as const,
        baseUrl: 'https://test-company-be.glean.com/',
        token: 'test-token',
      };

      vi.mocked(getConfig).mockResolvedValue(mockConfig);
      const { isGleanTokenConfig } =
        await import('@gleanwork/mcp-server-utils/config');
      vi.mocked(isGleanTokenConfig).mockReturnValue(true);

      const client1 = await getClient();
      resetClient();
      const client2 = await getClient();

      expect(client1).not.toBe(client2);
    });
  });
});
