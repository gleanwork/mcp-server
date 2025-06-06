import path from 'path';
import fs from 'fs';
import os from 'os';
import { createBinTester, BinTesterProject } from '@scalvert/bin-tester';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ConfigFileContents } from '../configure/index.js';
import './mocks/setup';

import { cursorConfigPath } from '../configure/client/cursor.js';
import { claudeConfigPath } from '../configure/client/claude.js';
import { windsurfConfigPath } from '../configure/client/windsurf.js';

function normalizeOutput(output: string, baseDir: string): string {
  let normalized = normalizeBaseDirOutput(output, baseDir);
  normalized = normalizeVersionOutput(normalized);
  normalized = normalizeVSCodeConfigPath(normalized);

  return normalized;
}

function normalizeBaseDirOutput(output: string, baseDir: string): string {
  return output.replace(new RegExp(baseDir, 'g'), '<TMP_DIR>');
}

function normalizeVersionOutput(output: string): string {
  return output.replace(/Version: v\d+\.\d+\.\d+/g, 'Version: v9.9.9');
}

function normalizeVSCodeConfigPath(output: string): string {
  return output.replace(
    /[^\s"]*(\.config|Code|Application Support)([/\\][^/\\]+)*[/\\]settings\.json/g,
    '<VS_CODE_CONFIG_DIR>/settings.json',
  );
}

function createConfigFile(configFilePath: string, config: ConfigFileContents) {
  const configDir = path.dirname(configFilePath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
}

describe('CLI', () => {
  let project: BinTesterProject;
  let configPath: string;
  let configFilePath: string;
  let envFilePath: string;

  const { configDir, configFileName } = cursorConfigPath;

  const { setupProject, teardownProject, runBin } = createBinTester({
    binPath: fileURLToPath(new URL('../../build/index.js', import.meta.url)),
  });

  beforeEach(async () => {
    process.env._SKIP_INSTANCE_PREFLIGHT = 'true';
    project = await setupProject();

    configPath = path.join(project.baseDir, configDir);
    configFilePath = path.join(configPath, configFileName);
    envFilePath = path.join(project.baseDir, '.env');
  });

  afterEach(() => {
    teardownProject();
    delete process.env._SKIP_INSTANCE_PREFLIGHT;
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

            $ npx @gleanwork/mcp-server [server] [options]                 # Run the MCP server (default)
            $ npx @gleanwork/mcp-server configure --client <client-name> [options]

          Commands
            server      Run the MCP server (default if no command is specified)
            configure   Configure MCP settings for a specific client/host
            help        Show this help message

          Options for server
            --instance, -i   Glean instance name
            --token, -t      Glean API token

          Options for configure
            --client, -c   MCP client to configure for (claude, cursor, vscode, windsurf)
            --token, -t    Glean API token (required)
            --instance, -i   Glean instance name
            --env, -e      Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
            --workspace    Create workspace configuration instead of global (VS Code only)

          Examples
            $ npx @gleanwork/mcp-server
            $ npx @gleanwork/mcp-server server --instance my-company --token glean_api_xyz
            $ npx @gleanwork/mcp-server configure --client cursor --token glean_api_xyz --instance my-company
            $ npx @gleanwork/mcp-server configure --client claude --token glean_api_xyz --instance my-company
            $ npx @gleanwork/mcp-server configure --client windsurf --env ~/.glean.env
            $ npx @gleanwork/mcp-server configure --client vscode --token glean_api_xyz --instance my-company --workspace

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
      '--instance',
      'my-company',
    );

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(`
      "Unsupported MCP client: invalid-client
      Supported clients: claude, cursor, vscode, windsurf"
    `);
    expect(result.stdout).toMatchInlineSnapshot(`""`);
  });

  it('can configure with custom instance and token', async () => {
    const result = await runBin(
      'configure',
      '--client',
      'cursor',
      '--instance',
      'custom-instance',
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
        - You may need to set your Glean instance and API token if they weren't provided during configuration
        - Configuration is at: <TMP_DIR>/.cursor/mcp.json
        "
      `);
  });

  it('uses token auth when both token and instance provided via flags', async () => {
    const result = await runBin(
      'configure',
      '--client',
      'cursor',
      '--token',
      'test-token',
      '--instance',
      'test-instance',
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
          - You may need to set your Glean instance and API token if they weren't provided during configuration
          - Configuration is at: <TMP_DIR>/.cursor/mcp.json
          "
        `);

    const configFileContents = fs.readFileSync(configFilePath, 'utf8');
    const parsedConfig = JSON.parse(configFileContents);
    expect(parsedConfig).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean": {
            "args": [
              "-y",
              "@gleanwork/mcp-server",
            ],
            "command": "npx",
            "env": {
              "GLEAN_API_TOKEN": "test-token",
              "GLEAN_INSTANCE": "test-instance",
            },
          },
        },
      }
    `);
  });

  it('uses token auth when both token and instance provided via env file', async () => {
    await project.write({
      '.env': 'GLEAN_API_TOKEN=env-token\nGLEAN_INSTANCE=env-instance\n',
    });

    const result = await runBin(
      'configure',
      '--client',
      'cursor',
      '--env',
      envFilePath,
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
          - You may need to set your Glean instance and API token if they weren't provided during configuration
          - Configuration is at: <TMP_DIR>/.cursor/mcp.json
          "
        `);

    const configFileContents = fs.readFileSync(configFilePath, 'utf8');
    const parsedConfig = JSON.parse(configFileContents);
    expect(parsedConfig).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean": {
            "args": [
              "-y",
              "@gleanwork/mcp-server",
            ],
            "command": "npx",
            "env": {
              "GLEAN_API_TOKEN": "env-token",
              "GLEAN_INSTANCE": "env-instance",
            },
          },
        },
      }
    `);
  });

  it('uses token auth when both token and instance provided via environment variables', async () => {
    const result = await runBin('configure', '--client', 'cursor', {
      env: {
        GLEAN_MCP_CONFIG_DIR: project.baseDir,
        GLEAN_API_TOKEN: 'process-env-token',
        GLEAN_INSTANCE: 'process-env-instance',
      },
    });

    expect(result.exitCode).toEqual(0);
    const configFileContents = fs.readFileSync(configFilePath, 'utf8');
    const parsedConfig = JSON.parse(configFileContents);
    expect(parsedConfig).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean": {
            "args": [
              "-y",
              "@gleanwork/mcp-server",
            ],
            "command": "npx",
            "env": {
              "GLEAN_API_TOKEN": "process-env-token",
              "GLEAN_INSTANCE": "process-env-instance",
            },
          },
        },
      }
    `);
  });

  it('prioritizes flags over env file when both provided', async () => {
    await project.write({
      '.env': 'GLEAN_API_TOKEN=env-token\nGLEAN_INSTANCE=env-instance\n',
    });

    const result = await runBin(
      'configure',
      '--client',
      'cursor',
      '--token',
      'flag-token',
      '--instance',
      'flag-instance',
      '--env',
      envFilePath,
      {
        env: {
          GLEAN_MCP_CONFIG_DIR: project.baseDir,
        },
      },
    );

    expect(result.exitCode).toEqual(0);
    const configFileContents = fs.readFileSync(configFilePath, 'utf8');
    const parsedConfig = JSON.parse(configFileContents);
    expect(parsedConfig).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean": {
            "args": [
              "-y",
              "@gleanwork/mcp-server",
            ],
            "command": "npx",
            "env": {
              "GLEAN_API_TOKEN": "flag-token",
              "GLEAN_INSTANCE": "flag-instance",
            },
          },
        },
      }
    `);
  });

  it('fails when only token provided without OAuth enabled', async () => {
    const result = await runBin(
      'configure',
      '--client',
      'cursor',
      '--token',
      'test-token',
      {
        env: {
          GLEAN_MCP_CONFIG_DIR: project.baseDir,
        },
      },
    );

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(`
        "
        "Warning: Configuring without complete credentials.
        You must provide either:
          1. Both --token and --instance, or
          2. --env pointing to a .env file containing GLEAN_API_TOKEN and GLEAN_INSTANCE

        Continuing with configuration, but you will need to set credentials manually later."

        Error configuring client: API token is required. Please provide a token with the --token option or in your .env file."
      `);
  });

  it('fails when only instance provided without OAuth enabled', async () => {
    const result = await runBin(
      'configure',
      '--client',
      'cursor',
      '--instance',
      'test-instance',
      {
        env: {
          GLEAN_MCP_CONFIG_DIR: project.baseDir,
        },
      },
    );

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(
      `"Error configuring client: API token is required. Please provide a token with the --token option or in your .env file."`,
    );
  });

  it('fails when env file has only token without OAuth enabled', async () => {
    await project.write({
      '.env': 'GLEAN_API_TOKEN=env-token\n',
    });

    const result = await runBin(
      'configure',
      '--client',
      'cursor',
      '--env',
      envFilePath,
      {
        env: {
          GLEAN_MCP_CONFIG_DIR: project.baseDir,
        },
      },
    );

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(
      `"Error configuring client: API token is required. Please provide a token with the --token option or in your .env file."`,
    );
  });

  it('fails when env file has only instance without OAuth enabled', async () => {
    await project.write({
      '.env': 'GLEAN_INSTANCE=env-instance\n',
    });

    const result = await runBin(
      'configure',
      '--client',
      'cursor',
      '--env',
      envFilePath,
      {
        env: {
          GLEAN_MCP_CONFIG_DIR: project.baseDir,
        },
      },
    );

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(
      `"Error configuring client: API token is required. Please provide a token with the --token option or in your .env file."`,
    );
  });

  it('fails when neither token/instance nor OAuth enabled', async () => {
    const result = await runBin('configure', '--client', 'cursor', {
      env: {
        GLEAN_MCP_CONFIG_DIR: project.baseDir,
      },
    });

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(`
        "Error: You must provide either:
          1. Both --token and --instance for authentication, or
          2. --env pointing to a .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
        Run with --help for usage information"
      `);
  });

  it('warns when env file path does not exist', async () => {
    const nonExistentPath = path.join(project.baseDir, 'nonexistent.env');

    const result = await runBin(
      'configure',
      '--client',
      'cursor',
      '--env',
      nonExistentPath,
      {
        env: {
          GLEAN_MCP_CONFIG_DIR: project.baseDir,
        },
      },
    );

    expect(result.exitCode).toEqual(1);
    expect(
      normalizeOutput(result.stderr, project.baseDir),
    ).toMatchInlineSnapshot(
      `"Warning: .env file not found at <TMP_DIR>/nonexistent.env
