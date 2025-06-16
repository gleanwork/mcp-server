import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@gleanwork/mcp-test-utils/mocks/setup';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { Logger } from '../../log/logger.js';
import {
  getConfig,
  isBasicConfig,
  isGleanTokenConfig,
  isOAuthConfig,
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
    server.resetHandlers();
    Logger.reset();
  });

  describe('without discoverOAuth option', () => {
    it('returns basic config when only instance is provided', async () => {
      process.env.GLEAN_INSTANCE = 'test-company';
      const config = await getConfig();
      expect(isBasicConfig(config)).toBe(true);
      expect(config).toMatchInlineSnapshot(`
        {
          "authType": "unknown",
          "baseUrl": "https://test-company-be.glean.com/",
        }
      `);
    });

    it('returns token config when token is provided', async () => {
      process.env.GLEAN_INSTANCE = 'test-company';
      process.env.GLEAN_API_TOKEN = 'test-token';
      const config = await getConfig();
      expect(isGleanTokenConfig(config)).toBe(true);
      expect(config).toMatchInlineSnapshot(`
        {
          "authType": "token",
          "baseUrl": "https://test-company-be.glean.com/",
          "token": "test-token",
        }
      `);
    });

    it('throws error when both token and OAuth env vars are set', async () => {
      process.env.GLEAN_INSTANCE = 'test-company';
      process.env.GLEAN_API_TOKEN = 'test-token';
      process.env.GLEAN_OAUTH_ISSUER = 'https://auth.example.com';
      process.env.GLEAN_OAUTH_CLIENT_ID = 'test-client';
      await expect(getConfig()).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Specify either GLEAN_OAUTH_ISSUER and GLEAN_OAUTH_CLIENT_ID or GLEAN_API_TOKEN, but not both.]`,
      );
    });
  });

  describe('with discoverOAuth option', () => {
    it('does not make network request for token config', async () => {
      process.env.GLEAN_INSTANCE = 'test-company';
      process.env.GLEAN_API_TOKEN = 'test-token';
      const baseUrl = 'https://test-company-be.glean.com';
      const oauthUrl = `${baseUrl}/.well-known/oauth-protected-resource`;

      // Set up a handler that will fail if called
      server.use(
        http.get(oauthUrl, () => {
          throw new Error('Network request should not be made');
        }),
      );

      const config = await getConfig({ discoverOAuth: true });
      expect(isGleanTokenConfig(config)).toBe(true);
      expect(config).toMatchInlineSnapshot(`
        {
          "authType": "token",
          "baseUrl": "https://test-company-be.glean.com/",
          "token": "test-token",
        }
      `);
    });

    it('makes network request and returns OAuth config for basic config', async () => {
      process.env.GLEAN_INSTANCE = 'test-company';
      const baseUrl = 'https://test-company-be.glean.com';
      const oauthUrl = `${baseUrl}/.well-known/oauth-protected-resource`;
      const authUrl =
        'https://auth.example.com/.well-known/openid-configuration';

      // Mock the OAuth protected resource metadata endpoint
      server.use(
        http.get(oauthUrl, () =>
          HttpResponse.json({
            authorization_servers: ['https://auth.example.com'],
            glean_device_flow_client_id: 'test-client',
          }),
        ),
        // Mock the OpenID configuration endpoint
        http.get(authUrl, () =>
          HttpResponse.json({
            device_authorization_endpoint: 'https://auth.example.com/device',
            token_endpoint: 'https://auth.example.com/token',
          }),
        ),
      );

      const config = await getConfig({ discoverOAuth: true });
      expect(isOAuthConfig(config)).toBe(true);
      expect(config).toMatchInlineSnapshot(`
        {
          "authType": "oauth",
          "authorizationEndpoint": "https://auth.example.com/device",
          "baseUrl": "https://test-company-be.glean.com/",
          "clientId": "test-client",
          "issuer": "https://auth.example.com",
          "tokenEndpoint": "https://auth.example.com/token",
        }
      `);
    });

    it('throws error when OAuth metadata fetch fails', async () => {
      process.env.GLEAN_INSTANCE = 'test-company';
      const baseUrl = 'https://test-company-be.glean.com';
      const oauthUrl = `${baseUrl}/.well-known/oauth-protected-resource`;

      // Mock the OAuth protected resource metadata endpoint to fail
      server.use(http.get(oauthUrl, () => HttpResponse.error()));

      await expect(
        getConfig({ discoverOAuth: true }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[AuthError: ERR_A_06: Unable to fetch OAuth protected resource metadata: please contact your Glean administrator and ensure device flow authorization is configured correctly.]`,
      );
    });

    it('throws error when OAuth metadata is missing required fields', async () => {
      process.env.GLEAN_INSTANCE = 'test-company';
      const baseUrl = 'https://test-company-be.glean.com';
      const oauthUrl = `${baseUrl}/.well-known/oauth-protected-resource`;

      // Mock the OAuth protected resource metadata endpoint with missing fields
      server.use(
        http.get(oauthUrl, () =>
          HttpResponse.json({
            // Missing authorization_servers
            glean_device_flow_client_id: 'test-client',
          }),
        ),
      );

      await expect(
        getConfig({ discoverOAuth: true }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[AuthError: ERR_A_09: OAuth protected resource metadata did not include any authorization servers: please contact your Glean administrator and ensure device flow authorization is configured correctly.]`,
      );
    });
  });
});
