import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { Logger } from '../../log/logger.js';
import { forceAuthorize } from '../../auth/auth.js';

// Mock 'open' (npm package)
vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

// Mock 'node:readline' to simulate pressing Enter
vi.mock('node:readline', () => ({
  default: {
    createInterface: () => ({
      once: (_event: string, cb: () => void) => cb(),
      close: () => {},
    }),
  },
}));

// Setup MSW server (handlers will be set per test)
const server = setupServer();

function setupXdgTemp() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glean-xdg-test-'));
  process.env.XDG_DATA_HOME = path.join(tmpDir, 'data');
  process.env.XDG_STATE_HOME = path.join(tmpDir, 'state');
  process.env.XDG_CONFIG_HOME = path.join(tmpDir, 'config');
  fs.mkdirSync(process.env.XDG_DATA_HOME, { recursive: true });
  fs.mkdirSync(process.env.XDG_STATE_HOME, { recursive: true });
  fs.mkdirSync(process.env.XDG_CONFIG_HOME, { recursive: true });
  return tmpDir;
}

describe('authorize (device flow)', () => {
  let tmpDir: string;
  let originalXdgData: string | undefined;
  let originalXdgState: string | undefined;
  let originalXdgConfig: string | undefined;
  let originalBaseUrl: string | undefined;
  let originalIsTTY: boolean | undefined;

  beforeAll(() => server.listen());
  afterAll(() => server.close());

  beforeEach(() => {
    vi.useFakeTimers();
    originalXdgData = process.env.XDG_DATA_HOME;
    originalXdgState = process.env.XDG_STATE_HOME;
    originalXdgConfig = process.env.XDG_CONFIG_HOME;
    originalBaseUrl = process.env.GLEAN_BASE_URL;
    tmpDir = setupXdgTemp();
    process.env.GLEAN_BASE_URL = 'https://glean.example.com';
    // Mock process.stdin.isTTY to true for all tests by default
    originalIsTTY = Object.getOwnPropertyDescriptor(
      process.stdin,
      'isTTY',
    )?.value;
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.runAllTicks(); // Ensure all microtasks are flushed to avoid unhandled rejection warning
    vi.useRealTimers();
    if (originalXdgData) process.env.XDG_DATA_HOME = originalXdgData;
    else delete process.env.XDG_DATA_HOME;
    if (originalXdgState) process.env.XDG_STATE_HOME = originalXdgState;
    else delete process.env.XDG_STATE_HOME;
    if (originalXdgConfig) process.env.XDG_CONFIG_HOME = originalXdgConfig;
    else delete process.env.XDG_CONFIG_HOME;
    if (originalBaseUrl) process.env.GLEAN_BASE_URL = originalBaseUrl;
    else delete process.env.GLEAN_BASE_URL;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    server.resetHandlers();
    Logger.reset();
    vi.clearAllMocks();
    // Restore process.stdin.isTTY
    if (originalIsTTY === undefined) {
      delete (process.stdin as any).isTTY;
    } else {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
    }
  });

  it('should complete the device flow and save tokens (happy path)', async () => {
    // --- Arrange ---
    const baseUrl = 'https://glean.example.com';
    const issuer = 'https://auth.example.com';
    const clientId = 'client-123';
    const deviceAuthorizationEndpoint = 'https://auth.example.com/device';
    const tokenEndpoint = 'https://auth.example.com/token';
    const deviceCode = 'device-code-abc';
    const userCode = 'user-code-xyz';
    const verificationUri = 'https://auth.example.com/verify';
    const interval = 5; // seconds
    const expiresIn = 3600;
    const accessToken = 'access-token-123';
    const refreshToken = 'refresh-token-456';

    // 1. Mock protected resource metadata
    server.use(
      http.get(`${baseUrl}/.well-known/oauth-protected-resource`, () =>
        HttpResponse.json({
          authorization_servers: [issuer],
          glean_device_flow_client_id: clientId,
        }),
      ),
      // 2. Mock authorization server metadata
      http.get(`${issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.json({
          device_authorization_endpoint: deviceAuthorizationEndpoint,
          token_endpoint: tokenEndpoint,
        }),
      ),
      // 3. Mock device authorization endpoint
      http.post(deviceAuthorizationEndpoint, async () =>
        HttpResponse.json({
          device_code: deviceCode,
          user_code: userCode,
          verification_uri: verificationUri,
          expires_in: 600,
          interval,
        }),
      ),
      // 4. Mock token polling endpoint
      http.post(tokenEndpoint, async ({ request }) => {
        const body = await request.text();
        // return success iff device_code is correct
        if (body.includes(`device_code=${deviceCode}`)) {
          return HttpResponse.json({
            token_type: 'Bearer',
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn,
          });
        }
        return HttpResponse.json({
          error: 'authorization_pending',
          error_description: 'pending',
        });
      }),
    );

    // --- Act ---
    const open = (await import('open')).default;
    const resultPromise = forceAuthorize();
    // Simulate user prompt and polling
    await vi.runAllTimersAsync();
    const tokens = await resultPromise;

    // --- Assert ---
    // 1. open was called with the correct verification URI
    expect(open).toHaveBeenCalledWith(verificationUri);
    // 2. tokens object is correct
    expect(tokens).not.toBeNull();
    expect(tokens?.accessToken).toBe(accessToken);
    expect(tokens?.refreshToken).toBe(refreshToken);
    expect(tokens?.expiresAt).toBeInstanceOf(Date);
    // 3. tokens file was written and contains correct data
    const tokensFile = path.join(
      process.env.XDG_STATE_HOME!,
      'glean',
      'tokens.json',
    );
    expect(fs.existsSync(tokensFile)).toBe(true);
    const fileContent = JSON.parse(fs.readFileSync(tokensFile, 'utf-8'));
    expect(fileContent.accessToken).toBe(accessToken);
    expect(fileContent.refreshToken).toBe(refreshToken);
    expect(new Date(fileContent.expiresAt)).toEqual(tokens!.expiresAt);
  });

  it('should throw with correct message if protected resource metadata fails', async () => {
    const baseUrl = 'https://glean.example.com';
    // Mock protected resource metadata to fail
    server.use(
      http.get(`${baseUrl}/.well-known/oauth-protected-resource`, () =>
        HttpResponse.error(),
      ),
    );
    // Act & Assert
    await expect(forceAuthorize()).rejects.toThrow(
      /Unable to fetch OAuth protected resource metadata: please contact your Glean administrator and ensure device flow authorization is configured correctly/,
    );
  });

  it('should throw with correct message if authorization server metadata fails', async () => {
    const baseUrl = 'https://glean.example.com';
    const issuer = 'https://auth.example.com';
    const clientId = 'client-123';
    // Mock protected resource metadata to succeed
    server.use(
      http.get(`${baseUrl}/.well-known/oauth-protected-resource`, () =>
        HttpResponse.json({
          authorization_servers: [issuer],
          glean_device_flow_client_id: clientId,
        }),
      ),
      // Mock authorization server metadata to fail
      http.get(`${issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.error(),
      ),
    );
    // Act & Assert
    await expect(forceAuthorize()).rejects.toThrow(
      /Unable to fetch OAuth authorization server metadata: please contact your Glean administrator and ensure device flow authorization is configured correctly/,
    );
  });

  it('should throw with correct message if device authorization fails', async () => {
    const baseUrl = 'https://glean.example.com';
    const issuer = 'https://auth.example.com';
    const clientId = 'client-123';
    const deviceAuthorizationEndpoint = 'https://auth.example.com/device';
    const tokenEndpoint = 'https://auth.example.com/token';
    // Mock protected resource metadata to succeed
    server.use(
      http.get(`${baseUrl}/.well-known/oauth-protected-resource`, () =>
        HttpResponse.json({
          authorization_servers: [issuer],
          glean_device_flow_client_id: clientId,
        }),
      ),
      // Mock authorization server metadata to succeed
      http.get(`${issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.json({
          device_authorization_endpoint: deviceAuthorizationEndpoint,
          token_endpoint: tokenEndpoint,
        }),
      ),
      // Mock device authorization endpoint to fail
      http.post(deviceAuthorizationEndpoint, () => HttpResponse.error()),
    );
    // Act & Assert
    await expect(forceAuthorize()).rejects.toThrowError(
      /Unexpected error obtaining authorization token/,
    );
  });

  it('should throw with correct message if token polling fails', async () => {
    const baseUrl = 'https://glean.example.com';
    const issuer = 'https://auth.example.com';
    const clientId = 'client-123';
    const deviceAuthorizationEndpoint = 'https://auth.example.com/device';
    const tokenEndpoint = 'https://auth.example.com/token';
    const deviceCode = 'device-code-abc';
    const userCode = 'user-code-xyz';
    const verificationUri = 'https://auth.example.com/verify';
    const interval = 5;
    // Mock protected resource metadata to succeed
    server.use(
      http.get(`${baseUrl}/.well-known/oauth-protected-resource`, () =>
        HttpResponse.json({
          authorization_servers: [issuer],
          glean_device_flow_client_id: clientId,
        }),
      ),
      // Mock authorization server metadata to succeed
      http.get(`${issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.json({
          device_authorization_endpoint: deviceAuthorizationEndpoint,
          token_endpoint: tokenEndpoint,
        }),
      ),
      // Mock device authorization endpoint to succeed
      http.post(deviceAuthorizationEndpoint, () =>
        HttpResponse.json({
          device_code: deviceCode,
          user_code: userCode,
          verification_uri: verificationUri,
          expires_in: 600,
          interval,
        }),
      ),
      // Mock token polling endpoint to return a non-authorization_pending error
      http.post(tokenEndpoint, async ({ request }) => {
        const body = await request.text();
        if (body.includes(`device_code=${deviceCode}`)) {
          return HttpResponse.json({
            error: 'expired_token',
            error_description: 'The device code has expired',
          });
        }
        return HttpResponse.json({
          error: 'authorization_pending',
          error_description: 'pending',
        });
      }),
    );
    // Act & Assert
    const resultPromise = forceAuthorize();
    await expect(resultPromise).rejects.toThrow(
      /Unexpected error requesting authorization grant/,
    );
  });

  it('should poll until user enters code, respecting interval, then succeed', async () => {
    const baseUrl = 'https://glean.example.com';
    const issuer = 'https://auth.example.com';
    const clientId = 'client-123';
    const deviceAuthorizationEndpoint = 'https://auth.example.com/device';
    const tokenEndpoint = 'https://auth.example.com/token';
    const deviceCode = 'device-code-abc';
    const userCode = 'user-code-xyz';
    const verificationUri = 'https://auth.example.com/verify';
    const interval = 5; // seconds
    const expiresIn = 3600;
    const accessToken = 'access-token-123';
    const refreshToken = 'refresh-token-456';
    let pollCount = 0;
    // Mock protected resource metadata to succeed
    server.use(
      http.get(`${baseUrl}/.well-known/oauth-protected-resource`, () =>
        HttpResponse.json({
          authorization_servers: [issuer],
          glean_device_flow_client_id: clientId,
        }),
      ),
      // Mock authorization server metadata to succeed
      http.get(`${issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.json({
          device_authorization_endpoint: deviceAuthorizationEndpoint,
          token_endpoint: tokenEndpoint,
        }),
      ),
      // Mock device authorization endpoint to succeed
      http.post(deviceAuthorizationEndpoint, () =>
        HttpResponse.json({
          device_code: deviceCode,
          user_code: userCode,
          verification_uri: verificationUri,
          expires_in: 600,
          interval,
        }),
      ),
      // Mock token polling endpoint: return 'authorization_pending' for first 3 polls, then success
      http.post(tokenEndpoint, async ({ request }) => {
        const body = await request.text();
        if (body.includes(`device_code=${deviceCode}`)) {
          pollCount++;
          if (pollCount < 4) {
            return HttpResponse.json({
              error: 'authorization_pending',
              error_description: 'pending',
            });
          } else {
            return HttpResponse.json({
              token_type: 'Bearer',
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_in: expiresIn,
            });
          }
        }
        return HttpResponse.json({
          error: 'authorization_pending',
          error_description: 'pending',
        });
      }),
    );
    // Act
    const open = (await import('open')).default;
    const resultPromise = forceAuthorize();
    // Simulate user prompt and polling
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(interval * 1000);
    }
    const tokens = await resultPromise;
    // Assert
    expect(open).toHaveBeenCalledWith(verificationUri);
    expect(tokens).not.toBeNull();
    expect(tokens?.accessToken).toBe(accessToken);
    expect(tokens?.refreshToken).toBe(refreshToken);
    expect(tokens?.expiresAt).toBeInstanceOf(Date);
    expect(pollCount).toBe(4);
  });

  it('should throw a user-friendly error if polling times out after 10 minutes', async () => {
    const baseUrl = 'https://glean.example.com';
    const issuer = 'https://auth.example.com';
    const clientId = 'client-123';
    const deviceAuthorizationEndpoint = 'https://auth.example.com/device';
    const tokenEndpoint = 'https://auth.example.com/token';
    const deviceCode = 'device-code-abc';
    const userCode = 'user-code-xyz';
    const verificationUri = 'https://auth.example.com/verify';
    const interval = 5; // seconds
    let pollCount = 0;
    // Mock protected resource metadata to succeed
    server.use(
      http.get(`${baseUrl}/.well-known/oauth-protected-resource`, () =>
        HttpResponse.json({
          authorization_servers: [issuer],
          glean_device_flow_client_id: clientId,
        }),
      ),
      // Mock authorization server metadata to succeed
      http.get(`${issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.json({
          device_authorization_endpoint: deviceAuthorizationEndpoint,
          token_endpoint: tokenEndpoint,
        }),
      ),
      // Mock device authorization endpoint to succeed
      http.post(deviceAuthorizationEndpoint, () =>
        HttpResponse.json({
          device_code: deviceCode,
          user_code: userCode,
          verification_uri: verificationUri,
          expires_in: 600,
          interval,
        }),
      ),
      // Mock token polling endpoint: always return 'authorization_pending' and count calls
      http.post(tokenEndpoint, async ({ request }) => {
        const body = await request.text();
        if (body.includes(`device_code=${deviceCode}`)) {
          pollCount++;
          return HttpResponse.json({
            error: 'authorization_pending',
            error_description: 'pending',
          });
        }
        return HttpResponse.json({
          error: 'authorization_pending',
          error_description: 'pending',
        });
      }),
    );
    const resultPromise = forceAuthorize();
    // Advance time by 9 minutes 58 seconds (598,000 ms)
    await vi.advanceTimersByTimeAsync(598_000);
    // At this point, polling should still be happening
    expect(pollCount).toBe(120);
    // Don't await here because the promise won't fulfill until we advance the
    // timers below.  But likewise, we can't start by awaiting the timeout or
    // we'll fail the test with an unhandled rejection error.
    void expect(resultPromise).rejects.toMatchObject({
      code: 'ERR_A_17',
      message: expect.stringContaining(
        'OAuth device flow timed out after 10 minutes',
      ),
    });
    // Advance by another polling interval (5 seconds = 5,000 ms) to cross 10 minutes
    await vi.advanceTimersByTimeAsync(5_000);
  });

  it('throws a clear error if no interactive terminal is available for OAuth device flow', async () => {
    // Mock process.stdin.isTTY to false for this test
    const prevIsTTY = Object.getOwnPropertyDescriptor(
      process.stdin,
      'isTTY',
    )?.value;
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    });
    // Mock protected resource and authorization server metadata endpoints
    const baseUrl = 'https://glean.example.com';
    const issuer = 'https://auth.example.com';
    const clientId = 'client-123';
    const deviceAuthorizationEndpoint = 'https://auth.example.com/device';
    const tokenEndpoint = 'https://auth.example.com/token';
    server.use(
      http.get(`${baseUrl}/.well-known/oauth-protected-resource`, () =>
        HttpResponse.json({
          authorization_servers: [issuer],
          glean_device_flow_client_id: clientId,
        }),
      ),
      http.get(`${issuer}/.well-known/oauth-authorization-server`, () =>
        HttpResponse.json({
          device_authorization_endpoint: deviceAuthorizationEndpoint,
          token_endpoint: tokenEndpoint,
        }),
      ),
    );
    // Remove any saved tokens to force OAuth
    const stateDir = process.env.XDG_STATE_HOME;
    if (stateDir) {
      const gleanDir = path.join(stateDir, 'glean');
      if (fs.existsSync(gleanDir)) {
        fs.rmSync(gleanDir, { recursive: true, force: true });
      }
    }
    await expect(forceAuthorize()).rejects.toThrowErrorMatchingInlineSnapshot(
      `[AuthError: ERR_A_18: OAuth device authorization flow requires an interactive terminal.]`,
    );
    // Restore isTTY after test
    if (prevIsTTY === undefined) {
      delete (process.stdin as any).isTTY;
    } else {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: prevIsTTY,
        configurable: true,
      });
    }
  });
});
