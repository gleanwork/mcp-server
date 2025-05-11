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
import { availableClients, ensureClientsLoaded } from './configure/index.js';
import { VERSION } from './common/version.js';
import { ensureAuthTokenPresence } from './auth/auth.js';
import { trace } from './log/logger.js';

/**
 * Configure options interface
 */
interface ConfigureOptions {
  token?: string;
  domain?: string;
  url?: string;
  envPath?: string;
}

/**
 * Load environment variables from .env file or existing environment
 */
function loadCredentials(options: ConfigureOptions): {
  subdomainOrUrl?: string;
  apiToken?: string;
} {
  const result: { subdomainOrUrl?: string; apiToken?: string } = {
    subdomainOrUrl: undefined,
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

        result.subdomainOrUrl =
          envConfig.parsed?.GLEAN_SUBDOMAIN || envConfig.parsed?.GLEAN_BASE_URL;
        result.apiToken = envConfig.parsed?.GLEAN_API_TOKEN;
      }
    } catch (error: any) {
      console.error(`Error loading .env file: ${error.message}`);
    }
  }

  if (options.domain) {
    result.subdomainOrUrl = options.domain;
  }

  if (options.url) {
    result.subdomainOrUrl = options.url;
  }

  if (options.token) {
    result.apiToken = options.token;
  }

  if (!result.subdomainOrUrl) {
    result.subdomainOrUrl =
      process.env.GLEAN_SUBDOMAIN || process.env.GLEAN_BASE_URL;
  }

  if (!result.apiToken) {
    result.apiToken = process.env.GLEAN_API_TOKEN;
  }

  return result;
}

/**
 * Handles the configuration process for the specified MCP client
 *
 * @param client - The MCP client to configure for (cursor, claude, windsurf)
 * @param options - Configuration options including token, domain, url, and envPath
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

  const clientConfig = availableClients[normalizedClient];
  console.log(`Configuring Glean MCP for ${clientConfig.displayName}...`);

  const homedir = os.homedir();
  const configFilePath = clientConfig.configFilePath(homedir);

  try {
    // If token is provided, use token auth
    if (options.token) {
      trace('configuring Glean token auth');
      const { subdomainOrUrl, apiToken } = loadCredentials(options);
      const newConfig = clientConfig.configTemplate(subdomainOrUrl, apiToken);
      writeConfigFile(configFilePath, newConfig, clientConfig);
      return;
    }

    // Check if OAuth is enabled
    const oauthEnabled = process.env.GLEAN_OAUTH_ENABLED;
    if (!oauthEnabled) {
      throw new Error(
        'API token is required. Please provide a token with the --token option.',
      );
    }

    // For non-token auth flow (requires GLEAN_OAUTH_ENABLED)
    const { subdomainOrUrl } = loadCredentials(options);
    if (!subdomainOrUrl) {
      throw new Error('Domain/subdomain or URL is required for configuration');
    }

    // Set environment variables for OAuth flow
    if (
      subdomainOrUrl.startsWith('http://') ||
      subdomainOrUrl.startsWith('https://')
    ) {
      process.env.GLEAN_BASE_URL = subdomainOrUrl.endsWith('/rest/api/v1')
        ? subdomainOrUrl
        : `${subdomainOrUrl}/rest/api/v1`;
    } else {
      process.env.GLEAN_SUBDOMAIN = subdomainOrUrl;
    }

    const authSuccess = await ensureAuthTokenPresence();
    if (!authSuccess) {
      throw new Error('OAuth authorization failed');
    }

    const newConfig = clientConfig.configTemplate(subdomainOrUrl);
    writeConfigFile(configFilePath, newConfig, clientConfig);
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
  newConfig: any,
  clientConfig: any,
) {
  if (fs.existsSync(configFilePath)) {
    const fileContent = fs.readFileSync(configFilePath, 'utf-8');
    let existingConfig: Record<string, any>;

    try {
      existingConfig = JSON.parse(fileContent);
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
      console.log(clientConfig.successMessage(configFilePath));
      return;
    }

    if (
      existingConfig.mcpServers &&
      existingConfig.mcpServers.glean &&
      existingConfig.mcpServers.glean.command === 'npx' &&
      existingConfig.mcpServers.glean.args &&
      existingConfig.mcpServers.glean.args.includes('@gleanwork/mcp-server')
    ) {
      console.log(
        `Glean MCP configuration already exists in ${clientConfig.displayName}.`,
      );
      console.log(`Configuration file: ${configFilePath}`);
      return;
    }

    existingConfig.mcpServers = existingConfig.mcpServers || {};
    existingConfig.mcpServers.glean = newConfig.mcpServers.glean;

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

  console.log(clientConfig.successMessage(configFilePath));
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
    '  npx @gleanwork/mcp-server configure --client <client> [--token <token>] [--domain <domain>]',
  );
  console.log(
    '  npx @gleanwork/mcp-server configure --client <client> --env <path-to-env-file>',
  );

  console.log('\nExamples:');
  if (clients.length > 0) {
    const exampleClient = clients[0][0];
    console.log(
      `  npx @gleanwork/mcp-server configure --client ${exampleClient} --token your-token --domain your-domain`,
    );
    console.log(
      `  npx @gleanwork/mcp-server configure --client ${exampleClient} --env ~/.glean.env`,
    );
  }

  console.log(`\nVersion: v${VERSION}`);
}
