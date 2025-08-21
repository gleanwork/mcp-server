import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { Logger } from '../../log/logger.js';
import {
  getConfig,
  isBasicConfig,
  isGleanTokenConfig,
} from '../../config/index.js';

// Helper to set up XDG temp dir
function setupXdgTemp() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
  process.env.XDG_STATE_HOME = tmpDir;
  return tmpDir;
}

describe('getConfig', () => {
  let tmpDir: string;
  let originalXdgStateHome: string | undefined;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    originalXdgStateHome = process.env.XDG_STATE_HOME;
    tmpDir = setupXdgTemp();
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
  });

  it('returns basic config when only instance is provided', async () => {
    process.env.GLEAN_INSTANCE = 'test-company';
    const config = await getConfig();

    expect(isBasicConfig(config)).toBe(true);
    expect(config.baseUrl).toBe('https://test-company-be.glean.com/');
    expect(config.authType).toBe('unknown');
  });

  it('returns token config when token is provided', async () => {
    process.env.GLEAN_INSTANCE = 'test-company';
    process.env.GLEAN_API_TOKEN = 'test-token';

    const config = await getConfig();

    expect(isGleanTokenConfig(config)).toBe(true);
    expect(config.baseUrl).toBe('https://test-company-be.glean.com/');
    expect(config.authType).toBe('token');
    if (isGleanTokenConfig(config)) {
      expect(config.token).toBe('test-token');
    }
  });

  it('uses GLEAN_URL when provided', async () => {
    process.env.GLEAN_URL = 'https://custom.glean.com/';
    process.env.GLEAN_API_TOKEN = 'test-token';

    const config = await getConfig();

    expect(isGleanTokenConfig(config)).toBe(true);
    expect(config.baseUrl).toBe('https://custom.glean.com/');
    if (isGleanTokenConfig(config)) {
      expect(config.token).toBe('test-token');
    }
  });

  it('includes actAs when provided', async () => {
    process.env.GLEAN_INSTANCE = 'test-company';
    process.env.GLEAN_API_TOKEN = 'test-token';
    process.env.GLEAN_ACT_AS = 'user@example.com';

    const config = await getConfig();

    expect(isGleanTokenConfig(config)).toBe(true);
    if (isGleanTokenConfig(config)) {
      expect(config.actAs).toBe('user@example.com');
    }
  });

  it('throws error when no instance or URL is provided', async () => {
    process.env.GLEAN_API_TOKEN = 'test-token';

    await expect(getConfig()).rejects.toThrow(
      'GLEAN_INSTANCE environment variable is required',
    );
  });

  it('uses GLEAN_SUBDOMAIN as fallback for instance', async () => {
    process.env.GLEAN_SUBDOMAIN = 'test-subdomain';
    process.env.GLEAN_API_TOKEN = 'test-token';

    const config = await getConfig();

    expect(config.baseUrl).toBe('https://test-subdomain-be.glean.com/');
  });
});
