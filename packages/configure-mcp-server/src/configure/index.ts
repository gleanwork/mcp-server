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
import {
  availableClients,
  ensureClientsLoaded,
  MCPClientConfig,
  MCPConfig,
  ConfigFileContents,
} from './client/index.js';
import { ensureAuthTokenPresence, setupMcpRemote } from '@gleanwork/mcp-server-utils/auth';
import { trace, error } from '@gleanwork/mcp-server-utils/logger';
import { validateInstance } from '@gleanwork/mcp-server-utils/util';
import { VERSION } from '../common/version.js';
import { isOAuthEnabled } from '../common/env.js';

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
  instanceOrUrl?: string;
  apiToken?: string;
} {
  const result: { instanceOrUrl?: string; apiToken?: string } = {
    instanceOrUrl: undefined,
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
        const envConfig = dotenv.config({ path: envPath });

        if (envConfig.error) {
          throw new Error(
            `Failed to parse .env file: ${envConfig.error.message}`,
          );
        }

        result.instanceOrUrl =
          envConfig.parsed?.GLEAN_INSTANCE ||
          envConfig.parsed?.GLEAN_SUBDOMAIN ||
          envConfig.parsed?.GLEAN_BASE_URL;
        result.apiToken = envConfig.parsed?.GLEAN_API_TOKEN;
      }
    } catch (error: any) {
      console.error(`Error loading .env file: ${error.message}`);
    }
  }

  if (options.instance) {
    result.instanceOrUrl = options.instance;
  }

  if (options.url) {
    result.instanceOrUrl = options.url;
  }

  if (options.token) {
    result.apiToken = options.token;
  }

  if (!result.instanceOrUrl) {
    result.instanceOrUrl =
      process.env.GLEAN_INSTANCE ||
      process.env.GLEAN_SUBDOMAIN ||
      process.env.GLEAN_BASE_URL;
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
      console.error(
        '1. Check that the instance name is spelled correctly  (e.g. "acme" for acme-be.glean.com)',
      );
      console.error(
        '  • Visit https://app.glean.com/admin/about-glean and look for "Server instance"',
      );
      console.error('2. Verify your internet connection and try again');
      process.exit(1);
    }
  }

  try {
    // Load credentials from all sources first (flags, env files, environment)
    const { instanceOrUrl, apiToken } = loadCredentials(options);

    // If we have both token and instance from any source, use token auth
    if (apiToken && instanceOrUrl) {
      trace('configuring Glean token auth');
      const newConfig = clientConfig.configTemplate(
        instanceOrUrl,
        apiToken,
        options,
      );
      writeConfigFile(configFilePath, newConfig, clientConfig, options);
      return;
    }

    // No token available from any source, check if OAuth is enabled
    const oauthEnabled = isOAuthEnabled();
    if (!oauthEnabled) {
      throw new Error(
        'API token is required. Please provide a token with the --token option or in your .env file.',
      );
    }

    // For OAuth flow (requires GLEAN_OAUTH_ENABLED and instance/URL)
    if (!instanceOrUrl) {
      throw new Error('Instance or URL is required for OAuth configuration');
    }

    // Set environment variables for OAuth flow
    if (
      instanceOrUrl.startsWith('http://') ||
      instanceOrUrl.startsWith('https://')
    ) {
      process.env.GLEAN_BASE_URL = instanceOrUrl.endsWith('/rest/api/v1')
        ? instanceOrUrl
        : `${instanceOrUrl}/rest/api/v1`;
    } else {
      process.env.GLEAN_INSTANCE = instanceOrUrl;
    }

    const authSuccess = await ensureAuthTokenPresence();
    if (!authSuccess) {
      throw new Error('OAuth authorization failed');
    }

    await setupMcpRemote({
      target: options.agents ? 'agents' : 'default'
    });

    const newConfig = clientConfig.configTemplate(
      instanceOrUrl,
      undefined,
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
  if (fs.existsSync(configFilePath)) {
    const fileContent = fs.readFileSync(configFilePath, 'utf-8');
    let existingConfig: ConfigFileContents;

    try {
      existingConfig = JSON.parse(fileContent) as ConfigFileContents;
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

      fs.writeFileSync(configFilePath, JSON.stringify(newConfig, null, 2));
      console.log(`New configuration file created at: ${configFilePath}`);
      console.log(clientConfig.successMessage(configFilePath, options));
      return;
    }

    const hasConfig = clientConfig.hasExistingConfig
      ? clientConfig.hasExistingConfig(existingConfig, options)
      : false;

    if (hasConfig) {
      console.log(
        `Glean MCP configuration already exists in ${clientConfig.displayName}.`,
      );
      console.log(`Configuration file: ${configFilePath}`);
      return;
    }

    existingConfig = clientConfig.updateConfig(
      existingConfig,
      newConfig,
      options,
    );

    fs.writeFileSync(configFilePath, JSON.stringify(existingConfig, null, 2));
    console.log(`Updated configuration file at: ${configFilePath}`);
  } else {
    const configDir = path.dirname(configFilePath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configFilePath, JSON.stringify(newConfig, null, 2));
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
      process.env.GLEAN_BASE_URL,
  );

  const hasEnvParam = Boolean(env);

  const hasAnyInstance = Boolean(hasDeployment || hasEnvironmentInstance);
  const hasAnyToken = Boolean(hasToken || hasEnvironmentToken);

  if (hasAnyToken && !hasAnyInstance) {
    console.error(`
"Warning: Configuring without complete credentials.
You must provide either:
  1. Both --token and --instance, or
  2. --env pointing to a .env file containing GLEAN_API_TOKEN and GLEAN_INSTANCE

Continuing with configuration, but you will need to set credentials manually later."
`);
    return true;
  }

  if (instance && url) {
    // --url is unlisted.  It's only for dev so you can specify a local server.
    console.error(
      'Error: Specify your Glean instance with either --url or --instance but not both.',
    );
    console.error('Run with --help for usage information');
    return false;
  }

  if (!hasAnyToken && !hasAnyInstance && !hasEnvParam) {
    console.error('Error: You must provide either:');
    console.error('  1. Both --token and --instance for authentication, or');
    console.error(
      '  2. --env pointing to a .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN',
    );
    console.error('Run with --help for usage information');
    return false;
  }

  return true;
}
