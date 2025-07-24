import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { Tokens, loadTokens, saveTokens } from '../../auth/token-store.js';
import { TokenResponse } from '../../auth/types.js';
import path from 'node:path';
import fs from 'node:fs';
import fixturify from 'fixturify';
import os from 'node:os';
import { Logger } from '../../log/logger.js';

describe('token-store', () => {
  let tmpDir: string;
  let originalXdgStateHome: string | undefined;
  let stateDir: string;

  beforeEach(() => {
    Logger.reset();
    // Create temp directory and set XDG_STATE_HOME
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'token-store-test-'));
    originalXdgStateHome = process.env.XDG_STATE_HOME;
    process.env.XDG_STATE_HOME = tmpDir;
    stateDir = path.join(tmpDir, 'glean');
  });

  afterEach(() => {
    // Restore original XDG_STATE_HOME and clean up temp directory
    if (originalXdgStateHome) {
      process.env.XDG_STATE_HOME = originalXdgStateHome;
    } else {
      delete process.env.XDG_STATE_HOME;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('Tokens.buildFromTokenResponse', () => {
    test('creates tokens with access token only', () => {
      const response: TokenResponse = {
        token_type: 'Bearer',
        access_token: 'access123',
      };

      const tokens = Tokens.buildFromTokenResponse(response);
      expect(tokens.accessToken).toBe('access123');
      expect(tokens.refreshToken).toBeUndefined();
      expect(tokens.expiresAt).toBeUndefined();
    });

    test('creates tokens with all fields', () => {
      const response: TokenResponse = {
        token_type: 'Bearer',
        access_token: 'access123',
        refresh_token: 'refresh456',
        expires_in: 3600,
      };

      const tokens = Tokens.buildFromTokenResponse(response);
      expect(tokens.accessToken).toBe('access123');
      expect(tokens.refreshToken).toBe('refresh456');
      expect(tokens.expiresAt).toBeInstanceOf(Date);

      // Verify expiry calculation (allowing 1s tolerance for test execution time)
      const expectedExpiry = new Date(Date.now() + 3600 * 1000);
      const actualExpiry = tokens.expiresAt!;
      expect(
        Math.abs(actualExpiry.getTime() - expectedExpiry.getTime()),
      ).toBeLessThan(1000);
    });
  });

  describe('loadTokens', () => {
    test('returns null when no tokens file exists', () => {
      expect(loadTokens()).toBeNull();
    });

    test('loads valid tokens from file', () => {
      const now = new Date();
      const tokensContent = {
        accessToken: 'access123',
        refreshToken: 'refresh456',
        expiresAt: now.toISOString(),
      };

      fixturify.writeSync(tmpDir, {
        glean: {
          'tokens.json': JSON.stringify(tokensContent),
        },
      });

      const tokens = loadTokens();
      expect(tokens).not.toBeNull();
      expect(tokens?.accessToken).toBe('access123');
      expect(tokens?.refreshToken).toBe('refresh456');
      expect(tokens?.expiresAt?.toISOString()).toBe(now.toISOString());
    });

    test('returns null for malformed tokens file', () => {
      fixturify.writeSync(tmpDir, {
        glean: {
          'tokens.json': 'invalid json',
        },
      });

      expect(loadTokens()).toBeNull();
    });

    test('handles missing optional fields', () => {
      const tokensContent = {
        accessToken: 'access123',
      };

      fixturify.writeSync(tmpDir, {
        glean: {
          'tokens.json': JSON.stringify(tokensContent),
        },
      });

      const tokens = loadTokens();
      expect(tokens).not.toBeNull();
      expect(tokens?.accessToken).toBe('access123');
      expect(tokens?.refreshToken).toBeUndefined();
      expect(tokens?.expiresAt).toBeUndefined();
    });
  });

  describe('saveTokens', () => {
    test('saves tokens to file with correct permissions', () => {
      const now = new Date();
      const tokens = new Tokens({
        accessToken: 'access123',
        refreshToken: 'refresh456',
        expiresAt: now,
      });

      saveTokens(tokens);

      // Verify file exists
      const tokensFile = path.join(stateDir, 'tokens.json');
      expect(fs.existsSync(tokensFile)).toBe(true);

      // Verify file permissions (0o600) on non-Windows platforms
      if (os.platform() !== 'win32') {
        const stats = fs.statSync(tokensFile);
        expect(stats.mode & 0o777).toBe(0o600);
      }

      // Verify content
      const savedContent = JSON.parse(fs.readFileSync(tokensFile, 'utf-8'));
      expect(savedContent).toEqual({
        accessToken: 'access123',
        refreshToken: 'refresh456',
        expiresAt: now.toISOString(),
      });
    });

    test('overwrites existing tokens file', () => {
      // First save
      const tokens1 = new Tokens({
        accessToken: 'access123',
      });
      saveTokens(tokens1);

      // Second save
      const tokens2 = new Tokens({
        accessToken: 'newaccess456',
      });
      saveTokens(tokens2);

      // Verify content was overwritten
      const tokensFile = path.join(stateDir, 'tokens.json');
      const savedContent = JSON.parse(fs.readFileSync(tokensFile, 'utf-8'));
      expect(savedContent).toEqual({
        accessToken: 'newaccess456',
      });
    });

    test('creates intermediate directories if needed', () => {
      const tokens = new Tokens({
        accessToken: 'access123',
      });

      // Remove state directory if it exists
      if (fs.existsSync(stateDir)) {
        fs.rmSync(stateDir, { recursive: true });
      }

      saveTokens(tokens);

      // Verify directory was created
      expect(fs.existsSync(stateDir)).toBe(true);
      expect(fs.existsSync(path.join(stateDir, 'tokens.json'))).toBe(true);
    });
  });
});
