/**
 * Configuration module for Glean MCP Server
 *
 * Handles configuration of MCP settings for different host applications:
 * - Claude Desktop
 * - Windsurf
 * - Cursor
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import yaml from 'yaml';
import {
  availableClients,
  ensureClientsLoaded,
  MCPClientConfig,
  MCPConfig,
  ConfigFileContents,
} from './client/index.js';
import { trace, error } from '@gleanwork/mcp-server-utils/logger';
import { validateInstance } from '@gleanwork/mcp-server-utils/util';
import { VERSION } from '../common/version.js';

export type { MCPConfig, ConfigFileContents } from './client/index.js';

/**
 * Configure options interface
 */
export interface ConfigureOptions {
  token?: string;
  instance?: string;
  remote?: boolean;
  agents?: boolean;
  url?: string;
  envPath?: string;
  workspace?: boolean;
}

/**
 * Load environment variables from .env file or existing environment
 */
function loadCredentials(options: ConfigureOptions): {
  instance?: string;
  url?: string;
  apiToken?: string;
} {
  const result: { instance?: string; url?: string; apiToken?: string } = {
    instance: undefined,
    url: undefined,
    apiToken: undefined,
  };

  if (options.envPath) {
    try {
      const envPath = options.envPath.startsWith('~')
        ? options.envPath.replace('~', os.homedir())
        : options.envPath;

      if (!fs.existsSync(envPath)) {
        console.error(`Warning: .env file not found at ${envPath}`);
      } else {
        const envConfig = dotenv.config({ path: envPath, quiet: true });

        if (envConfig.error) {
          throw new Error(
            `Failed to parse .env file: ${envConfig.error.message}`,
          );
        }

        // Check for URL first, then instance
        if (envConfig.parsed?.GLEAN_URL) {
          result.url = envConfig.parsed.GLEAN_URL;
        } else if (
          envConfig.parsed?.GLEAN_INSTANCE ||
          envConfig.parsed?.GLEAN_SUBDOMAIN
        ) {
          result.instance =
            envConfig.parsed.GLEAN_INSTANCE || envConfig.parsed.GLEAN_SUBDOMAIN;
        }
        result.apiToken = envConfig.parsed?.GLEAN_API_TOKEN;
      }
    } catch (error: any) {
      console.error(`Error loading .env file: ${error.message}`);
    }
  }

  // Direct options take precedence over env file
  if (options.instance) {
    result.instance = options.instance;
  }

  if (options.url) {
    result.url = options.url;
  }

  if (options.token) {
    result.apiToken = options.token;
  }

  // Fall back to environment variables if not set via options or env file
  if (!result.instance && !result.url) {
    if (process.env.GLEAN_URL) {
      result.url = process.env.GLEAN_URL;
    } else if (process.env.GLEAN_INSTANCE || process.env.GLEAN_SUBDOMAIN) {
      result.instance =
        process.env.GLEAN_INSTANCE || process.env.GLEAN_SUBDOMAIN;
    }
  }

  if (!result.apiToken) {
    result.apiToken = process.env.GLEAN_API_TOKEN;
  }

  return result;
}

/**
 * Handles the configuration process for the specified MCP client
 *
 * @param client - The MCP client to configure for (cursor, claude, windsurf, vscode)
 * @param options - Configuration options including token, instance, url, envPath, and workspace
 */
