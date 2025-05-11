import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { BinTesterProject, createBinTester } from '@scalvert/bin-tester';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';

import { cursorConfigPath } from '../configure/client/cursor.js';
import { claudeConfigPath } from '../configure/client/claude.js';
import { windsurfConfigPath } from '../configure/client/windsurf.js';

function normalizeOutput(output: string, baseDir: string): string {
  let normalized = normalizeBaseDirOutput(output, baseDir);
  normalized = normalizeVersionOutput(normalized);
  return normalized;
}

function normalizeBaseDirOutput(output: string, baseDir: string): string {
  return output.replace(new RegExp(baseDir, 'g'), '<TMP_DIR>');
}

function normalizeVersionOutput(output: string): string {
  return output.replace(/Version: v\d+\.\d+\.\d+/g, 'Version: v9.9.9');
}

function createConfigFile(configFilePath: string, config: Record<string, any>) {
  const dirPath = path.dirname(configFilePath);
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
}

describe('CLI', () => {
  let project: BinTesterProject;

  const { setupProject, teardownProject, runBin } = createBinTester({
    binPath: fileURLToPath(new URL('../../build/index.js', import.meta.url)),
  });

  beforeEach(async () => {
    project = await setupProject();
  });

  afterEach(() => {
    teardownProject();
  });

  it('shows help when no arguments provided', async () => {
    const result = await runBin('--help');

    expect(result.exitCode).toEqual(0);
    expect(result.stderr).toMatchInlineSnapshot(`""`);
    expect(normalizeOutput(result.stdout, project.baseDir))
      .toMatchInlineSnapshot(`
        "
          MCP server for Glean API integration

          Usage
            Typically this package is configured in an MCP client configuration file.
            However, you can also run it directly with the following commands, which help you set up the server configuration in an MCP client:

            $ npx @gleanwork/mcp-server configure --client <client-name> [options]

          Commands
            configure   Configure MCP settings for a specific client/host
            help        Show this help message

          Options for configure
            --client, -c   MCP client to configure for (claude, cursor, windsurf)
            --token, -t    Glean API token (required)
            --domain, -d   Glean instance domain/subdomain
            --env, -e      Path to .env file containing GLEAN_SUBDOMAIN and optionally GLEAN_API_TOKEN

          Examples
            $ npx @gleanwork/mcp-server
            $ npx @gleanwork/mcp-server configure --client cursor --token glean_api_xyz --domain my-company
            $ npx @gleanwork/mcp-server configure --client claude --token glean_api_xyz --domain my-company
            $ npx @gleanwork/mcp-server configure --client windsurf --env ~/.glean.env

          Run 'npx @gleanwork/mcp-server help' for more details on supported clients

          Version: v9.9.9
          
        "
      `);
  });

  it('handles invalid commands', async () => {
    const result = await runBin('invalid-command');

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(`
      "Unknown command: invalid-command
      Run with --help for usage information"
    `);
    expect(result.stdout).toMatchInlineSnapshot(`""`);
  });

  it('handles invalid clients', async () => {
    const result = await runBin(
      'configure',
      '--client',
      'invalid-client',
      '--domain',
      'my-company',
    );

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(`
      "Unsupported MCP client: invalid-client
      Supported clients: claude, cursor, windsurf"
    `);
    expect(result.stdout).toMatchInlineSnapshot(`""`);
  });

  describe('Cursor client', () => {
    let configPath: string;
    let configFilePath: string;

    const { configDir, configFileName } = cursorConfigPath;

    beforeEach(() => {
      configPath = path.join(project.baseDir, configDir);
      configFilePath = path.join(configPath, configFileName);
    });

    it('creates a new config file when none exists', async () => {
      const result = await runBin(
        'configure',
        '--client',
        'cursor',
        '--token',
        'glean_api_test',
        '--domain',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Configuring Glean MCP for Cursor...
          Created new configuration file at: <TMP_DIR>/.cursor/mcp.json

          Cursor MCP configuration has been configured to: <TMP_DIR>/.cursor/mcp.json

          To use it:
          1. Restart Cursor
          2. Agent will now have access to Glean search and chat tools
          3. You'll be asked for approval when Agent uses these tools

          Notes:
          - You may need to set your Glean subdomain and API token if they weren't provided during configuration
          - Configuration is at: <TMP_DIR>/.cursor/mcp.json
          "
        `);

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');

      expect(fs.existsSync(configFilePath)).toBe(true);
      expect(configFileContents).toMatchInlineSnapshot(`
        "{
          "mcpServers": {
            "glean": {
              "command": "npx",
              "args": [
                "-y",
                "@gleanwork/mcp-server"
              ],
              "env": {
                "GLEAN_SUBDOMAIN": "test-domain",
                "GLEAN_API_TOKEN": "glean_api_test"
              }
            }
          }
        }"
      `);
    });

    it("adds config to existing file that doesn't have Glean config", async () => {
      const existingConfig = {
        'some-other-config': {
          options: {
            enabled: true,
          },
        },
      };

      createConfigFile(configFilePath, existingConfig);

      const result = await runBin(
        'configure',
        '--client',
        'cursor',
        '--token',
        'glean_api_test',
        '--domain',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Configuring Glean MCP for Cursor...
          Updated configuration file at: <TMP_DIR>/.cursor/mcp.json

          Cursor MCP configuration has been configured to: <TMP_DIR>/.cursor/mcp.json

          To use it:
          1. Restart Cursor
          2. Agent will now have access to Glean search and chat tools
          3. You'll be asked for approval when Agent uses these tools

          Notes:
          - You may need to set your Glean subdomain and API token if they weren't provided during configuration
          - Configuration is at: <TMP_DIR>/.cursor/mcp.json
          "
        `);

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');

      expect(fs.existsSync(configFilePath)).toBe(true);
      expect(configFileContents).toMatchInlineSnapshot(`
        "{
          "some-other-config": {
            "options": {
              "enabled": true
            }
          },
          "mcpServers": {
            "glean": {
              "command": "npx",
              "args": [
                "-y",
                "@gleanwork/mcp-server"
              ],
              "env": {
                "GLEAN_SUBDOMAIN": "test-domain",
                "GLEAN_API_TOKEN": "glean_api_test"
              }
            }
          }
        }"
      `);
    });

    it("doesn't modify existing file that already has Glean config", async () => {
      const existingConfig = {
        mcpServers: {
          glean: {
            command: 'npx',
            args: ['-y', '@gleanwork/mcp-server'],
            env: {
              GLEAN_API_TOKEN: 'glean_api_existing',
              GLEAN_SUBDOMAIN: 'existing-domain',
            },
          },
        },
      };

      createConfigFile(configFilePath, existingConfig);

      const configBefore = fs.readFileSync(configFilePath, 'utf8');

      const result = await runBin(
        'configure',
        '--client',
        'cursor',
        '--token',
        'glean_api_test',
        '--domain',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Configuring Glean MCP for Cursor...
          Glean MCP configuration already exists in Cursor.
          Configuration file: <TMP_DIR>/.cursor/mcp.json"
        `);

      const configAfter = fs.readFileSync(configFilePath, 'utf8');
      expect(configAfter).toBe(configBefore);
    });
  });

  describe('Claude client', () => {
    let configPath: string;
    let configFilePath: string;

    const { configDir, configFileName } = claudeConfigPath;

    beforeEach(() => {
      configPath = path.join(project.baseDir, configDir);
      configFilePath = path.join(configPath, configFileName);
    });

    it('creates a new config file when none exists', async () => {
      const result = await runBin(
        'configure',
        '--client',
        'claude',
        '--token',
        'glean_api_test',
        '--domain',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Configuring Glean MCP for Claude Desktop...
          Created new configuration file at: <TMP_DIR>/Claude/claude_desktop_config.json

          Claude Desktop MCP configuration has been configured to: <TMP_DIR>/Claude/claude_desktop_config.json

          To use it:
          1. Restart Claude Desktop
          2. You should see a hammer icon in the input box, indicating MCP tools are available
          3. Click the hammer to see available tools including Glean search and chat

          Notes:
          - You may need to set your Glean subdomain and API token if they weren't provided during configuration
          - Configuration is at: <TMP_DIR>/Claude/claude_desktop_config.json
          "
        `);

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');

      expect(fs.existsSync(configFilePath)).toBe(true);
      expect(configFileContents).toMatchInlineSnapshot(`
        "{
          "mcpServers": {
            "glean": {
              "command": "npx",
              "args": [
                "-y",
                "@gleanwork/mcp-server"
              ],
              "env": {
                "GLEAN_SUBDOMAIN": "test-domain",
                "GLEAN_API_TOKEN": "glean_api_test"
              }
            }
          }
        }"
      `);
    });

    it("adds config to existing file that doesn't have Glean config", async () => {
      const existingConfig = {
        tools: [
          {
            name: 'some-other-tool',
            description: 'Another tool',
          },
        ],
      };

      createConfigFile(configFilePath, existingConfig);

      const result = await runBin(
        'configure',
        '--client',
        'claude',
        '--token',
        'glean_api_test',
        '--domain',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Configuring Glean MCP for Claude Desktop...
          Updated configuration file at: <TMP_DIR>/Claude/claude_desktop_config.json

          Claude Desktop MCP configuration has been configured to: <TMP_DIR>/Claude/claude_desktop_config.json

          To use it:
          1. Restart Claude Desktop
          2. You should see a hammer icon in the input box, indicating MCP tools are available
          3. Click the hammer to see available tools including Glean search and chat

          Notes:
          - You may need to set your Glean subdomain and API token if they weren't provided during configuration
          - Configuration is at: <TMP_DIR>/Claude/claude_desktop_config.json
          "
        `);

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');

      expect(fs.existsSync(configFilePath)).toBe(true);
      expect(configFileContents).toMatchInlineSnapshot(`
        "{
          "tools": [
            {
              "name": "some-other-tool",
              "description": "Another tool"
            }
          ],
          "mcpServers": {
            "glean": {
              "command": "npx",
              "args": [
                "-y",
                "@gleanwork/mcp-server"
              ],
              "env": {
                "GLEAN_SUBDOMAIN": "test-domain",
                "GLEAN_API_TOKEN": "glean_api_test"
              }
            }
          }
        }"
      `);
    });

    it("doesn't modify existing file that already has Glean config", async () => {
      const existingConfig = {
        mcpServers: {
          glean: {
            command: 'npx',
            args: ['-y', '@gleanwork/mcp-server'],
            env: {
              GLEAN_API_TOKEN: 'glean_api_existing',
              GLEAN_SUBDOMAIN: 'existing-domain',
            },
          },
        },
      };

      createConfigFile(configFilePath, existingConfig);

      const configBefore = fs.readFileSync(configFilePath, 'utf8');

      const result = await runBin(
        'configure',
        '--client',
        'claude',
        '--token',
        'glean_api_test',
        '--domain',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Configuring Glean MCP for Claude Desktop...
          Glean MCP configuration already exists in Claude Desktop.
          Configuration file: <TMP_DIR>/Claude/claude_desktop_config.json"
        `);

      const configAfter = fs.readFileSync(configFilePath, 'utf8');
      expect(configAfter).toBe(configBefore);
    });
  });

  describe('Windsurf client', () => {
    let configPath: string;
    let configFilePath: string;

    const { configDir, configFileName } = windsurfConfigPath;

    beforeEach(() => {
      configPath = path.join(project.baseDir, configDir);
      configFilePath = path.join(configPath, configFileName);
    });

    it('creates a new config file when none exists', async () => {
      const result = await runBin(
        'configure',
        '--client',
        'windsurf',
        '--token',
        'glean_api_test',
        '--domain',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Configuring Glean MCP for Windsurf...
          Created new configuration file at: <TMP_DIR>/.codeium/windsurf/mcp_config.json

          Windsurf MCP configuration has been configured to: <TMP_DIR>/.codeium/windsurf/mcp_config.json

          To use it:
          1. Open Windsurf Settings > Advanced Settings
          2. Scroll to the Cascade section
          3. Press the refresh button after configuration
          4. You should now see Glean in your available MCP servers

          Notes:
          - You may need to set your Glean subdomain and API token if they weren't provided during configuration
          - Configuration is at: <TMP_DIR>/.codeium/windsurf/mcp_config.json
          "
        `);

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');

      expect(fs.existsSync(configFilePath)).toBe(true);
      expect(configFileContents).toMatchInlineSnapshot(`
        "{
          "mcpServers": {
            "glean": {
              "command": "npx",
              "args": [
                "-y",
                "@gleanwork/mcp-server"
              ],
              "env": {
                "GLEAN_SUBDOMAIN": "test-domain",
                "GLEAN_API_TOKEN": "glean_api_test"
              }
            }
          }
        }"
      `);
    });

    it("adds config to existing file that doesn't have Glean config", async () => {
      const existingConfig = {
        'some-other-config': {
          options: {
            enabled: true,
          },
        },
      };

      createConfigFile(configFilePath, existingConfig);

      const result = await runBin(
        'configure',
        '--client',
        'windsurf',
        '--token',
        'glean_api_test',
        '--domain',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Configuring Glean MCP for Windsurf...
          Updated configuration file at: <TMP_DIR>/.codeium/windsurf/mcp_config.json

          Windsurf MCP configuration has been configured to: <TMP_DIR>/.codeium/windsurf/mcp_config.json

          To use it:
          1. Open Windsurf Settings > Advanced Settings
          2. Scroll to the Cascade section
          3. Press the refresh button after configuration
          4. You should now see Glean in your available MCP servers

          Notes:
          - You may need to set your Glean subdomain and API token if they weren't provided during configuration
          - Configuration is at: <TMP_DIR>/.codeium/windsurf/mcp_config.json
          "
        `);

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');

      expect(fs.existsSync(configFilePath)).toBe(true);
      expect(configFileContents).toMatchInlineSnapshot(`
        "{
          "some-other-config": {
            "options": {
              "enabled": true
            }
          },
          "mcpServers": {
            "glean": {
              "command": "npx",
              "args": [
                "-y",
                "@gleanwork/mcp-server"
              ],
              "env": {
                "GLEAN_SUBDOMAIN": "test-domain",
                "GLEAN_API_TOKEN": "glean_api_test"
              }
            }
          }
        }"
      `);
    });

    it("doesn't modify existing file that already has Glean config", async () => {
      const existingConfig = {
        mcpServers: {
          glean: {
            command: 'npx',
            args: ['-y', '@gleanwork/mcp-server'],
            env: {
              GLEAN_API_TOKEN: 'glean_api_existing',
              GLEAN_SUBDOMAIN: 'existing-domain',
            },
          },
        },
      };

      createConfigFile(configFilePath, existingConfig);

      const configBefore = fs.readFileSync(configFilePath, 'utf8');

      const result = await runBin(
        'configure',
        '--client',
        'windsurf',
        '--token',
        'glean_api_test',
        '--domain',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Configuring Glean MCP for Windsurf...
          Glean MCP configuration already exists in Windsurf.
          Configuration file: <TMP_DIR>/.codeium/windsurf/mcp_config.json"
        `);

      const configAfter = fs.readFileSync(configFilePath, 'utf8');
      expect(configAfter).toBe(configBefore);
    });
  });

  it('can configure with custom subdomain and token', async () => {
    const result = await runBin(
      'configure',
      '--client',
      'cursor',
      '--domain',
      'custom-domain',
      '--token',
      'test-token',
      {
        env: {
          GLEAN_MCP_CONFIG_DIR: project.baseDir,
        },
      },
    );

    expect(result.exitCode).toEqual(0);
    expect(normalizeOutput(result.stdout, project.baseDir))
      .toMatchInlineSnapshot(`
        "Configuring Glean MCP for Cursor...
        Created new configuration file at: <TMP_DIR>/.cursor/mcp.json

        Cursor MCP configuration has been configured to: <TMP_DIR>/.cursor/mcp.json

        To use it:
        1. Restart Cursor
        2. Agent will now have access to Glean search and chat tools
        3. You'll be asked for approval when Agent uses these tools

        Notes:
        - You may need to set your Glean subdomain and API token if they weren't provided during configuration
        - Configuration is at: <TMP_DIR>/.cursor/mcp.json
        "
      `);
  });

  it('requires API token when GLEAN_OAUTH_ENABLED is not set', async () => {
    const result = await runBin(
      'configure',
      '--client',
      'cursor',
      '--domain',
      'custom-domain',
      {
        env: {
          GLEAN_MCP_CONFIG_DIR: project.baseDir,
          // Ensure OAuth is not enabled
          GLEAN_OAUTH_ENABLED: undefined,
        },
      },
    );

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toContain('API token is required');
    expect(result.stderr).toContain(
      'Please provide a token with the --token option',
    );
  });

  it('allows tokenless flow when GLEAN_OAUTH_ENABLED is set', async () => {
    // Mock ensureAuthTokenPresence to avoid actual OAuth flow
    const originalEnsureAuth = await vi.importActual('../auth/auth.js');
    vi.mock('../auth/auth.js', () => {
      return {
        ...originalEnsureAuth,
        ensureAuthTokenPresence: vi.fn().mockResolvedValue(true),
      };
    });

    const result = await runBin(
      'configure',
      '--client',
      'cursor',
      '--domain',
      'custom-domain',
      {
        env: {
          GLEAN_MCP_CONFIG_DIR: project.baseDir,
          GLEAN_OAUTH_ENABLED: 'true',
        },
      },
    );

    expect(result.exitCode).toEqual(0);
    // The test should proceed without requiring a token
    expect(result.stderr).not.toContain('API token is required');

    // Restore original implementation
    vi.restoreAllMocks();
  });

  describe('unlisted authentication commands', () => {
    it('Prints user-friendly error messages on failures', async () => {
      // Set up a temp XDG_STATE_HOME
      const tempStateDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'cli-auth-test-'),
      );
      // Only set GLEAN_BASE_URL to a value that will fail
      const env = {
        GLEAN_BASE_URL: 'https://glean-be.example.com',
        XDG_STATE_HOME: tempStateDir,
      };

      const result = await runBin('auth', { env });

      expect(result.exitCode).toBe(1);
      expect(
        normalizeOutput(result.stdout, project.baseDir),
      ).toMatchInlineSnapshot(`""`);
      expect(
        normalizeOutput(result.stderr, project.baseDir),
      ).toMatchInlineSnapshot(
        `"Authorization failed: ERR_A_06: Unable to fetch OAuth protected resource metadata: please contact your Glean administrator and ensure device flow authorization is configured correctly."`,
      );
    });
  });
});
