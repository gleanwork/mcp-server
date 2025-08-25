import path from 'path';
import fs from 'fs';
import { createBinTester, BinTesterProject } from '@scalvert/bin-tester';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ConfigFileContents } from '../configure/index.js';
import yaml from 'yaml';

// Define config paths - MUST match what the actual CLI uses for each platform
function getClaudeConfigPath() {
  // This MUST match what the actual claude.ts client uses
  if (process.platform === 'darwin') {
    return {
      configDir: path.join('Library', 'Application Support', 'Claude'),
      configFileName: 'claude_desktop_config.json',
    };
  } else if (process.platform === 'win32') {
    return {
      configDir: 'Claude',
      configFileName: 'claude_desktop_config.json',
    };
  } else {
    // Linux - uses XDG config directory
    return {
      configDir: path.join('.config', 'Claude'),
      configFileName: 'claude_desktop_config.json',
    };
  }
}

const cursorConfigPath = { configDir: '.cursor', configFileName: 'mcp.json' };
const claudeConfigPath = getClaudeConfigPath();
const claudeCodeConfigPath = { configDir: '', configFileName: '.claude.json' };
const windsurfConfigPath = {
  configDir: path.join('.codeium', 'windsurf'),
  configFileName: 'mcp_config.json',
};
const gooseConfigPath = {
  configDir: path.join('.config', 'goose'),
  configFileName: 'config.yaml',
};

function normalizeOutput(output: string, baseDir: string): string {
  let normalized = normalizeBaseDirOutput(output, baseDir);
  normalized = normalizeVersionOutput(normalized);
  normalized = normalizeVSCodeConfigPath(normalized);
  normalized = normalizeClaudeConfigPath(normalized);

  return normalized;
}

function normalizeBaseDirOutput(output: string, baseDir: string): string {
  return output.replace(new RegExp(baseDir, 'g'), '<TMP_DIR>');
}

function normalizeVersionOutput(output: string): string {
  return output.replace(/Version: v\d+\.\d+\.\d+/g, 'Version: v9.9.9');
}