export async function configure(client: string, options: ConfigureOptions) {
  trace('configuring ', client);
  await ensureClientsLoaded();

  const normalizedClient = client.toLowerCase();

  if (!availableClients[normalizedClient]) {
    console.error(`Unsupported MCP client: ${client}`);
    console.error(
      'Supported clients: ' + Object.keys(availableClients).join(', '),
    );
    process.exit(1);
  }

  // Validate --workspace flag is only used with VS Code
  if (options.workspace && normalizedClient !== 'vscode') {
    console.error(
      'Configuration failed: --workspace flag is only supported for VS Code',
    );
    process.exit(1);
  }

  // Handle conflicting --instance and --url flags
  if (options.instance && options.url) {
    console.warn(
      'Warning: Both --instance and --url were provided. The --instance flag will be ignored when --url is specified.',
    );
    delete options.instance;
  }

  // For remote configurations, require a URL, not an instance name
  if (options.remote && options.instance && !options.url) {
    console.error(
      'Configuration failed: Remote configurations require a full URL (--url), not an instance name (--instance)',
    );
    console.error('Example: --url https://my-company-be.glean.com/mcp/default');
    process.exit(1);
  }

  const clientConfig = availableClients[normalizedClient];
  console.log(`Configuring Glean MCP for ${clientConfig.displayName}...`);

  const homedir = os.homedir();

  let configFilePath: string;
  try {
    configFilePath = clientConfig.configFilePath(homedir, options);
  } catch (error: any) {
    console.error(`Configuration failed: ${error.message}`);
    process.exit(1);
  }

  if (options.instance && process.env._SKIP_INSTANCE_PREFLIGHT !== 'true') {
    trace(`Validating instance: ${options.instance}...`);
    if (!(await validateInstance(options.instance))) {
      error(`Error validating instance: ${options.instance}`);
      console.error();
      console.error(
        `Unable to establish a connection to Glean instance: ${options.instance}`,
      );
      console.error();
      console.error('Troubleshooting tips:');
      console.error('1. Check that the instance name or URL is correct');
      console.error(
        '  • Visit https://app.glean.com/admin/about-glean and look for "Server instance"',
      );
      console.error('2. Verify your internet connection and try again');
      process.exit(1);
    }
  }

  try {
    // Load credentials from all sources first (flags, env files, environment)
    const { instance, url, apiToken } = loadCredentials(options);

    // Determine what we're configuring based on what's provided
    const instanceOrUrl = url || instance;

    // Validate based on configuration type
    if (options.remote) {
      // Remote: URL required, token optional (DCR is default)
      if (!url) {
        throw new Error(
          'Remote configuration requires a URL (--url). Please provide it via command line options or in your .env file.',
        );
      }
      if (apiToken) {
        trace('Remote configuration with explicit token (bypassing DCR)');
      } else {
        trace('Remote configuration using DCR (no token provided)');
      }
    } else {
      // Local: both instance and token required
      if (!instance && !url) {
        throw new Error(
          'Local configuration requires an instance (--instance) or URL. Please provide it via command line options or in your .env file.',
        );
      }
      if (!apiToken) {
        throw new Error(
          'Local configuration requires an API token (--token). Please provide it via command line options or in your .env file.',
        );
      }
      trace('Local configuration with instance and token');
    }

    trace(
      apiToken
        ? 'configuring with token auth'
        : 'configuring without token (DCR will be used for remote)',
    );
    const newConfig = clientConfig.configTemplate(
      instanceOrUrl,
      apiToken,
      options,
    );
    writeConfigFile(configFilePath, newConfig, clientConfig, options);
  } catch (error: any) {
    console.error(`Error configuring client: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Helper function to write configuration to file
 */
function writeConfigFile(
  configFilePath: string,
  newConfig: MCPConfig,
  clientConfig: MCPClientConfig,
  options: ConfigureOptions,
) {
  const ext = path.extname(configFilePath).toLowerCase();
  const isYaml = ext === '.yaml' || ext === '.yml';

  if (fs.existsSync(configFilePath)) {
    const fileContent = fs.readFileSync(configFilePath, 'utf-8');
    let existingConfig: ConfigFileContents;

    try {
      existingConfig = isYaml
        ? (yaml.parse(fileContent) as ConfigFileContents)
        : (JSON.parse(fileContent) as ConfigFileContents);
    } catch (error: any) {
      const backupPath = `${configFilePath}.backup-${Date.now()}`;

      console.error(
        `Error parsing existing configuration file: ${error.message}`,
      );
      console.error(
        `Creating backup of existing file to ${backupPath} and creating new one...`,
      );

      fs.copyFileSync(configFilePath, backupPath);
      console.log(`Backup created at: ${backupPath}`);

      if (isYaml) {
        fs.writeFileSync(configFilePath, yaml.stringify(newConfig));
      } else {
        fs.writeFileSync(configFilePath, JSON.stringify(newConfig, null, 2));
      }
      console.log(`New configuration file created at: ${configFilePath}`);
      console.log(clientConfig.successMessage(configFilePath, options));
      return;
    }

    existingConfig = clientConfig.updateConfig(
      existingConfig,
      newConfig,
      options,
    );

    if (isYaml) {
      fs.writeFileSync(configFilePath, yaml.stringify(existingConfig));
    } else {
      fs.writeFileSync(configFilePath, JSON.stringify(existingConfig, null, 2));
    }
    console.log(`Updated configuration file at: ${configFilePath}`);
  } else {
    const configDir = path.dirname(configFilePath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    if (isYaml) {
      fs.writeFileSync(configFilePath, yaml.stringify(newConfig));
    } else {
      fs.writeFileSync(configFilePath, JSON.stringify(newConfig, null, 2));
    }
    console.log(`Created new configuration file at: ${configFilePath}`);
  }

  console.log(clientConfig.successMessage(configFilePath, options));
}

/**
 * Lists all supported MCP clients
 */
export async function listSupportedClients() {
  await ensureClientsLoaded();

  console.log('\nSupported MCP clients:');
  console.log('=====================');

  const clients = Object.entries(availableClients);

  if (clients.length === 0) {
    console.log(
      'No clients found. This may be an issue with the configuration.',
    );
  } else {
    const longestName = Math.max(...clients.map(([key]) => key.length));

    for (const [key, config] of clients) {
      console.log(`  ${key.padEnd(longestName + 2)} ${config.displayName}`);
    }
  }

  console.log('\nUsage:');
  console.log(
    '  npx @gleanwork/configure-mcp-server --client <client> [--token <token>] [--instance <instance>]',
  );
  console.log(
    '  npx @gleanwork/configure-mcp-server --client <client> --env <path-to-env-file>',
  );

  console.log('\nExamples:');
  if (clients.length > 0) {
    const exampleClient = clients[0][0];
    console.log(
      `  npx @gleanwork/configure-mcp-server --client ${exampleClient} --token your-token --instance your-instance`,
    );
    console.log(
      `  npx @gleanwork/configure-mcp-server --client ${exampleClient} --env ~/.glean.env`,
    );
  }

  console.log(`\nVersion: v${VERSION}`);
}

/**
 * Validates client and credential parameters
 * Returns true if validation passes, false if it fails (with appropriate error messages)
 */
export async function validateFlags(
  client: string | undefined,
  token: string | undefined,
  instance: string | undefined,
  url: string | undefined,
  env: string | undefined,
): Promise<boolean> {
  if (!client) {
    console.error('Error: --client parameter is required');
    console.error('Run with --help for usage information');
    await listSupportedClients();
    return false;
  }

  const hasDeployment = Boolean(instance || url);
  const hasToken = Boolean(token);

  const hasEnvironmentToken = Boolean(process.env.GLEAN_API_TOKEN);
  const hasEnvironmentInstance = Boolean(
    process.env.GLEAN_INSTANCE ||
      process.env.GLEAN_SUBDOMAIN ||
      process.env.GLEAN_URL,
  );

  const hasEnvParam = Boolean(env);

  const hasAnyInstance = Boolean(hasDeployment || hasEnvironmentInstance);
  const hasAnyToken = Boolean(hasToken || hasEnvironmentToken);

  if (instance && url) {
    console.warn(
      'Warning: Both --instance and --url were provided. The --instance flag will be ignored when --url is specified.',
    );
  }

  // For validation, we don't know if it's local or remote command
  // So we need to be more permissive and let the configure function handle the specifics

  // If neither instance/URL nor token is provided and no env file
  if (!hasAnyInstance && !hasAnyToken && !hasEnvParam) {
    console.error('Error: You must provide either:');
    console.error(
      '  1. Both --token and --instance for local configuration, or',
    );
    console.error('  2. --url for remote configuration, or');
    console.error('  3. --env pointing to a .env file with configuration');
    console.error('Run with --help for usage information');
    return false;
  }

  // Warn about partial configurations (but don't fail - let configure handle it)
  if (hasAnyToken && !hasAnyInstance && !hasEnvParam) {
    console.error(`
"Warning: Configuring without complete credentials.
You must provide either:
  1. Both --token and --instance, or
  2. --env pointing to a .env file containing GLEAN_API_TOKEN and GLEAN_INSTANCE

Continuing with configuration, but you will need to set credentials manually later."
`);
    return true;
  }

  return true;
}
