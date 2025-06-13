import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveOAuthMetadata,
  loadOAuthMetadata,
} from '../../auth/oauth-cache.js';
import { GleanOAuthConfig } from '../../config/index.js';
import path from 'node:path';
import fixturify from 'fixturify';
import os from 'node:os';
import { mkdtempSync } from 'node:fs';

describe('OAuth Cache', () => {
  let tmpDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  const testConfig: GleanOAuthConfig = {
    baseUrl: 'https://test.example.com',
    issuer: 'test-issuer',
    clientId: 'test-client-id',
    authorizationEndpoint: 'https://test.example.com/auth',
    tokenEndpoint: 'https://test.example.com/token',
    authType: 'oauth',
  };

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };

    // Create temp directory and set XDG_STATE_HOME to point to it
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'oauth-cache-test-'));
    process.env.XDG_STATE_HOME = tmpDir;
  });

  afterEach(() => {
    process.env = originalEnv;
    // Clean up temp directory
    fixturify.writeSync(tmpDir, {});
  });

  describe('saveOAuthMetadata', () => {
    it('saves metadata with timestamp', () => {
      saveOAuthMetadata(testConfig);

      const savedData = fixturify.readSync(tmpDir);
      const gleanDir = savedData['glean'] as Record<string, unknown>;
      expect(gleanDir).toBeDefined();

      const oauthJson = JSON.parse(gleanDir['oauth.json'] as string);
      expect(oauthJson).toMatchObject(testConfig);
      expect(oauthJson.timestamp).toBeDefined();
      expect(new Date(oauthJson.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('loadOAuthMetadata', () => {
    it('returns null when no cache file exists', () => {
      const result = loadOAuthMetadata();
      expect(result).toBeNull();
    });

    it('returns null when cache is stale', () => {
      const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000);

      fixturify.writeSync(tmpDir, {
        glean: {
          'oauth.json': JSON.stringify({
            ...testConfig,
            timestamp: sevenHoursAgo,
          }),
        },
      });

      const result = loadOAuthMetadata();
      expect(result).toBeNull();
    });

    it('returns config when cache is fresh', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

      fixturify.writeSync(tmpDir, {
        glean: {
          'oauth.json': JSON.stringify({
            ...testConfig,
            timestamp: fiveHoursAgo,
          }),
        },
      });

      const result = loadOAuthMetadata();
      expect(result).toEqual(testConfig);
    });

    it('returns null for malformed JSON', () => {
      fixturify.writeSync(tmpDir, {
        glean: {
          'oauth.json': 'invalid json',
        },
      });

      const result = loadOAuthMetadata();
      expect(result).toBeNull();
    });

    it('returns null when required fields are missing', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

      fixturify.writeSync(tmpDir, {
        glean: {
          'oauth.json': JSON.stringify({
            baseUrl: 'https://test.example.com',
            // missing other required fields
            timestamp: fiveHoursAgo,
          }),
        },
      });

      const result = loadOAuthMetadata();
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('returns false for exactly 6 hours old cache', () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      fixturify.writeSync(tmpDir, {
        glean: {
          'oauth.json': JSON.stringify({
            ...testConfig,
            timestamp: sixHoursAgo,
          }),
        },
      });

      const result = loadOAuthMetadata();
      expect(result).toBeNull();
    });
  });
});
