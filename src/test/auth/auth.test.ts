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

describe('OAuth metadata fetchers', () => {
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

  describe('fetchAuthorizationServerMetadata', () => {
    const issuer = 'https://auth.example.com';
    const url = `${issuer}/.well-known/oauth-authorization-server`;

    it('returns endpoints on success', async () => {
      server.use(
        http.get(url, () =>
          HttpResponse.json({
            device_authorization_endpoint: 'https://auth.example.com/device',
            token_endpoint: 'https://auth.example.com/token',
          }),
        ),
      );
      const result = await fetchAuthorizationServerMetadata(issuer);
      expect(result).toEqual({
        deviceAuthorizationEndpoint: 'https://auth.example.com/device',
        tokenEndpoint: 'https://auth.example.com/token',
      });
    });

    it('throws with actionable error if fetch fails', async () => {
      server.use(http.get(url, () => HttpResponse.error()));
      await expect(fetchAuthorizationServerMetadata(issuer)).rejects.toThrow(
        /please contact your Glean administrator and ensure device flow authorization is configured correctly/,
      );
    });

    it('throws with actionable error if token endpoint missing', async () => {
      server.use(
        http.get(url, () =>
          HttpResponse.json({
            device_authorization_endpoint: 'https://auth.example.com/device',
          }),
        ),
      );
      await expect(fetchAuthorizationServerMetadata(issuer)).rejects.toThrow(
        /token endpoint.*please contact your Glean administrator and ensure device flow authorization is configured correctly/,
      );
    });

    it('throws with actionable error if device endpoint missing', async () => {
      server.use(
        http.get(url, () =>
          HttpResponse.json({
            token_endpoint: 'https://auth.example.com/token',
          }),
        ),
      );
      await expect(fetchAuthorizationServerMetadata(issuer)).rejects.toThrow(
        /device authorization endpoint.*please contact your Glean administrator and ensure device flow authorization is configured correctly/,
      );
    });

    it('throws with actionable error if response is not JSON', async () => {
      server.use(http.get(url, () => HttpResponse.text('not json')));
      await expect(fetchAuthorizationServerMetadata(issuer)).rejects.toThrow(
        /please contact your Glean administrator and ensure device flow authorization is configured correctly/,
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
    loadTokensSpy.mockReturnValue({ ...validTokens, refreshToken: undefined });
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
