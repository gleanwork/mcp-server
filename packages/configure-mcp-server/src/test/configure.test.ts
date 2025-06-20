import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configure, ConfigureOptions } from '../configure/index.js';
import {
  ensureAuthTokenPresence,
  setupMcpRemote,
} from '@gleanwork/mcp-server-utils/auth';
import { validateInstance } from '@gleanwork/mcp-server-utils/util';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { Logger } from '@gleanwork/mcp-server-utils/logger';

// Mock dependencies
vi.mock('@gleanwork/mcp-server-utils/auth', () => ({
  ensureAuthTokenPresence: vi.fn(),
  setupMcpRemote: vi.fn(),
}));

vi.mock('@gleanwork/mcp-server-utils/util', () => ({
  validateInstance: vi.fn(),
}));

describe('configure', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalHome: string;
  let originalExit: typeof process.exit;
  let originalConsoleError: typeof console.error;
  let consoleErrorOutput: string[];

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    originalHome = os.homedir();
    originalExit = process.exit;
    originalConsoleError = console.error;
    consoleErrorOutput = [];

    // Mock process.exit and console.error
    process.exit = vi.fn() as any;
    console.error = vi.fn((...args) => {
      consoleErrorOutput.push(args.join(' '));
    }) as any;

    // Create temp directory for XDG config
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
    process.env.XDG_CONFIG_HOME = tempDir;
    process.env.HOME = tempDir;
    os.homedir = () => {
      return tempDir;
    };

    // Mock validateInstance to succeed
    vi.mocked(validateInstance).mockResolvedValue(true);

    // Mock ensureAuthTokenPresence to succeed
    vi.mocked(ensureAuthTokenPresence).mockResolvedValue(true);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    os.homedir = () => originalHome;
    process.exit = originalExit;
    console.error = originalConsoleError;

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Clear all mocks
    vi.clearAllMocks();
    Logger.reset();
  });

  it('should configure cursor client with token and instance', async () => {
    const options = {
      token: 'test-token',
      instance: 'test-instance',
    };

    await configure('cursor', options);

    // Verify config file was created
    const configPath = path.join(tempDir, '.cursor', 'mcp.json');
    expect(fs.existsSync(configPath)).toBe(true);

    // Verify config contents
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_local": {
            "args": [
              "-y",
              "@gleanwork/local-mcp-server",
            ],
            "command": "npx",
            "env": {
              "GLEAN_API_TOKEN": "test-token",
              "GLEAN_INSTANCE": "test-instance",
            },
            "type": "stdio",
          },
        },
      }
    `);

    // Verify validateInstance was called
    expect(validateInstance).toHaveBeenCalledWith('test-instance');
  });

  it('should configure with URL instead of instance', async () => {
    const options = {
      token: 'test-token',
      url: 'https://example.com/rest/api/v1',
    };

    await configure('cursor', options);

    const configPath = path.join(tempDir, '.cursor', 'mcp.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_local": {
            "args": [
              "-y",
              "@gleanwork/local-mcp-server",
            ],
            "command": "npx",
            "env": {
              "GLEAN_API_TOKEN": "test-token",
              "GLEAN_BASE_URL": "https://example.com/rest/api/v1",
            },
            "type": "stdio",
          },
        },
      }
    `);

    // validateInstance should not be called with URL
    expect(validateInstance).not.toHaveBeenCalled();
  });

  it('should configure with environment variables', async () => {
    process.env.GLEAN_API_TOKEN = 'env-token';
    process.env.GLEAN_INSTANCE = 'env-instance';

    await configure('cursor', {});

    const configPath = path.join(tempDir, '.cursor', 'mcp.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_local": {
            "args": [
              "-y",
              "@gleanwork/local-mcp-server",
            ],
            "command": "npx",
            "env": {
              "GLEAN_API_TOKEN": "env-token",
              "GLEAN_INSTANCE": "env-instance",
            },
            "type": "stdio",
          },
        },
      }
    `);
  });

  it('should configure with .env file', async () => {
    const envPath = path.join(tempDir, '.env');
    fs.writeFileSync(
      envPath,
      'GLEAN_API_TOKEN=env-file-token\nGLEAN_INSTANCE=env-file-instance',
    );

    await configure('cursor', { envPath });

    const configPath = path.join(tempDir, '.cursor', 'mcp.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_local": {
            "args": [
              "-y",
              "@gleanwork/local-mcp-server",
            ],
            "command": "npx",
            "env": {
              "GLEAN_API_TOKEN": "env-file-token",
              "GLEAN_INSTANCE": "env-file-instance",
            },
            "type": "stdio",
          },
        },
      }
    `);
  });

  it('should handle OAuth flow when no token is provided', async () => {
    const options: ConfigureOptions = {
      instance: 'test-instance',
      remote: true,
    };

    await configure('cursor', options);

    expect(ensureAuthTokenPresence).toHaveBeenCalled();

    const configPath = path.join(tempDir, '.cursor', 'mcp.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // NOTE: the X-Glean-Auth-Type header has no space after `:`
    // Some clients do not escape spaces properly and end up invoking mcp-remote incorrectly
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean": {
            "args": [
              "-y",
              "@gleanwork/connect-mcp-server",
              "https://test-instance-be.glean.com/mcp/default/sse",
              "--header",
              "X-Glean-Auth-Type:OAUTH",
            ],
            "command": "npx",
            "env": {},
            "type": "stdio",
          },
        },
      }
    `);
  });

  it('should handle OAuth flow with agents target', async () => {
    const options = {
      instance: 'test-instance',
      remote: true,
      agents: true,
    };

    await configure('cursor', options);

    expect(ensureAuthTokenPresence).toHaveBeenCalled();
    expect(setupMcpRemote).toHaveBeenCalledWith({ target: 'agents' });

    const configPath = path.join(tempDir, '.cursor', 'mcp.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // /mcp/agents url
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_agents": {
            "args": [
              "-y",
              "@gleanwork/connect-mcp-server",
              "https://test-instance-be.glean.com/mcp/agents/sse",
              "--header",
              "X-Glean-Auth-Type:OAUTH",
            ],
            "command": "npx",
            "env": {},
            "type": "stdio",
          },
        },
      }
    `);
  });

  it('should configure remote server using API token', async () => {
    const options: ConfigureOptions = {
      token: 'test-token',
      instance: 'test-instance',
      remote: true,
    };

    await configure('cursor', options);

    const configPath = path.join(tempDir, '.cursor', 'mcp.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean": {
            "args": [
              "-y",
              "@gleanwork/connect-mcp-server",
              "https://test-instance-be.glean.com/mcp/default/sse",
              "--header",
              "Authorization:\${AUTH_HEADER}",
            ],
            "command": "npx",
            "env": {
              "AUTH_HEADER": "Bearer test-token",
            },
            "type": "stdio",
          },
        },
      }
    `);
  });

  it('should throw error when OAuth flow fails', async () => {
    vi.mocked(ensureAuthTokenPresence).mockResolvedValue(false);

    const options = {
      instance: 'test-instance',
    };

    await configure('cursor', options);

    // Verify error message was logged
    expect(consoleErrorOutput).toMatchInlineSnapshot(`
      [
        "Error configuring client: OAuth authorization failed",
      ]
    `);

    // Verify process.exit was called with code 1
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should include GLEAN_INSTANCE for local (non-remote) configurations', async () => {
    const options = {
      token: 'test-token',
      instance: 'test-instance',
      remote: false, // explicitly set to false to test local behavior
    };

    await configure('cursor', options);

    const configPath = path.join(tempDir, '.cursor', 'mcp.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_local": {
            "args": [
              "-y",
              "@gleanwork/local-mcp-server",
            ],
            "command": "npx",
            "env": {
              "GLEAN_API_TOKEN": "test-token",
              "GLEAN_INSTANCE": "test-instance",
            },
            "type": "stdio",
          },
        },
      }
    `);
  });
});
