import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { getAPIClientOptions, resetClient } from '../../common/client.js';
import { Logger } from '../../log/logger.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function setupTempXDG() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'glean-xdg-test-'));
  process.env.XDG_CONFIG_HOME = path.join(tmp, 'config');
  process.env.XDG_STATE_HOME = path.join(tmp, 'state');
  process.env.XDG_DATA_HOME = path.join(tmp, 'data');
  fs.mkdirSync(process.env.XDG_CONFIG_HOME, { recursive: true });
  fs.mkdirSync(process.env.XDG_STATE_HOME, { recursive: true });
  fs.mkdirSync(process.env.XDG_DATA_HOME, { recursive: true });
  return tmp;
}

const server = setupServer();

describe('getSDKOptions (integration, msw)', () => {
  let tmpDir: string;
  let origEnv: NodeJS.ProcessEnv;
  const ENV_VARS = [
    'GLEAN_API_TOKEN',
    'GLEAN_SUBDOMAIN',
    'GLEAN_BASE_URL',
    'GLEAN_ACT_AS',
    'GLEAN_OAUTH_CLIENT_ID',
    'GLEAN_OAUTH_ISSUER',
    'GLEAN_OAUTH_AUTHORIZATION_ENDPOINT',
    'GLEAN_OAUTH_TOKEN_ENDPOINT',
  ];
  let savedEnv: Record<string, string | undefined> = {};

  beforeAll(() => server.listen());
  afterAll(() => server.close());

  beforeEach(() => {
    origEnv = { ...process.env };
    tmpDir = setupTempXDG();
    resetClient();
    server.resetHandlers();
    savedEnv = {};
    for (const key of ENV_VARS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = origEnv;
    Logger.reset();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    server.resetHandlers();
    for (const key of ENV_VARS) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  it('should return correct SDKOptions for Glean token config (no actAs)', async () => {
    // Arrange: set env vars and config
    process.env.GLEAN_API_TOKEN = 'test-token';
    process.env.GLEAN_BASE_URL = 'https://glean.example.com';
    // No actAs

    // Act
    const opts = await getAPIClientOptions();
    expect(opts.bearerAuth).toBe('test-token');
    expect(opts.serverURL).toBe('https://glean.example.com');
    expect(opts.httpClient).toBeUndefined(); // No actAs, so no custom httpClient
  });

  it('should set X-Glean-Auth-Type header for OAuth config', async () => {
    // Arrange: set env vars and config for OAuth
    process.env.GLEAN_BASE_URL = 'https://glean.example.com';

    // Write oauth.json to XDG_STATE_HOME/glean/oauth.json
    const stateDir = path.join(process.env.XDG_STATE_HOME!, 'glean');
    fs.mkdirSync(stateDir, { recursive: true });
    const oauthMetadata = {
      baseUrl: 'https://glean.example.com',
      issuer: 'https://issuer.example.com',
      clientId: 'client-id',
      authorizationEndpoint: 'https://issuer.example.com/auth',
      tokenEndpoint: 'https://issuer.example.com/token',
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(stateDir, 'oauth.json'),
      JSON.stringify(oauthMetadata),
    );

    // Write tokens.json to XDG_STATE_HOME/glean/tokens.json
    const tokens = {
      accessToken: 'oauth-access-token',
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
    fs.writeFileSync(
      path.join(stateDir, 'tokens.json'),
      JSON.stringify(tokens),
    );

    const receivedHeaders: Record<string, string> = {};
    server.use(
      http.get('https://glean.example.com/test', ({ request }) => {
        request.headers.forEach((value, key) => {
          receivedHeaders[key] = value;
        });
        return new Response('ok', { status: 200 });
      }),
    );

    // Act
    const opts = await getAPIClientOptions();
    expect(opts.bearerAuth).toBe('oauth-access-token');
    expect(opts.serverURL).toBe('https://glean.example.com');
    expect(opts.httpClient).toBeDefined();

    // Make a request using the custom httpClient
    const req = new Request('https://glean.example.com/test');
    await opts.httpClient!.request(req);

    // Assert: headers
    expect(receivedHeaders['x-glean-auth-type']).toBe('OAUTH');
    expect(receivedHeaders['x-glean-act-as']).toBeUndefined();
    // we don't set authorization in the custom http client so nothing to test
    // here.  That's done automatically as long as we set bearerAuth, which
    // we've tested above.
  });

  it('should set X-Glean-Act-As header for Glean token config with actAs', async () => {
    process.env.GLEAN_API_TOKEN = 'test-token';
    process.env.GLEAN_BASE_URL = 'https://glean.example.com';
    process.env.GLEAN_ACT_AS = 'impersonated-user';

    const receivedHeaders: Record<string, string> = {};
    server.use(
      http.get('https://glean.example.com/test', ({ request }) => {
        request.headers.forEach((value, key) => {
          receivedHeaders[key] = value;
        });
        return new Response('ok', { status: 200 });
      }),
    );

    const opts = await getAPIClientOptions();
    expect(opts.bearerAuth).toBe('test-token');
    expect(opts.serverURL).toBe('https://glean.example.com');
    expect(opts.httpClient).toBeDefined();

    const req = new Request('https://glean.example.com/test');
    await opts.httpClient!.request(req);

    expect(receivedHeaders['x-glean-act-as']).toBe('impersonated-user');
    expect(receivedHeaders['authorization']).toBeUndefined();
    expect(receivedHeaders['x-glean-auth-type']).toBeUndefined();
  });

  it('should throw AuthError for invalid config (neither token nor OAuth)', async () => {
    process.env.GLEAN_SUBDOMAIN = 'awesome-co';
    // No env vars, no config files
    await expect(
      async () => await getAPIClientOptions(),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[AuthError: ERR_A_19: Missing or invalid Glean configuration. Please check that your environment variables are set correctly (e.g. GLEAN_SUBDOMAIN).]`,
    );
  });

  it('should throw error if both token and OAuth env vars are set (conflict)', async () => {
    process.env.GLEAN_API_TOKEN = 'test-token';
    process.env.GLEAN_BASE_URL = 'https://glean.example.com';
    process.env.GLEAN_OAUTH_CLIENT_ID = 'client-id';
    process.env.GLEAN_OAUTH_ISSUER = 'https://issuer.example.com';
    process.env.GLEAN_OAUTH_AUTHORIZATION_ENDPOINT =
      'https://issuer.example.com/auth';
    process.env.GLEAN_OAUTH_TOKEN_ENDPOINT = 'https://issuer.example.com/token';
    await expect(
      async () => await getAPIClientOptions(),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Specify either GLEAN_OAUTH_ISSUER and GLEAN_OAUTH_CLIENT_ID or GLEAN_API_TOKEN, but not both.]`,
    );
  });
});