function normalizeVSCodeConfigPath(output: string): string {
  // Normalize VS Code config paths (both mcp.json and settings.json)
  return output
    .replace(
      /[^\s"]*(\.config|Library\/Application Support|Code)([/\\][^/\\]+)*[/\\]mcp\.json/g,
      '<VS_CODE_CONFIG_DIR>/mcp.json',
    )
    .replace(
      /[^\s"]*(\.config|Code|Application Support)([/\\][^/\\]+)*[/\\]settings\.json/g,
      '<VS_CODE_CONFIG_DIR>/settings.json',
    );
}

function normalizeClaudeConfigPath(output: string): string {
  // Normalize Claude Desktop config paths across platforms
  // macOS: Library/Application Support/Claude/claude_desktop_config.json
  // Windows: Claude/claude_desktop_config.json
  // Linux: Claude/claude_desktop_config.json (hypothetically)
  return output.replace(
    /[^\s"]*(Library\/Application Support\/Claude|Claude)[/\\]claude_desktop_config\.json/g,
    '<CLAUDE_CONFIG_DIR>/claude_desktop_config.json',
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

    delete process.env.GLEAN_BETA_ENABLED;
    delete process.env.GLEAN_API_TOKEN;
    delete process.env.GLEAN_INSTANCE;
    delete process.env.GLEAN_SUBDOMAIN;
    delete process.env.GLEAN_URL;
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

            Available MCP servers:

              local     A local server using Glean's API to access common tools (search, chat)
              remote    Connect to Glean's hosted MCP servers (default tools and agents).


            $ npx @gleanwork/configure-mcp-server --client <client-name> [options]

          Commands
            local       Configure Glean's local MCP server for a given client
            remote      Configure Glean's remote MCP server for a given client
            help        Show this help message

          Options for local
            --client, -c    MCP client to configure for (claude-code, claude, cursor, goose, vscode, windsurf)
            --token, -t     Glean API token (required)
            --instance, -i  Glean instance name
            --env, -e       Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
            --workspace     Create workspace configuration instead of global (VS Code only)

          Options for remote
            --client, -c    MCP client to configure for (claude-code, claude, cursor, goose, vscode, windsurf)
            --url, -u       Full MCP server URL (required, e.g., https://my-be.glean.com/mcp/default)
            --token, -t     Glean API token (optional, OAuth will be used if not provided)
            --env, -e       Path to .env file containing GLEAN_URL and optionally GLEAN_API_TOKEN
            --workspace     Create workspace configuration instead of global (VS Code only)


          Examples

            Local:

            npx @gleanwork/configure-mcp-server local --instance acme --client cursor --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client claude --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client cursor --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client goose --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client windsurf --env ~/.glean.env
            npx @gleanwork/configure-mcp-server local --instance acme --client vscode --workspace --token glean_api_xyz

            Remote:

            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client cursor
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/agents --client claude
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/analytics --client cursor
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client goose
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client windsurf
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client vscode --workspace
          
            # With explicit token (bypasses DCR):
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client cursor --token glean_api_xyz

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
            --client, -c    MCP client to configure for (claude-code, claude, cursor, goose, vscode, windsurf)
            --token, -t     Glean API token (required)
            --instance, -i  Glean instance name
            --env, -e       Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
            --workspace     Create workspace configuration instead of global (VS Code only)

          Options for remote
            --client, -c    MCP client to configure for (claude-code, claude, cursor, goose, vscode, windsurf)
            --url, -u       Full MCP server URL (required, e.g., https://my-be.glean.com/mcp/default)
            --token, -t     Glean API token (optional, OAuth will be used if not provided)
            --env, -e       Path to .env file containing GLEAN_URL and optionally GLEAN_API_TOKEN
            --workspace     Create workspace configuration instead of global (VS Code only)


          Examples

            Local:

            npx @gleanwork/configure-mcp-server local --instance acme --client cursor --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client claude --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client cursor --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client goose --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client windsurf --env ~/.glean.env
            npx @gleanwork/configure-mcp-server local --instance acme --client vscode --workspace --token glean_api_xyz

            Remote:

            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client cursor
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/agents --client claude
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/analytics --client cursor
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client goose
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client windsurf
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client vscode --workspace
          
            # With explicit token (bypasses DCR):
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client cursor --token glean_api_xyz

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
      Supported clients: claude-code, claude, cursor, goose, vscode, windsurf"
    `);
    expect(result.stdout).toMatchInlineSnapshot(`""`);
  });

  for (const command of ['local', 'remote']) {
    describe(command, () => {
      it('fails when only token provided', async () => {
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

          Error configuring client: Local configuration requires an instance (--instance) or URL. Please provide it via command line options or in your .env file."
        `);
      });

      it('fails when only instance provided', async () => {
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
          `"Error configuring client: Local configuration requires an API token (--token). Please provide it via command line options or in your .env file."`,
        );
      });

      it('fails when env file has only token', async () => {
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
          `"Error configuring client: Local configuration requires an instance (--instance) or URL. Please provide it via command line options or in your .env file."`,
        );
      });

      it('fails when env file has only instance', async () => {
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
          `"Error configuring client: Local configuration requires an API token (--token). Please provide it via command line options or in your .env file."`,
        );
      });

      it('fails when neither token nor instance provided', async () => {
        const result = await runBin('--client', 'cursor', {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        });

        expect(result.exitCode).toEqual(1);
        expect(result.stderr).toMatchInlineSnapshot(`
          "Error: You must provide either:
            1. Both --token and --instance for local configuration, or
            2. --url for remote configuration, or
            3. --env pointing to a .env file with configuration
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

    describe('Claude Code client', () => {
      let configPath: string;
      let configFilePath: string;

      const { configDir, configFileName } = claudeCodeConfigPath;

      beforeEach(() => {
        configPath = path.join(project.baseDir, configDir);
        configFilePath = path.join(configPath, configFileName);
      });

      it('creates a new config file when none exists', async () => {
        const result = await runBin(
          '--client',
          'claude-code',
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
            "Configuring Glean MCP for Claude Code...
            Created new configuration file at: <TMP_DIR>/.claude.json

            Claude Code MCP configuration has been configured to: <TMP_DIR>/.claude.json

            To use it:
            1. Run \`claude mcp list\` and verify the server is listed
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
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
          '.mcpServers': {
            'github-remote': {
              url: 'https://api.githubcopilot.com/mcp',
              authorization_token: 'Bearer $MY_TOKEN',
            },
          },
        } as ConfigFileContents;

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          '--client',
          'claude-code',
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
            "Configuring Glean MCP for Claude Code...
            Updated configuration file at: <TMP_DIR>/.claude.json

            Claude Code MCP configuration has been configured to: <TMP_DIR>/.claude.json

            To use it:
            1. Run \`claude mcp list\` and verify the server is listed
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
            ".mcpServers": {
              "github-remote": {
                "url": "https://api.githubcopilot.com/mcp",
                "authorization_token": "Bearer $MY_TOKEN"
              }
            },
            "mcpServers": {
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
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
        `
        "Warning: .env file not found at <TMP_DIR>/nonexistent.env
        Error configuring client: Local configuration requires an instance (--instance) or URL. Please provide it via command line options or in your .env file."
      `,
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
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
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
            'github-remote': {
              url: 'https://api.githubcopilot.com/mcp',
              authorization_token: 'Bearer $MY_TOKEN',
            },
          },
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
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
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
        // Ensure parent directories exist for Claude config
        if (configDir) {
          fs.mkdirSync(configPath, { recursive: true });
        }
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
            "Configuring Glean MCP for Claude for Desktop...
            Created new configuration file at: <CLAUDE_CONFIG_DIR>/claude_desktop_config.json

            Claude for Desktop MCP configuration has been configured to: <CLAUDE_CONFIG_DIR>/claude_desktop_config.json

            To use it:
            1. Restart Claude Desktop
            2. MCP tools will be available in your conversations
            3. The model will have access to Glean search and other configured tools
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
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
            'github-remote': {
              url: 'https://api.githubcopilot.com/mcp',
              authorization_token: 'Bearer $MY_TOKEN',
            },
          },
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
            "Configuring Glean MCP for Claude for Desktop...
            Updated configuration file at: <CLAUDE_CONFIG_DIR>/claude_desktop_config.json

            Claude for Desktop MCP configuration has been configured to: <CLAUDE_CONFIG_DIR>/claude_desktop_config.json

            To use it:
            1. Restart Claude Desktop
            2. MCP tools will be available in your conversations
            3. The model will have access to Glean search and other configured tools
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
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
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

    describe('Claude Code client', () => {
      let configPath: string;
      let configFilePath: string;

      const { configDir, configFileName } = claudeCodeConfigPath;

      beforeEach(() => {
        configPath = path.join(project.baseDir, configDir);
        configFilePath = path.join(configPath, configFileName);
      });

      it('creates a new config file when none exists', async () => {
        const result = await runBin(
          'local',
          '--client',
          'claude-code',
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
            "Configuring Glean MCP for Claude Code...
            Created new configuration file at: <TMP_DIR>/.claude.json

            Claude Code MCP configuration has been configured to: <TMP_DIR>/.claude.json

            To use it:
            1. Run \`claude mcp list\` and verify the server is listed
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
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
        } as ConfigFileContents;

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'local',
          '--client',
          'claude-code',
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
            "Configuring Glean MCP for Claude Code...
            Updated configuration file at: <TMP_DIR>/.claude.json

            Claude Code MCP configuration has been configured to: <TMP_DIR>/.claude.json

            To use it:
            1. Run \`claude mcp list\` and verify the server is listed
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
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
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
            'github-remote': {
              url: 'https://api.githubcopilot.com/mcp',
              authorization_token: 'Bearer $MY_TOKEN',
            },
          },
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
              _SKIP_INSTANCE_PREFLIGHT: 'true',
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
            "glean_local": {
              "args": [
                "-y",
                "@gleanwork/local-mcp-server",
              ],
              "bundled": null,
              "cmd": "npx",
              "description": null,
              "enabled": true,
              "env_keys": [],
              "envs": {
                "GLEAN_API_TOKEN": "glean_api_test",
                "GLEAN_INSTANCE": "test-domain",
              },
              "name": "glean_local",
              "timeout": 300,
              "type": "stdio",
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
              _SKIP_INSTANCE_PREFLIGHT: 'true',
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
            "glean_local": {
              "args": [
                "-y",
                "@gleanwork/local-mcp-server",
              ],
              "bundled": null,
              "cmd": "npx",
              "description": null,
              "enabled": true,
              "env_keys": [],
              "envs": {
                "GLEAN_API_TOKEN": "glean_api_test",
                "GLEAN_INSTANCE": "test-domain",
              },
              "name": "glean_local",
              "timeout": 300,
              "type": "stdio",
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

    describe('VS Code client', () => {
      let configFilePath: string;

      beforeEach(() => {
        const platform = process.platform;

        if (platform === 'win32') {
          configFilePath = path.join(
            project.baseDir,
            'Code',
            'User',
            'mcp.json',
          );
        } else if (platform === 'darwin') {
          configFilePath = path.join(
            project.baseDir,
            'Library',
            'Application Support',
            'Code',
            'User',
            'mcp.json',
          );
        } else {
          configFilePath = path.join(
            project.baseDir,
            '.config',
            'Code',
            'User',
            'mcp.json',
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
          "Configuring Glean MCP for Visual Studio Code...
          Created new configuration file at: <VS_CODE_CONFIG_DIR>/mcp.json

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
              'github-remote': {
                url: 'https://api.githubcopilot.com/mcp',
                authorization_token: 'Bearer $MY_TOKEN',
              },
            },
          },
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
          "Configuring Glean MCP for Visual Studio Code...
          Updated configuration file at: <VS_CODE_CONFIG_DIR>/mcp.json

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

    it('requires --url for remote configuration', async () => {
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

      expect(result.exitCode).toEqual(1);
      expect(result.stderr).toContain(
        'Remote configurations require a full URL (--url)',
      );
    });

    it('configures with --url for full MCP server URLs', async () => {
      const result = await runBin(
        'remote',
        '--url',
        'https://my-be.glean.com/mcp/analytics',
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

      const configFileContents = fs.readFileSync(
        path.join(project.baseDir, '.cursor', 'mcp.json'),
        'utf8',
      );
      const config = JSON.parse(configFileContents);
      expect(config).toMatchInlineSnapshot(`
        {
          "mcpServers": {
            "glean_analytics": {
              "type": "http",
              "url": "https://my-be.glean.com/mcp/analytics",
            },
          },
        }
      `);
    });

    it('uses "glean" as server name when URL contains /mcp/default', async () => {
      const result = await runBin(
        'remote',
        '--url',
        'https://my-be.glean.com/mcp/default',
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

      expect(result.exitCode).toEqual(0);

      const configFileContents = fs.readFileSync(
        path.join(project.baseDir, '.cursor', 'mcp.json'),
        'utf8',
      );
      const config = JSON.parse(configFileContents);
      // With the new centralized logic, /mcp/default produces "glean_default"
      expect(Object.keys(config.mcpServers)[0]).toBe('glean_default');
      expect(config.mcpServers.glean_default).toMatchInlineSnapshot(`
        {
          "type": "http",
          "url": "https://my-be.glean.com/mcp/default",
        }
      `);
    });

    it('warns when --agents is used with --url', async () => {
      const result = await runBin(
        'remote',
        '--url',
        'https://my-be.glean.com/mcp/custom-agent',
        '--agents',
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

      expect(result.exitCode).toEqual(0);
      // Warning goes to stderr
      expect(normalizeOutput(result.stderr, project.baseDir)).toContain(
        'Note: --agents flag is ignored when using --url',
      );

      const configFileContents = fs.readFileSync(
        path.join(project.baseDir, '.cursor', 'mcp.json'),
        'utf8',
      );
      const config = JSON.parse(configFileContents);
      // With the new centralized logic, --agents flag takes precedence
      expect(Object.keys(config.mcpServers)[0]).toBe('glean_agents');
    });

    it('warns when both --url and --instance are provided and ignores instance', async () => {
      const result = await runBin(
        'remote',
        '--url',
        'https://my-be.glean.com/mcp/analytics',
        '--instance',
        'test-instance',
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

      expect(result.exitCode).toEqual(0);
      // Check both stdout and stderr for the warning message
      const output = normalizeOutput(
        result.stdout + result.stderr,
        project.baseDir,
      );
      expect(output).toContain(
        'Warning: Both --instance and --url were provided. The --instance flag will be ignored when --url is specified.',
      );

      // Verify that the URL was used, not the instance
      const configPath = path.join(project.baseDir, '.cursor', 'mcp.json');
      const configFileContents = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configFileContents);
      expect(Object.keys(config.mcpServers)[0]).toBe('glean_analytics');
      // Cursor supports native HTTP for remote configurations
      expect(config.mcpServers.glean_analytics.type).toBe('http');
      expect(config.mcpServers.glean_analytics.url).toBe(
        'https://my-be.glean.com/mcp/analytics',
      );
    });
  });
});