Error configuring client: API token is required. Please provide a token with the --token option or in your .env file."`,
    );
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
        '--instance',
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
          - You may need to set your Glean instance and API token if they weren't provided during configuration
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
                "GLEAN_INSTANCE": "test-domain",
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
        '--instance',
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
          - You may need to set your Glean instance and API token if they weren't provided during configuration
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
                "GLEAN_INSTANCE": "test-domain",
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
              GLEAN_INSTANCE: 'existing-domain',
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
        '--instance',
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
        '--instance',
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
          - You may need to set your Glean instance and API token if they weren't provided during configuration
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
                "GLEAN_INSTANCE": "test-domain",
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
        '--instance',
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
          - You may need to set your Glean instance and API token if they weren't provided during configuration
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
                "GLEAN_INSTANCE": "test-domain",
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
              GLEAN_INSTANCE: 'existing-domain',
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
        '--instance',
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
        '--instance',
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
          - You may need to set your Glean instance and API token if they weren't provided during configuration
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
                "GLEAN_INSTANCE": "test-domain",
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
        '--instance',
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
          - You may need to set your Glean instance and API token if they weren't provided during configuration
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
                "GLEAN_INSTANCE": "test-domain",
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
              GLEAN_INSTANCE: 'existing-domain',
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
        '--instance',
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

  describe('VS Code client', () => {
    let configFilePath: string;

    beforeEach(() => {
      const platform = process.platform;

      if (platform === 'win32') {
        configFilePath = path.join(
          project.baseDir,
          'Code',
          'User',
          'settings.json',
        );
      } else if (platform === 'darwin') {
        configFilePath = path.join(
          project.baseDir,
          'Library',
          'Application Support',
          'Code',
          'User',
          'settings.json',
        );
      } else {
        configFilePath = path.join(
          project.baseDir,
          '.config',
          'Code',
          'User',
          'settings.json',
        );
      }

      fs.mkdirSync(path.dirname(configFilePath), { recursive: true });
    });

    it('creates a new config file when none exists', async () => {
      const result = await runBin(
        'configure',
        '--client',
        'vscode',
        '--token',
        'glean_api_test',
        '--instance',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
            HOME: project.baseDir,
            USERPROFILE: project.baseDir,
            APPDATA: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      const normalized = normalizeOutput(result.stdout, project.baseDir);

      expect(normalized).toMatchInlineSnapshot(`
        "Configuring Glean MCP for VS Code...
        Created new configuration file at: <VS_CODE_CONFIG_DIR>/settings.json
        "
      `);

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');

      expect(fs.existsSync(configFilePath)).toBe(true);
      // Normalize JSON to avoid platform-specific escaping issues
      const parsedContents = JSON.parse(configFileContents);
      expect(parsedContents).toMatchInlineSnapshot(`
        {
          "mcp": {
            "servers": {
              "glean": {
                "args": [
                  "-y",
                  "@gleanwork/mcp-server",
                ],
                "command": "npx",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                  "GLEAN_INSTANCE": "test-domain",
                },
                "type": "stdio",
              },
            },
          },
        }
      `);
    });

    it("adds config to existing file that doesn't have Glean config", async () => {
      const existingConfig = {
        'editor.fontSize': 14,
        'workbench.colorTheme': 'Default Dark+',
      };

      createConfigFile(configFilePath, existingConfig);

      const result = await runBin(
        'configure',
        '--client',
        'vscode',
        '--token',
        'glean_api_test',
        '--instance',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
            HOME: project.baseDir,
            USERPROFILE: project.baseDir,
            APPDATA: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      const normalized = normalizeOutput(result.stdout, project.baseDir);

      expect(normalized).toMatchInlineSnapshot(`
        "Configuring Glean MCP for VS Code...
        Updated configuration file at: <VS_CODE_CONFIG_DIR>/settings.json
        "
      `);

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');
      const parsedConfig = JSON.parse(configFileContents);

      expect(parsedConfig).toMatchInlineSnapshot(`
        {
          "editor.fontSize": 14,
          "mcp": {
            "servers": {
              "glean": {
                "args": [
                  "-y",
                  "@gleanwork/mcp-server",
                ],
                "command": "npx",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                  "GLEAN_INSTANCE": "test-domain",
                },
                "type": "stdio",
              },
            },
          },
          "workbench.colorTheme": "Default Dark+",
        }
      `);
    });

    it("doesn't modify existing file that already has Glean config", async () => {
      const existingConfig = {
        'editor.fontSize': 14,
        mcp: {
          servers: {
            glean: {
              type: 'stdio',
              command: 'npx',
              args: ['-y', '@gleanwork/mcp-server'],
              env: {
                GLEAN_INSTANCE: 'existing-domain',
                GLEAN_API_TOKEN: 'glean_api_existing',
              },
            },
          },
        },
      };

      createConfigFile(configFilePath, existingConfig);

      const configBefore = fs.readFileSync(configFilePath, 'utf8');

      const result = await runBin(
        'configure',
        '--client',
        'vscode',
        '--token',
        'glean_api_test',
        '--instance',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
            HOME: project.baseDir,
            USERPROFILE: project.baseDir,
            APPDATA: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      const normalized = normalizeOutput(result.stdout, project.baseDir);

      expect(normalized).toMatchInlineSnapshot(`
        "Configuring Glean MCP for VS Code...
        Glean MCP configuration already exists in VS Code.
        Configuration file: <VS_CODE_CONFIG_DIR>/settings.json"
      `);

      const configAfter = fs.readFileSync(configFilePath, 'utf8');
      expect(configAfter).toBe(configBefore);
    });
  });

  describe('unlisted OAuth commands', () => {
    it('Prints user-friendly error messages on failures', async () => {
      // Set up a temp XDG_STATE_HOME
      const tempStateDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'cli-oauth-test-'),
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
