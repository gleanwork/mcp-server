import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/setup';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { Logger } from '../../log/logger.js';
import {
  fetchAuthorizationServerMetadata,
  fetchProtectedResourceMetadata,
} from '../../auth/auth.js';
import * as tokenStore from '../../auth/token-store.js';
import * as authModule from '../../auth/auth.js';
import * as configModule from '../../config/config.js';
import { fetchDeviceAuthorization } from '../../auth/auth.js';
import { getOAuthScopes } from '../../auth/auth.js';

// Mock getConfig rather than mock the network for these tests (see
// authorize.test.ts for those) but we don't want to mock the type guards from
// config.ts
vi.mock('../../config/config.js', async () => {
  const actual = await vi.importActual<typeof import('../../config/config.js')>(
    '../../config/config.js',
  );
  return {
    ...actual,
    getConfig: vi.fn(),
  };
});

// Helper to set up XDG temp dir
function setupXdgTemp() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-test-'));
  process.env.XDG_STATE_HOME = tmpDir;
  return tmpDir;
}

describe('auth', () => {
  let tmpDir: string;
  let originalXdgStateHome: string | undefined;

  beforeEach(() => {
    originalXdgStateHome = process.env.XDG_STATE_HOME;
    tmpDir = setupXdgTemp();
  });

  afterEach(() => {
    if (originalXdgStateHome) {
      process.env.XDG_STATE_HOME = originalXdgStateHome;
    } else {
      delete process.env.XDG_STATE_HOME;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    server.resetHandlers();
    Logger.reset();
  });

  describe('OAuth metadata fetchers', () => {
    describe('fetchAuthorizationServerMetadata', () => {
      const issuer = 'https://auth.example.com';
      const openidUrl = `${issuer}/.well-known/openid-configuration`;
      const oauthUrl = `${issuer}/.well-known/oauth-authorization-server`;

      it('returns endpoints on success from openid-configuration', async () => {
        server.use(
          http.get(openidUrl, () =>
            HttpResponse.json({
              device_authorization_endpoint: 'https://auth.example.com/device',
              token_endpoint: 'https://auth.example.com/token',
            }),
          ),
        );
        const result = await fetchAuthorizationServerMetadata(issuer);
        expect(result).toMatchInlineSnapshot(`
        {
          "deviceAuthorizationEndpoint": "https://auth.example.com/device",
          "tokenEndpoint": "https://auth.example.com/token",
        }
      `);
      });

      it('falls back to oauth-authorization-server on network error from openid-configuration', async () => {
        server.use(
          http.get(openidUrl, () => {
            return HttpResponse.error();
          }),
          http.get(oauthUrl, () =>
            HttpResponse.json({
              device_authorization_endpoint: 'https://auth.example.com/device',
              token_endpoint: 'https://auth.example.com/token',
            }),
          ),
        );
        const result = await fetchAuthorizationServerMetadata(issuer);
        expect(result).toMatchInlineSnapshot(`
        {
          "deviceAuthorizationEndpoint": "https://auth.example.com/device",
          "tokenEndpoint": "https://auth.example.com/token",
        }
      `);
      });

      it('falls back to oauth-authorization-server on non-ok response from openid-configuration', async () => {
        server.use(
          http.get(openidUrl, () => new HttpResponse(null, { status: 500 })),
          http.get(oauthUrl, () =>
            HttpResponse.json({
              device_authorization_endpoint: 'https://auth.example.com/device',
              token_endpoint: 'https://auth.example.com/token',
            }),
          ),
        );
        const result = await fetchAuthorizationServerMetadata(issuer);
        expect(result).toMatchInlineSnapshot(`
        {
          "deviceAuthorizationEndpoint": "https://auth.example.com/device",
          "tokenEndpoint": "https://auth.example.com/token",
        }
      `);
      });

      it('throws with actionable error if both endpoints fail', async () => {
        server.use(
          http.get(openidUrl, () => HttpResponse.error()),
          http.get(oauthUrl, () => HttpResponse.error()),
        );
        await expect(
          fetchAuthorizationServerMetadata(issuer),
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `[AuthError: ERR_A_02: Unable to fetch OAuth authorization server metadata: please contact your Glean administrator and ensure device flow authorization is configured correctly.]`,
        );
      });

      it('does not fall back if openid-configuration returns ok but is not JSON (parse error)', async () => {
        server.use(
          http.get(openidUrl, () => HttpResponse.text('not json')),
          http.get(oauthUrl, () =>
            HttpResponse.json({
              device_authorization_endpoint: 'https://auth.example.com/device',
              token_endpoint: 'https://auth.example.com/token',
            }),
          ),
        );
        await expect(
          fetchAuthorizationServerMetadata(issuer),
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `[AuthError: ERR_A_03: Unable to fetch OAuth authorization server metadata: please contact your Glean administrator and ensure device flow authorization is configured correctly.]`,
        );
      });

      it('throws with actionable error if openid-configuration is missing token endpoint (no fallback)', async () => {
        server.use(
          http.get(openidUrl, () =>
            HttpResponse.json({
              device_authorization_endpoint: 'https://auth.example.com/device',
            }),
          ),
          http.get(oauthUrl, () =>
            HttpResponse.json({
              device_authorization_endpoint: 'https://auth.example.com/device',
              token_endpoint: 'https://auth.example.com/token',
            }),
          ),
        );
        await expect(
          fetchAuthorizationServerMetadata(issuer),
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `[AuthError: ERR_A_04: OAuth authorization server metadata did not include a token endpoint: please contact your Glean administrator and ensure device flow authorization is configured correctly.]`,
        );
      });

      it('throws with actionable error if openid-configuration is missing device endpoint (no fallback)', async () => {
        server.use(
          http.get(openidUrl, () =>
            HttpResponse.json({
              token_endpoint: 'https://auth.example.com/token',
            }),
          ),
          http.get(oauthUrl, () =>
            HttpResponse.json({
              device_authorization_endpoint: 'https://auth.example.com/device',
              token_endpoint: 'https://auth.example.com/token',
            }),
          ),
        );
        await expect(
          fetchAuthorizationServerMetadata(issuer),
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `[AuthError: ERR_A_05: OAuth authorization server metadata did not include a device authorization endpoint: please contact your Glean administrator and ensure device flow authorization is configured correctly.]`,
        );
      });

      it('throws with actionable error if oauth-authorization-server is missing token endpoint', async () => {
        server.use(
          http.get(openidUrl, () => HttpResponse.error()),
          http.get(oauthUrl, () =>
            HttpResponse.json({
              device_authorization_endpoint: 'https://auth.example.com/device',
            }),
          ),
        );
        await expect(
          fetchAuthorizationServerMetadata(issuer),
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `[AuthError: ERR_A_04: OAuth authorization server metadata did not include a token endpoint: please contact your Glean administrator and ensure device flow authorization is configured correctly.]`,
        );
      });

      it('throws with actionable error if oauth-authorization-server is missing device endpoint', async () => {
        server.use(
          http.get(openidUrl, () => HttpResponse.error()),
          http.get(oauthUrl, () =>
            HttpResponse.json({
              token_endpoint: 'https://auth.example.com/token',
            }),
          ),
        );
        await expect(
          fetchAuthorizationServerMetadata(issuer),
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `[AuthError: ERR_A_05: OAuth authorization server metadata did not include a device authorization endpoint: please contact your Glean administrator and ensure device flow authorization is configured correctly.]`,
        );
      });
    });

    describe('fetchProtectedResourceMetadata', () => {
      const baseUrl = 'https://api.example.com';
      const config = { baseUrl } as any; // Only baseUrl is used
      const url = `${new URL(baseUrl).origin}/.well-known/oauth-protected-resource`;

      it('returns issuer and clientId on success', async () => {
        server.use(
          http.get(url, () =>
            HttpResponse.json({
              authorization_servers: ['https://auth.example.com'],
              glean_device_flow_client_id: 'client-123',
            }),
          ),
        );
        const result = await fetchProtectedResourceMetadata(config);
        expect(result).toEqual({
          issuer: 'https://auth.example.com',
          clientId: 'client-123',
        });
      });

      it('throws with actionable error if fetch fails', async () => {
        server.use(http.get(url, () => HttpResponse.error()));
        await expect(fetchProtectedResourceMetadata(config)).rejects.toThrow(
          /please contact your Glean administrator and ensure device flow authorization is configured correctly/,
        );
      });

      it('throws with actionable error if authorization_servers missing', async () => {
        server.use(
          http.get(url, () =>
            HttpResponse.json({ glean_device_flow_client_id: 'client-123' }),
          ),
        );
        await expect(fetchProtectedResourceMetadata(config)).rejects.toThrow(
          /authorization servers.*please contact your Glean administrator and ensure device flow authorization is configured correctly/,
        );
      });

      it('throws with actionable error if client id missing', async () => {
        server.use(
          http.get(url, () =>
            HttpResponse.json({
              authorization_servers: ['https://auth.example.com'],
            }),
          ),
        );
        await expect(fetchProtectedResourceMetadata(config)).rejects.toThrow(
          /device flow client id.*please contact your Glean administrator and ensure device flow authorization is configured correctly/,
        );
      });

      it('throws with actionable error if response is not JSON', async () => {
        server.use(http.get(url, () => HttpResponse.text('not json')));
        await expect(fetchProtectedResourceMetadata(config)).rejects.toThrow(
          /Unexpected OAuth protected resource metadata.*please contact your Glean administrator and ensure device flow authorization is configured correctly/,
        );
      });
    });
  });

  describe('forceRefreshTokens', () => {
    const tokenEndpoint = 'https://auth.example.com/token';
    const validTokens = {
      accessToken: 'old-access',
      refreshToken: 'refresh-123',
      expiresAt: Date.now() + 10000,
    };
    const refreshedResponse = {
      access_token: 'new-access',
      refresh_token: 'refresh-456',
      expires_in: 3600,
      token_type: 'Bearer',
    };
    let loadTokensSpy: ReturnType<typeof vi.spyOn>;
    let saveTokensSpy: ReturnType<typeof vi.spyOn>;
    let getConfig: any;

    beforeEach(() => {
      // Mock token store
      loadTokensSpy = vi.spyOn(tokenStore, 'loadTokens');
      saveTokensSpy = vi.spyOn(tokenStore, 'saveTokens');
      // Mock config helper
      getConfig = (configModule as any).getConfig;
      // Default: returns valid OAuth config
      getConfig.mockReturnValue({
        clientId: 'client-123',
        tokenEndpoint,
        authType: 'oauth',
        baseUrl: 'https://api.example.com',
        issuer: 'https://auth.example.com',
        authorizationEndpoint: 'https://auth.example.com/device',
      });
      saveTokensSpy.mockReset();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      server.resetHandlers();
    });

    it('refreshes token and saves new tokens on success', async () => {
      loadTokensSpy.mockReturnValue(validTokens);
      server.use(
        http.post(tokenEndpoint, async () =>
          HttpResponse.json(refreshedResponse),
        ),
      );
      const { forceRefreshTokens } = authModule;
      await forceRefreshTokens();
      expect(saveTokensSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'new-access',
          refreshToken: 'refresh-456',
        }),
      );
    });

    it('throws if no tokens are saved', async () => {
      loadTokensSpy.mockReturnValue(null);
      const { forceRefreshTokens } = authModule;
      await expect(forceRefreshTokens()).rejects.toThrow(
        'ERR_A_12: Cannot refresh: unable to locate refresh token.',
      );
    });

    it('throws if no refresh token is present', async () => {
      loadTokensSpy.mockReturnValue({
        ...validTokens,
        refreshToken: undefined,
      });
      const { forceRefreshTokens } = authModule;
      await expect(forceRefreshTokens()).rejects.toThrow(
        'ERR_A_13: Cannot refresh: no refresh token provided.',
      );
    });

    it('throws with server error message if refresh fails', async () => {
      loadTokensSpy.mockReturnValue(validTokens);
      server.use(
        http.post(tokenEndpoint, async () =>
          HttpResponse.json({ error: 'invalid_grant' }, { status: 400 }),
        ),
      );
      const { forceRefreshTokens } = authModule;
      await expect(forceRefreshTokens()).rejects.toThrow(
        /ERR_A_15: Unable to fetch token/,
      );
    });

    it('throws if config is token config', async () => {
      getConfig.mockReturnValue({
        authType: 'token',
        baseUrl: 'https://api.example.com',
        token: 'token-abc',
      });
      const { forceRefreshTokens } = authModule;
      await expect(forceRefreshTokens()).rejects.toThrow(
        /ERR_A_11: Cannot refresh OAuth access token when using glean-token configuration/,
      );
    });
  });

  describe('validateAuthorization', () => {
    const tokenEndpoint = 'https://auth.example.com/token';
    const validTokens = {
      accessToken: 'old-access',
      refreshToken: 'refresh-123',
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour in future
      isExpired: () => false,
    };
    const expiredTokensWithRefresh = {
      accessToken: 'old-access',
      refreshToken: 'refresh-123',
      expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour in past
      isExpired: () => true,
    };
    const expiredTokensNoRefresh = {
      accessToken: 'old-access',
      expiresAt: new Date(Date.now() - 3600 * 1000),
      isExpired: () => true,
    };
    const refreshedResponse = {
      access_token: 'new-access',
      refresh_token: 'refresh-456',
      expires_in: 3600,
      token_type: 'Bearer',
    };
    let loadTokensSpy: ReturnType<typeof vi.spyOn>;
    let saveTokensSpy: ReturnType<typeof vi.spyOn>;
    let getConfig: any;

    beforeEach(() => {
      loadTokensSpy = vi.spyOn(tokenStore, 'loadTokens');
      saveTokensSpy = vi.spyOn(tokenStore, 'saveTokens');
      getConfig = (configModule as any).getConfig;
      getConfig.mockReturnValue({
        clientId: 'client-123',
        tokenEndpoint,
        authType: 'oauth',
        baseUrl: 'https://api.example.com',
        issuer: 'https://auth.example.com',
        authorizationEndpoint: 'https://auth.example.com/device',
      });
      saveTokensSpy.mockReset();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      server.resetHandlers();
    });

    it('returns true for non-expired tokens (no refresh)', async () => {
      loadTokensSpy.mockReturnValue(validTokens);
      const { ensureAuthTokenPresence: validateAuthorization } = authModule;
      const result = await validateAuthorization();
      expect(result).toBe(true);
      expect(saveTokensSpy).not.toHaveBeenCalled();
    });

    it('refreshes and returns true for expired tokens with refresh token', async () => {
      loadTokensSpy
        .mockReturnValueOnce(expiredTokensWithRefresh)
        .mockReturnValueOnce({
          ...validTokens,
          accessToken: 'new-access',
          refreshToken: 'refresh-456',
          isExpired: () => false,
        });
      server.use(
        http.post(tokenEndpoint, async () =>
          HttpResponse.json(refreshedResponse),
        ),
      );
      const { ensureAuthTokenPresence: validateAuthorization } = authModule;
      const result = await validateAuthorization();
      expect(result).toBe(true);
      expect(saveTokensSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'new-access',
          refreshToken: 'refresh-456',
        }),
      );
    });

    it('throws for expired tokens without refresh token', async () => {
      loadTokensSpy.mockReturnValue(expiredTokensNoRefresh);
      const { ensureAuthTokenPresence: validateAuthorization } = authModule;
      await expect(validateAuthorization()).rejects.toThrow(
        'ERR_A_13: Cannot refresh: no refresh token provided.',
      );
    });
  });

  describe('fetchDeviceAuthorization', () => {
    const authorizationEndpoint = 'https://auth.example.com/device';
    const config = {
      clientId: 'client-123',
      authorizationEndpoint,
      tokenEndpoint: 'https://auth.example.com/token',
      authType: 'oauth',
      baseUrl: 'https://api.example.com',
      issuer: 'https://auth.example.com',
    };

    afterEach(() => {
      server.resetHandlers();
      Logger.reset();
    });

    it('returns AuthResponse as-is when verification_uri is present', async () => {
      server.use(
        http.post(authorizationEndpoint, async () =>
          HttpResponse.json({
            device_code: 'dev-123',
            expires_in: 600,
            interval: 5,
            user_code: 'user-abc',
            // Okta uses verification_uri
            verification_uri: 'https://verify.example.com',
          }),
        ),
      );
      const result = await fetchDeviceAuthorization(config as any);
      expect(result).toMatchInlineSnapshot(`
      {
        "device_code": "dev-123",
        "expires_in": 600,
        "interval": 5,
        "user_code": "user-abc",
        "verification_uri": "https://verify.example.com",
      }
    `);
    });

    it('normalizes verification_url to verification_uri when present', async () => {
      server.use(
        http.post(authorizationEndpoint, async () =>
          HttpResponse.json({
            device_code: 'dev-456',
            expires_in: 900,
            interval: 7,
            user_code: 'user-def',
            // Google uses verification_url
            verification_url: 'https://verify-url.example.com',
          }),
        ),
      );
      const result = await fetchDeviceAuthorization(config as any);
      expect(result).toMatchInlineSnapshot(`
      {
        "device_code": "dev-456",
        "expires_in": 900,
        "interval": 7,
        "user_code": "user-def",
        "verification_uri": "https://verify-url.example.com",
      }
    `);
    });
  });

  describe('getOAuthScopes', () => {
    it('returns Google scopes for google.com issuer', () => {
      const config = {
        issuer: 'https://accounts.google.com',
        clientId: 'client-123',
        authorizationEndpoint: 'https://accounts.google.com/device',
        tokenEndpoint: 'https://accounts.google.com/token',
        authType: 'oauth' as const,
        baseUrl: 'https://api.example.com',
      };
      expect(getOAuthScopes(config)).toMatchInlineSnapshot(
        `"openid profile https://www.googleapis.com/auth/userinfo.email"`,
      );
    });

    it('returns Okta scopes for okta.com issuer', () => {
      const config = {
        issuer: 'https://dev-123456.okta.com',
        clientId: 'client-123',
        authorizationEndpoint: 'https://dev-123456.okta.com/device',
        tokenEndpoint: 'https://dev-123456.okta.com/token',
        authType: 'oauth' as const,
        baseUrl: 'https://api.example.com',
      };
      expect(getOAuthScopes(config)).toMatchInlineSnapshot(
        `"openid profile offline_access"`,
      );
    });

    it('returns default scopes for unknown issuer', () => {
      const config = {
        issuer: 'https://login.microsoftonline.com',
        clientId: 'client-123',
        authorizationEndpoint: 'https://login.microsoftonline.com/device',
        tokenEndpoint: 'https://login.microsoftonline.com/token',
        authType: 'oauth' as const,
        baseUrl: 'https://api.example.com',
      };
      expect(getOAuthScopes(config)).toMatchInlineSnapshot(`"openid profile"`);
    });
  });

  describe('forceRefreshTokens with clientSecret', () => {
    const tokenEndpoint = 'https://auth.example.com/token';
    const validTokens = {
      accessToken: 'old-access',
      refreshToken: 'refresh-123',
      expiresAt: Date.now() + 10000,
    };
    const refreshedResponse = {
      access_token: 'new-access',
      refresh_token: 'refresh-456',
      expires_in: 3600,
      token_type: 'Bearer',
    };
    let loadTokensSpy: ReturnType<typeof vi.spyOn>;
    let saveTokensSpy: ReturnType<typeof vi.spyOn>;
    let getConfig: any;

    beforeEach(() => {
      loadTokensSpy = vi.spyOn(tokenStore, 'loadTokens');
      saveTokensSpy = vi.spyOn(tokenStore, 'saveTokens');
      getConfig = (configModule as any).getConfig;
      getConfig.mockReturnValue({
        clientId: 'client-123',
        clientSecret: 'secret-xyz',
        tokenEndpoint,
        authType: 'oauth',
        baseUrl: 'https://api.example.com',
        issuer: 'https://auth.example.com',
        authorizationEndpoint: 'https://auth.example.com/device',
      });
      saveTokensSpy.mockReset();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      server.resetHandlers();
    });

    it('includes client_secret in refresh token request body if present', async () => {
      loadTokensSpy.mockReturnValue(validTokens);
      let requestBody: string | undefined;
      server.use(
        http.post(tokenEndpoint, async ({ request }) => {
          requestBody = await request.text();
          return HttpResponse.json(refreshedResponse);
        }),
      );
      const { forceRefreshTokens } = authModule;
      await forceRefreshTokens();
      expect(requestBody).toContain('client_secret=secret-xyz');
    });

    it('does not include client_secret if not present', async () => {
      getConfig.mockReturnValue({
        clientId: 'client-123',
        tokenEndpoint,
        authType: 'oauth',
        baseUrl: 'https://api.example.com',
        issuer: 'https://auth.example.com',
        authorizationEndpoint: 'https://auth.example.com/device',
      });
      loadTokensSpy.mockReturnValue(validTokens);
      let requestBody: string | undefined;
      server.use(
        http.post(tokenEndpoint, async ({ request }) => {
          requestBody = await request.text();
          return HttpResponse.json(refreshedResponse);
        }),
      );
      const { forceRefreshTokens } = authModule;
      await forceRefreshTokens();
      expect(requestBody).not.toContain('client_secret=');
    });
  });

  describe('fetchDeviceAuthorization with clientSecret', () => {
    const authorizationEndpoint = 'https://auth.example.com/device';
    const configWithSecret = {
      clientId: 'client-123',
      clientSecret: 'secret-xyz',
      authorizationEndpoint,
      tokenEndpoint: 'https://auth.example.com/token',
      authType: 'oauth',
      baseUrl: 'https://api.example.com',
      issuer: 'https://auth.example.com',
    };

    afterEach(() => {
      server.resetHandlers();
      Logger.reset();
    });

    it('does not include client_secret in device authorization request body even if present', async () => {
      let requestBody: string | undefined;
      server.use(
        http.post(authorizationEndpoint, async ({ request }) => {
          requestBody = await request.text();
          return HttpResponse.json({
            device_code: 'dev-789',
            expires_in: 600,
            interval: 5,
            user_code: 'user-ghi',
            verification_uri: 'https://verify.example.com',
          });
        }),
      );
      const result = await fetchDeviceAuthorization(configWithSecret as any);
      // /token needs the client secret
      // but not /device/code
      expect(requestBody).not.toContain('client_secret=secret-xyz');
      expect(result).toMatchInlineSnapshot(`
      {
        "device_code": "dev-789",
        "expires_in": 600,
        "interval": 5,
        "user_code": "user-ghi",
        "verification_uri": "https://verify.example.com",
      }
    `);
    });
  });
});
