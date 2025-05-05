/**
 * Client module for MCP Clients
 *
 * Common interfaces and types for MCP client implementations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { VERSION } from '../common/version.js';

export { VERSION };

export interface MCPConfigPath {
  configDir: string;
  configFileName: string;
}

/**
 * Interface for MCP client configuration details
 */
export interface MCPClientConfig {
  /** Display name for the client */
  displayName: string;

  /**
   * Path to the config file, supports OS-specific paths.
   * If GLEAN_MCP_CONFIG_DIR environment variable is set, it will override the default path.
   */
  configFilePath: (homedir: string) => string;

  /** Function to generate the config JSON for this client */
  configTemplate: (subdomainOrUrl?: string, apiToken?: string) => any;

  /** Instructions displayed after successful configuration */
  successMessage: (configPath: string) => string;
}

/**
 * Creates a standard MCP server configuration template
 */
export function createConfigTemplate(
  subdomainOrUrl = '<glean instance subdomain>',
  apiToken?: string,
) {
  const env: Record<string, string> = {};

  // If it looks like a URL, use GLEAN_BASE_URL
  if (
    subdomainOrUrl.startsWith('http://') ||
    subdomainOrUrl.startsWith('https://')
  ) {
    const baseUrl = subdomainOrUrl.endsWith('/rest/api/v1')
      ? subdomainOrUrl
      : `${subdomainOrUrl}/rest/api/v1`;
    env.GLEAN_BASE_URL = baseUrl;
  } else {
    env.GLEAN_SUBDOMAIN = subdomainOrUrl;
  }

  // Only include GLEAN_API_TOKEN if a token is provided
  if (apiToken) {
    env.GLEAN_API_TOKEN = apiToken;
  }

  return {
    mcpServers: {
      glean: {
        command: 'npx',
        args: ['-y', '@gleanwork/mcp-server'],
        env,
      },
    },
  };
}

/**
 * Creates a standard file path resolver that respects GLEAN_MCP_CONFIG_DIR
 */
export function createStandardPathResolver(configPath: MCPConfigPath) {
  return (homedir: string) => {
    const baseDir = process.env.GLEAN_MCP_CONFIG_DIR || homedir;
    return path.join(baseDir, configPath.configDir, configPath.configFileName);
  };
}

/**
 * Creates a success message with standardized format
 */
export function createSuccessMessage(
  clientName: string,
  configPath: string,
  instructions: string[],
) {
  return `
${clientName} MCP configuration has been configured to: ${configPath}

To use it:
${instructions.map((instr, i) => `${i + 1}. ${instr}`).join('\n')}

Notes:
- You may need to set your Glean subdomain and API token if they weren't provided during configuration
- Configuration is at: ${configPath}
`;
}

/**
 * Creates a base client configuration that can be extended
 */
export function createBaseClient(
  displayName: string,
  configPath: MCPConfigPath,
  instructions: string[],
  pathResolverOverride?: (homedir: string) => string,
): MCPClientConfig {
  return {
    displayName,

    configFilePath:
      pathResolverOverride || createStandardPathResolver(configPath),

    configTemplate: createConfigTemplate,

    successMessage: (configPath) =>
      createSuccessMessage(displayName, configPath, instructions),
  };
}

/**
 * Map of all available MCP clients
 * Will be populated dynamically by scanning the client directory
 */
export const availableClients: Record<string, MCPClientConfig> = {};

/**
 * Dynamically load all client modules in the client directory
 */
async function loadClientModules() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const clientDir = path.join(__dirname, 'client');

  try {
    const files = fs.readdirSync(clientDir);

    const clientFiles = files.filter(
      (file) => file.endsWith('.js') && file !== 'index.js',
    );

    for (const file of clientFiles) {
      const clientName = path.basename(file, '.js');

      try {
        const clientModule = await import(`./client/${clientName}.js`);

        if (clientModule.default) {
          availableClients[clientName] = clientModule.default;
        }
      } catch (error) {
        console.error(`Error loading client module ${clientName}: ${error}`);
      }
    }
  } catch (error) {
    console.error(`Error loading client modules: ${error}`);
  }
}

/**
 * Ensures all client modules are loaded before using them
 * Returns a promise that resolves when loading is complete
 */
let clientsLoaded = false;
let loadPromise: Promise<void> | null = null;

export async function ensureClientsLoaded(): Promise<void> {
  if (clientsLoaded) {
    return Promise.resolve();
  }

  if (!loadPromise) {
    loadPromise = loadClientModules().then(() => {
      clientsLoaded = true;
    });
  }

  return loadPromise;
}

void ensureClientsLoaded().catch((error) => {
  console.error('Failed to load client modules:', error);
});
