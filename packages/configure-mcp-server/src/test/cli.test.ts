import path from 'path';
import fs from 'fs';
import os from 'os';
import { createBinTester, BinTesterProject } from '@scalvert/bin-tester';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ConfigFileContents } from '../configure/index.js';

import { cursorConfigPath } from '../configure/client/cursor.js';
import { claudeConfigPath } from '../configure/client/claude.js';
import { windsurfConfigPath } from '../configure/client/windsurf.js';
import { gooseConfigPath } from '../configure/client/goose.js';
import yaml from 'yaml';

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
  let originalEnv: NodeJS.ProcessEnv;

  const { configDir, configFileName } = cursorConfigPath;

  const { setupProject, teardownProject, runBin } = createBinTester({
    binPath: fileURLToPath(new URL('../../build/index.js', import.meta.url)),
  });

  beforeEach(async () => {
    originalEnv = { ...process.env };

    process.env.GLEAN_OAUTH_DISABLED = 'true';
    delete process.env.GLEAN_BETA_ENABLED;
    delete process.env.GLEAN_API_TOKEN;
    delete process.env.GLEAN_INSTANCE;
    delete process.env.GLEAN_SUBDOMAIN;
    delete process.env.GLEAN_BASE_URL;
    process.env._SKIP_INSTANCE_PREFLIGHT = 'true';

    project = await setupProject();

    configPath = path.join(project.baseDir, configDir);
    configFilePath = path.join(configPath, configFileName);
    envFilePath = path.join(project.baseDir, '.env');
  });

  afterEach(() => {
    teardownProject();
    process.env = originalEnv;
  });

  it('shows help output', async () => {
    const result = await runBin('--help');

    expect(result.exitCode).toEqual(0);
    expect(result.stderr).toMatchInlineSnapshot(`""`);
    expect(normalizeOutput(result.stdout, project.baseDir))
      .toMatchInlineSnapshot(`
        "
          MCP server configurator for Glean

          Usage
            Configure popular MCP clients to add Glean as an MCP server.

            $ npx @gleanwork/configure-mcp-server --client <client-name> [options]

          Commands
            configure   Configure MCP settings for a specific client/host
            help        Show this help message

          Options for configure
            --client, -c    MCP client to configure for (claude, cursor, goose, vscode, windsurf)
            --token, -t     Glean API token (required)
            --instance, -i  Glean instance name
            --env, -e       Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
            --workspace     Create workspace configuration instead of global (VS Code only)

          Examples
            $ npx @gleanwork/configure-mcp-server --client cursor --token glean_api_xyz --instance my-company
            $ npx @gleanwork/configure-mcp-server --client claude --token glean_api_xyz --instance my-company
            $ npx @gleanwork/configure-mcp-server --client goose --token glean_api_xyz --instance my-company
            $ npx @gleanwork/configure-mcp-server --client windsurf --env ~/.glean.env
            $ npx @gleanwork/configure-mcp-server --client vscode --token glean_api_xyz --instance my-company --workspace

          Run 'npx @gleanwork/configure-mcp-server help' for more details on supported clients

          Version: v9.9.9
        "
      `);
  });

  it('shows beta help output', async () => {
    process.env.GLEAN_BETA_ENABLED = 'true';
    const result = await runBin('--help');

    expect(result.exitCode).toEqual(0);
    expect(result.stderr).toMatchInlineSnapshot(`""`);
    expect(normalizeOutput(result.stdout, project.baseDir))
      .toMatchInlineSnapshot(`
        "
          MCP server configurator for Glean

          Usage
            Configure popular MCP clients to add Glean as an MCP server.

            Available MCP servers:

              local     A local server using Glean's API to access common tools (search, chat)
              remote    Connect to Glean's hosted MCP servers (default tools and agents).


            $ npx @gleanwork/configure-mcp-server --client <client-name> [options]

          Commands
            local       Configure Glean's local MCP server for a given client
            remote      Configure Glean's remote MCP server for a given client
            help        Show this help message

          Options for local
            --client, -c    MCP client to configure for (claude, cursor, goose, vscode, windsurf)
            --token, -t     Glean API token (required)
            --instance, -i  Glean instance name
            --env, -e       Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
            --workspace     Create workspace configuration instead of global (VS Code only)

          Options for remote
            --agents        Connect your Glean Agents to your MCP client.  If unset, will connect the default tools.
            --client, -c    MCP client to configure for (claude, cursor, goose, vscode, windsurf)
            --token, -t     Glean API token (required)
            --instance, -i  Glean instance name
            --env, -e       Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
            --workspace     Create workspace configuration instead of global (VS Code only)

          Examples
            $ npx @gleanwork/configure-mcp-server remote --client cursor --token glean_api_xyz --instance my-company
            $ npx @gleanwork/configure-mcp-server remote --agents --client claude --token glean_api_xyz --instance my-company
            $ npx @gleanwork/configure-mcp-server remote --client goose --token glean_api_xyz --instance my-company
            $ npx @gleanwork/configure-mcp-server remote --client windsurf --env ~/.glean.env
            $ npx @gleanwork/configure-mcp-server remote --client vscode --token glean_api_xyz --instance my-company --workspace

          Run 'npx @gleanwork/configure-mcp-server help' for more details on supported clients

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
      '--client',
      'invalid-client',
      '--instance',
      'my-company',
    );

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(`
      "Unsupported MCP client: invalid-client
      Supported clients: claude, cursor, goose, vscode, windsurf"
    `);
    expect(result.stdout).toMatchInlineSnapshot(`""`);
  });

  for (const command of ['local', 'remote']) {
    describe(command, () => {
      it('fails when only token provided without OAuth enabled', async () => {
        const result = await runBin(
          '--client',
          'cursor',
          '--token',
          'test-token',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
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
          '--client',
          'cursor',
          '--instance',
          'test-instance',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
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
          '--client',
          'cursor',
          '--env',
          envFilePath,
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
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
          '--client',
          'cursor',
          '--env',
          envFilePath,
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(1);
        expect(result.stderr).toMatchInlineSnapshot(
          `"Error configuring client: API token is required. Please provide a token with the --token option or in your .env file."`,
        );
      });

      it('fails when neither token/instance nor OAuth enabled', async () => {
        const result = await runBin('--client', 'cursor', {
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
    });
  }

  describe('local', () => {
    it('can configure with custom instance and token', async () => {
      const result = await runBin(
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
          2. Agent will now have access to Glean tools
          3. You'll be asked for approval when Agent uses these tools
          "
        `);
    });

    it('uses token auth when both token and instance provided via flags', async () => {
      const result = await runBin(
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
          2. Agent will now have access to Glean tools
          3. You'll be asked for approval when Agent uses these tools
          "
        `);

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');
      const parsedConfig = JSON.parse(configFileContents);
      expect(parsedConfig).toMatchInlineSnapshot(`
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

    it('uses token auth when both token and instance provided via env file', async () => {
      await project.write({
        '.env': 'GLEAN_API_TOKEN=env-token\nGLEAN_INSTANCE=env-instance\n',
      });

      const result = await runBin('--client', 'cursor', '--env', envFilePath, {
        env: {
          GLEAN_MCP_CONFIG_DIR: project.baseDir,
        },
      });

      expect(result.exitCode).toEqual(0);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Configuring Glean MCP for Cursor...
          Created new configuration file at: <TMP_DIR>/.cursor/mcp.json

          Cursor MCP configuration has been configured to: <TMP_DIR>/.cursor/mcp.json

          To use it:
          1. Restart Cursor
          2. Agent will now have access to Glean tools
          3. You'll be asked for approval when Agent uses these tools
          "
        `);

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');
      const parsedConfig = JSON.parse(configFileContents);
      expect(parsedConfig).toMatchInlineSnapshot(`
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

    it('uses token auth when both token and instance provided via environment variables', async () => {
      const result = await runBin('--client', 'cursor', {
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
            "glean_local": {
              "args": [
                "-y",
                "@gleanwork/local-mcp-server",
              ],
              "command": "npx",
              "env": {
                "GLEAN_API_TOKEN": "process-env-token",
                "GLEAN_INSTANCE": "process-env-instance",
              },
              "type": "stdio",
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
            "glean_local": {
              "args": [
                "-y",
                "@gleanwork/local-mcp-server",
              ],
              "command": "npx",
              "env": {
                "GLEAN_API_TOKEN": "flag-token",
                "GLEAN_INSTANCE": "flag-instance",
              },
              "type": "stdio",
            },
          },
        }
      `);
    });

    it('warns when env file path does not exist', async () => {
      const nonExistentPath = path.join(project.baseDir, 'nonexistent.env');

      const result = await runBin(
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
          '--client',
          'cursor',
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
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Cursor...
            Created new configuration file at: <TMP_DIR>/.cursor/mcp.json

            Cursor MCP configuration has been configured to: <TMP_DIR>/.cursor/mcp.json

            To use it:
            1. Restart Cursor
            2. Agent will now have access to Glean tools
            3. You'll be asked for approval when Agent uses these tools
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean_local": {
                "type": "stdio",
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
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
          mcpServers: {
            "github-remote": {
              url: "https://api.githubcopilot.com/mcp",
              authorization_token: "Bearer $MY_TOKEN"
            }
          }
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          '--client',
          'cursor',
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
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Cursor...
            Updated configuration file at: <TMP_DIR>/.cursor/mcp.json

            Cursor MCP configuration has been configured to: <TMP_DIR>/.cursor/mcp.json

            To use it:
            1. Restart Cursor
            2. Agent will now have access to Glean tools
            3. You'll be asked for approval when Agent uses these tools
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
              "github-remote": {
                "url": "https://api.githubcopilot.com/mcp",
                "authorization_token": "Bearer $MY_TOKEN"
              },
              "glean_local": {
                "type": "stdio",
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
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
          '--client',
          'claude',
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
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Claude Desktop...
            Created new configuration file at: <TMP_DIR>/Claude/claude_desktop_config.json

            Claude Desktop MCP configuration has been configured to: <TMP_DIR>/Claude/claude_desktop_config.json

            To use it:
            1. Restart Claude Desktop
            2. You should see a hammer icon in the input box, indicating MCP tools are available
            3. Click the hammer to see available tools
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean_local": {
                "type": "stdio",
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
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
          mcpServers: {
            "github-remote": {
              url: "https://api.githubcopilot.com/mcp",
              authorization_token: "Bearer $MY_TOKEN"
            }
          }
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          '--client',
          'claude',
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
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Claude Desktop...
            Updated configuration file at: <TMP_DIR>/Claude/claude_desktop_config.json

            Claude Desktop MCP configuration has been configured to: <TMP_DIR>/Claude/claude_desktop_config.json

            To use it:
            1. Restart Claude Desktop
            2. You should see a hammer icon in the input box, indicating MCP tools are available
            3. Click the hammer to see available tools
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
              "github-remote": {
                "url": "https://api.githubcopilot.com/mcp",
                "authorization_token": "Bearer $MY_TOKEN"
              },
              "glean_local": {
                "type": "stdio",
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
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
          '--client',
          'windsurf',
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
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean_local": {
                "type": "stdio",
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
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
          mcpServers: {
            "github-remote": {
              url: "https://api.githubcopilot.com/mcp",
              authorization_token: "Bearer $MY_TOKEN"
            }
          }
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          '--client',
          'windsurf',
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
              "github-remote": {
                "url": "https://api.githubcopilot.com/mcp",
                "authorization_token": "Bearer $MY_TOKEN"
              },
              "glean_local": {
                "type": "stdio",
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
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
    });

    describe('Goose client', () => {
      let configPath: string;
      let configFilePath: string;

      const { configDir, configFileName } = gooseConfigPath;

      beforeEach(() => {
        configPath = path.join(project.baseDir, configDir);
        configFilePath = path.join(configPath, configFileName);
      });

      it('creates a new config file when none exists', async () => {
        const result = await runBin(
          '--client',
          'goose',
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
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Goose...
            Created new configuration file at: <TMP_DIR>/.config/goose/config.yaml

            Goose MCP configuration has been configured to: <TMP_DIR>/.config/goose/config.yaml

            To use it:
            1. Restart Goose
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');
        const parsedConfig = yaml.parse(configFileContents);
        expect(parsedConfig).toMatchInlineSnapshot(`
          {
            "extensions": {
              "glean": {
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server",
                ],
                "bundled": null,
                "cmd": "npx",
                "description": "",
                "enabled": true,
                "env_keys": [],
                "envs": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                  "GLEAN_INSTANCE": "test-domain",
                },
                "name": "glean",
                "timeout": 300,
                "type": "stdio",
              },
            },
          }
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
          '--client',
          'goose',
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
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Goose...
            Updated configuration file at: <TMP_DIR>/.config/goose/config.yaml

            Goose MCP configuration has been configured to: <TMP_DIR>/.config/goose/config.yaml

            To use it:
            1. Restart Goose
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');
        const parsedConfig = yaml.parse(configFileContents);
        expect(parsedConfig).toMatchInlineSnapshot(`
          {
            "extensions": {
              "glean": {
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server",
                ],
                "bundled": null,
                "cmd": "npx",
                "description": "",
                "enabled": true,
                "env_keys": [],
                "envs": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                  "GLEAN_INSTANCE": "test-domain",
                },
                "name": "glean",
                "timeout": 300,
                "type": "stdio",
              },
            },
            "some-other-config": {
              "options": {
                "enabled": true,
              },
            },
          }
        `);
      });
    });

    describe('Goose client', () => {
      let configPath: string;
      let configFilePath: string;

      const { configDir, configFileName } = gooseConfigPath;

      beforeEach(() => {
        configPath = path.join(project.baseDir, configDir);
        configFilePath = path.join(configPath, configFileName);
      });

      it('creates a new config file when none exists', async () => {
        const result = await runBin(
          'remote',
          '--client',
          'goose',
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
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Goose...
            Created new configuration file at: <TMP_DIR>/.config/goose/config.yaml

            Goose MCP configuration has been configured to: <TMP_DIR>/.config/goose/config.yaml

            To use it:
            1. Restart Goose
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');
        const parsedConfig = yaml.parse(configFileContents);
        expect(parsedConfig).toMatchInlineSnapshot(`
          {
            "extensions": {
              "glean": {
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse",
                ],
                "bundled": null,
                "cmd": "npx",
                "description": "",
                "enabled": true,
                "env_keys": [],
                "envs": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                },
                "name": "glean",
                "timeout": 300,
                "type": "stdio",
              },
            },
          }
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
          'remote',
          '--client',
          'goose',
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
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Goose...
            Updated configuration file at: <TMP_DIR>/.config/goose/config.yaml

            Goose MCP configuration has been configured to: <TMP_DIR>/.config/goose/config.yaml

            To use it:
            1. Restart Goose
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');
        const parsedConfig = yaml.parse(configFileContents);
        expect(parsedConfig).toMatchInlineSnapshot(`
          {
            "extensions": {
              "glean": {
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse",
                ],
                "bundled": null,
                "cmd": "npx",
                "description": "",
                "enabled": true,
                "env_keys": [],
                "envs": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                },
                "name": "glean",
                "timeout": 300,
                "type": "stdio",
              },
            },
            "some-other-config": {
              "options": {
                "enabled": true,
              },
            },
          }
        `);
      });

      it('updates configurations from local to remote', async () => {
        const existingConfig = {
          extensions: {
            glean: {
              args: ['-y', '@gleanwork/local-mcp-server'],
              bundled: null,
              cmd: 'npx',
              description: '',
              enabled: true,
              env_keys: [],
              envs: {
                GLEAN_API_TOKEN: 'glean_api_existing',
                GLEAN_INSTANCE: 'existing-domain',
              },
              name: 'glean',
              timeout: 300,
              type: 'stdio',
            },
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'remote',
          '--client',
          'goose',
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
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Goose...
            Updated configuration file at: <TMP_DIR>/.config/goose/config.yaml

            Goose MCP configuration has been configured to: <TMP_DIR>/.config/goose/config.yaml

            To use it:
            1. Restart Goose
            "
          `);

        const configAfter = fs.readFileSync(configFilePath, 'utf8');
        const parsed = yaml.parse(configAfter);
        expect(parsed).toMatchInlineSnapshot(`
          {
            "extensions": {
              "glean": {
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse",
                ],
                "bundled": null,
                "cmd": "npx",
                "description": "",
                "enabled": true,
                "env_keys": [],
                "envs": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                },
                "name": "glean",
                "timeout": 300,
                "type": "stdio",
              },
            },
          }
        `);
      });

      it('configures both default and agents remote servers', async () => {
        // First, configure the default remote server
        const result1 = await runBin(
          'remote',
          '--client',
          'goose',
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

        expect(result1.exitCode).toEqual(0);

        // Then, add the agents remote server to the same config
        const result2 = await runBin(
          'remote',
          '--client',
          'goose',
          '--agents',
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

        expect(result2.exitCode).toEqual(0);

        // Verify both servers are configured
        const configFileContents = fs.readFileSync(configFilePath, 'utf8');
        const parsedConfig = yaml.parse(configFileContents);
        expect(parsedConfig).toMatchInlineSnapshot(`
          {
            "extensions": {
              "glean": {
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/agents/sse",
                ],
                "bundled": null,
                "cmd": "npx",
                "description": "",
                "enabled": true,
                "env_keys": [],
                "envs": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                },
                "name": "glean",
                "timeout": 300,
                "type": "stdio",
              },
            },
          }
        `);
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

          To use it:
          1. Enable MCP support in VS Code by adding "chat.mcp.enabled": true to your user settings
          2. Restart VS Code
          3. Open the Chat view (Ctrl+Alt+I or ⌃⌘I) and select "Agent" mode from the dropdown
          4. Click the "Tools" button to see and use Glean tools in Agent mode
          5. You'll be asked for approval when Agent uses these tools
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
                "glean_local": {
                  "args": [
                    "-y",
                    "@gleanwork/local-mcp-server",
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
          mcp: {
            servers: {
            "github-remote": {
              url: "https://api.githubcopilot.com/mcp",
              authorization_token: "Bearer $MY_TOKEN"
            }}
          }
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
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

          To use it:
          1. Enable MCP support in VS Code by adding "chat.mcp.enabled": true to your user settings
          2. Restart VS Code
          3. Open the Chat view (Ctrl+Alt+I or ⌃⌘I) and select "Agent" mode from the dropdown
          4. Click the "Tools" button to see and use Glean tools in Agent mode
          5. You'll be asked for approval when Agent uses these tools
          "
        `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');
        const parsedConfig = JSON.parse(configFileContents);

        expect(parsedConfig).toMatchInlineSnapshot(`
          {
            "editor.fontSize": 14,
            "mcp": {
              "servers": {
                "github-remote": {
                  "authorization_token": "Bearer $MY_TOKEN",
                  "url": "https://api.githubcopilot.com/mcp",
                },
                "glean_local": {
                  "args": [
                    "-y",
                    "@gleanwork/local-mcp-server",
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
    });
  });

  describe('remote', () => {
    beforeEach(() => {
      process.env.GLEAN_BETA_ENABLED = 'true';
    });

    it('prints a warning if invoked without the beta env', async () => {
      delete process.env.GLEAN_BETA_ENABLED;
      const result = await runBin(
        'remote',
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
      expect(result.stderr).toMatchInlineSnapshot(`
        "
        Please note Glean-hosted MCP servers are in private beta.  Make sure your
        instance is opted into the private beta or your assistant won't be able to
        connect after configuration.

        "
      `);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Configuring Glean MCP for Cursor...
          Created new configuration file at: <TMP_DIR>/.cursor/mcp.json

          Cursor MCP configuration has been configured to: <TMP_DIR>/.cursor/mcp.json

          To use it:
          1. Restart Cursor
          2. Agent will now have access to Glean tools
          3. You'll be asked for approval when Agent uses these tools
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
                "@gleanwork/connect-mcp-server",
                "https://test-domain-be.glean.com/mcp/default/sse"
              ],
              "type": "stdio",
              "env": {
                "GLEAN_API_TOKEN": "glean_api_test"
              }
            }
          }
        }"
      `);
    });

    it('configures the default mcp server', async () => {
      const result = await runBin(
        'remote',
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
          2. Agent will now have access to Glean tools
          3. You'll be asked for approval when Agent uses these tools
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
                "@gleanwork/connect-mcp-server",
                "https://test-domain-be.glean.com/mcp/default/sse"
              ],
              "type": "stdio",
              "env": {
                "GLEAN_API_TOKEN": "glean_api_test"
              }
            }
          }
        }"
      `);
    });

    it('configures the agents mcp server', async () => {
      const result = await runBin(
        'remote',
        '--client',
        'cursor',
        '--agents',
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
          2. Agent will now have access to Glean tools
          3. You'll be asked for approval when Agent uses these tools
          "
        `);

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');

      expect(fs.existsSync(configFilePath)).toBe(true);
      expect(configFileContents).toMatchInlineSnapshot(`
        "{
          "mcpServers": {
            "glean_agents": {
              "command": "npx",
              "args": [
                "-y",
                "@gleanwork/connect-mcp-server",
                "https://test-domain-be.glean.com/mcp/agents/sse"
              ],
              "type": "stdio",
              "env": {
                "GLEAN_API_TOKEN": "glean_api_test"
              }
            }
          }
        }"
      `);
    });

    it('can configure with custom instance and token', async () => {
      const result = await runBin(
        'remote',
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
          2. Agent will now have access to Glean tools
          3. You'll be asked for approval when Agent uses these tools
          "
        `);
    });

    it('uses token auth when both token and instance provided via flags', async () => {
      const result = await runBin(
        'remote',
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
          2. Agent will now have access to Glean tools
          3. You'll be asked for approval when Agent uses these tools
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
                "@gleanwork/connect-mcp-server",
                "https://test-instance-be.glean.com/mcp/default/sse",
              ],
              "command": "npx",
              "env": {
                "GLEAN_API_TOKEN": "test-token",
              },
              "type": "stdio",
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
        'remote',
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
          2. Agent will now have access to Glean tools
          3. You'll be asked for approval when Agent uses these tools
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
                "@gleanwork/connect-mcp-server",
                "https://env-instance-be.glean.com/mcp/default/sse",
              ],
              "command": "npx",
              "env": {
                "GLEAN_API_TOKEN": "env-token",
              },
              "type": "stdio",
            },
          },
        }
      `);
    });

    it('uses token auth when both token and instance provided via environment variables', async () => {
      const result = await runBin('remote', '--client', 'cursor', {
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
                "@gleanwork/connect-mcp-server",
                "https://process-env-instance-be.glean.com/mcp/default/sse",
              ],
              "command": "npx",
              "env": {
                "GLEAN_API_TOKEN": "process-env-token",
              },
              "type": "stdio",
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
        'remote',
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
                "@gleanwork/connect-mcp-server",
                "https://flag-instance-be.glean.com/mcp/default/sse",
              ],
              "command": "npx",
              "env": {
                "GLEAN_API_TOKEN": "flag-token",
              },
              "type": "stdio",
            },
          },
        }
      `);
    });

    it('warns when env file path does not exist', async () => {
      const nonExistentPath = path.join(project.baseDir, 'nonexistent.env');

      const result = await runBin(
        'remote',
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
          'remote',
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
            2. Agent will now have access to Glean tools
            3. You'll be asked for approval when Agent uses these tools
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
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse"
                ],
                "type": "stdio",
                "env": {
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
          'remote',
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
            2. Agent will now have access to Glean tools
            3. You'll be asked for approval when Agent uses these tools
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
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it('updates configurations from local to remote', async () => {
        const existingConfig = {
          mcpServers: {
            glean: {
              command: 'npx',
              args: ['-y', '@gleanwork/local-mcp-server'],
              env: {
                GLEAN_API_TOKEN: 'glean_api_existing',
                GLEAN_INSTANCE: 'existing-domain',
              },
            },
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'remote',
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
            2. Agent will now have access to Glean tools
            3. You'll be asked for approval when Agent uses these tools
            "
          `);

        const configAfter = fs.readFileSync(configFilePath, 'utf8');
        expect(configAfter).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it('configures both default and agents remote servers', async () => {
        // First, configure the default remote server
        const result1 = await runBin(
          'remote',
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

        expect(result1.exitCode).toEqual(0);

        // Then, add the agents remote server to the same config
        const result2 = await runBin(
          'remote',
          '--client',
          'cursor',
          '--agents',
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

        expect(result2.exitCode).toEqual(0);

        // Verify both servers are configured
        const configFileContents = fs.readFileSync(configFilePath, 'utf8');
        const parsedConfig = JSON.parse(configFileContents);
        expect(parsedConfig).toMatchInlineSnapshot(`
          {
            "mcpServers": {
              "glean": {
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse",
                ],
                "command": "npx",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                },
                "type": "stdio",
              },
              "glean_agents": {
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/agents/sse",
                ],
                "command": "npx",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                },
                "type": "stdio",
              },
            },
          }
        `);
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
          'remote',
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
            3. Click the hammer to see available tools
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
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse"
                ],
                "type": "stdio",
                "env": {
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
          'remote',
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
            3. Click the hammer to see available tools
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
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it('updates configurations from local to remote', async () => {
        const existingConfig = {
          mcpServers: {
            glean: {
              command: 'npx',
              args: ['-y', '@gleanwork/local-mcp-server'],
              env: {
                GLEAN_API_TOKEN: 'glean_api_existing',
                GLEAN_INSTANCE: 'existing-domain',
              },
            },
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'remote',
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
            3. Click the hammer to see available tools
            "
          `);

        const configAfter = fs.readFileSync(configFilePath, 'utf8');
        expect(configAfter).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it('configures both default and agents remote servers', async () => {
        // First, configure the default remote server
        const result1 = await runBin(
          'remote',
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

        expect(result1.exitCode).toEqual(0);

        // Then, add the agents remote server to the same config
        const result2 = await runBin(
          'remote',
          '--client',
          'claude',
          '--agents',
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

        expect(result2.exitCode).toEqual(0);

        // Verify both servers are configured
        const configFileContents = fs.readFileSync(configFilePath, 'utf8');
        const parsedConfig = JSON.parse(configFileContents);
        expect(parsedConfig).toMatchInlineSnapshot(`
          {
            "mcpServers": {
              "glean": {
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse",
                ],
                "command": "npx",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                },
                "type": "stdio",
              },
              "glean_agents": {
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/agents/sse",
                ],
                "command": "npx",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                },
                "type": "stdio",
              },
            },
          }
        `);
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
          'remote',
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
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse"
                ],
                "type": "stdio",
                "env": {
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
          'remote',
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
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it('updates configurations from local to remote', async () => {
        const existingConfig = {
          mcpServers: {
            glean: {
              command: 'npx',
              args: ['-y', '@gleanwork/local-mcp-server'],
              env: {
                GLEAN_API_TOKEN: 'glean_api_existing',
                GLEAN_INSTANCE: 'existing-domain',
              },
            },
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'remote',
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
            "
          `);

        const configAfter = fs.readFileSync(configFilePath, 'utf8');
        expect(configAfter).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it('configures both default and agents remote servers', async () => {
        // First, configure the default remote server
        const result1 = await runBin(
          'remote',
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

        expect(result1.exitCode).toEqual(0);

        // Then, add the agents remote server to the same config
        const result2 = await runBin(
          'remote',
          '--client',
          'windsurf',
          '--agents',
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

        expect(result2.exitCode).toEqual(0);

        // Verify both servers are configured
        const configFileContents = fs.readFileSync(configFilePath, 'utf8');
        const parsedConfig = JSON.parse(configFileContents);
        expect(parsedConfig).toMatchInlineSnapshot(`
          {
            "mcpServers": {
              "glean": {
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/default/sse",
                ],
                "command": "npx",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                },
                "type": "stdio",
              },
              "glean_agents": {
                "args": [
                  "-y",
                  "@gleanwork/connect-mcp-server",
                  "https://test-domain-be.glean.com/mcp/agents/sse",
                ],
                "command": "npx",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                },
                "type": "stdio",
              },
            },
          }
        `);
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
          'remote',
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

          To use it:
          1. Enable MCP support in VS Code by adding "chat.mcp.enabled": true to your user settings
          2. Restart VS Code
          3. Open the Chat view (Ctrl+Alt+I or ⌃⌘I) and select "Agent" mode from the dropdown
          4. Click the "Tools" button to see and use Glean tools in Agent mode
          5. You'll be asked for approval when Agent uses these tools
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
                    "@gleanwork/connect-mcp-server",
                    "https://test-domain-be.glean.com/mcp/default/sse",
                  ],
                  "command": "npx",
                  "env": {
                    "GLEAN_API_TOKEN": "glean_api_test",
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
          'remote',
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

          To use it:
          1. Enable MCP support in VS Code by adding "chat.mcp.enabled": true to your user settings
          2. Restart VS Code
          3. Open the Chat view (Ctrl+Alt+I or ⌃⌘I) and select "Agent" mode from the dropdown
          4. Click the "Tools" button to see and use Glean tools in Agent mode
          5. You'll be asked for approval when Agent uses these tools
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
                    "@gleanwork/connect-mcp-server",
                    "https://test-domain-be.glean.com/mcp/default/sse",
                  ],
                  "command": "npx",
                  "env": {
                    "GLEAN_API_TOKEN": "glean_api_test",
                  },
                  "type": "stdio",
                },
              },
            },
            "workbench.colorTheme": "Default Dark+",
          }
        `);
      });

      it('updates configurations from local to remote', async () => {
        const existingConfig = {
          'editor.fontSize': 14,
          mcp: {
            servers: {
              glean: {
                type: 'stdio',
                command: 'npx',
                args: ['-y', '@gleanwork/local-mcp-server'],
                env: {
                  GLEAN_INSTANCE: 'existing-domain',
                  GLEAN_API_TOKEN: 'glean_api_existing',
                },
              },
            },
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'remote',
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

          To use it:
          1. Enable MCP support in VS Code by adding "chat.mcp.enabled": true to your user settings
          2. Restart VS Code
          3. Open the Chat view (Ctrl+Alt+I or ⌃⌘I) and select "Agent" mode from the dropdown
          4. Click the "Tools" button to see and use Glean tools in Agent mode
          5. You'll be asked for approval when Agent uses these tools
          "
        `);

        const configAfter = fs.readFileSync(configFilePath, 'utf8');
        expect(configAfter).toMatchInlineSnapshot(`
          "{
            "editor.fontSize": 14,
            "mcp": {
              "servers": {
                "glean": {
                  "command": "npx",
                  "args": [
                    "-y",
                    "@gleanwork/connect-mcp-server",
                    "https://test-domain-be.glean.com/mcp/default/sse"
                  ],
                  "type": "stdio",
                  "env": {
                    "GLEAN_API_TOKEN": "glean_api_test"
                  }
                }
              }
            }
          }"
        `);
      });

      it('configures both default and agents remote servers', async () => {
        // First, configure the default remote server
        const result1 = await runBin(
          'remote',
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

        expect(result1.exitCode).toEqual(0);

        // Then, add the agents remote server to the same config
        const result2 = await runBin(
          'remote',
          '--client',
          'vscode',
          '--agents',
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

        expect(result2.exitCode).toEqual(0);

        // Verify both servers are configured
        const configFileContents = fs.readFileSync(configFilePath, 'utf8');
        const parsedConfig = JSON.parse(configFileContents);
        expect(parsedConfig).toMatchInlineSnapshot(`
          {
            "mcp": {
              "servers": {
                "glean": {
                  "args": [
                    "-y",
                    "@gleanwork/connect-mcp-server",
                    "https://test-domain-be.glean.com/mcp/default/sse",
                  ],
                  "command": "npx",
                  "env": {
                    "GLEAN_API_TOKEN": "glean_api_test",
                  },
                  "type": "stdio",
                },
                "glean_agents": {
                  "args": [
                    "-y",
                    "@gleanwork/connect-mcp-server",
                    "https://test-domain-be.glean.com/mcp/agents/sse",
                  ],
                  "command": "npx",
                  "env": {
                    "GLEAN_API_TOKEN": "glean_api_test",
                  },
                  "type": "stdio",
                },
              },
            },
          }
        `);
      });
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
