/**
 * Client module for MCP Clients
 *
 * Common interfaces and types for MCP client implementations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ConfigureOptions } from '../index.js';

export interface MCPConfigPath {
  configDir: string;
  configFileName: string;
}

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  type?: string;
  command: string;
  args: Array<string>;
  env: Record<string, string>;
}

/**
 * Standard MCP configuration format (Claude, Cursor, Windsurf)
 */
export interface StandardMCPConfig {
  mcpServers: {
    glean: MCPServerConfig;
    [key: string]: MCPServerConfig;
  };
}

/**
 * VS Code global configuration format
 */
export interface VSCodeGlobalConfig {
  mcp: {
    servers: {
      glean: MCPServerConfig;
      [key: string]: MCPServerConfig;
    };
  };
  [key: string]: unknown;
}

/**
 * VS Code workspace configuration format
 */
export interface VSCodeWorkspaceConfig {
  servers: {
    glean: MCPServerConfig;
    [key: string]: MCPServerConfig;
  };
  [key: string]: unknown;
}

/**
 * Union of all possible MCP configuration formats
 */
export type MCPConfig =
  | StandardMCPConfig
  | VSCodeGlobalConfig
  | VSCodeWorkspaceConfig;

/**
 * Generic config file contents that might contain MCP configuration
 * Represents the parsed contents of client config files like VS Code settings.json
 */
export type ConfigFileContents = Record<string, unknown> & Partial<MCPConfig>;

/**
 * Interface for MCP client configuration details
 */
export interface MCPClientConfig {
  /** Display name for the client */
  displayName: string;

  /**
   * Path to the config file, supports OS-specific paths and client-specific options.
   * If GLEAN_MCP_CONFIG_DIR environment variable is set, it will override the default path.
   */
  configFilePath: (homedir: string, options?: ConfigureOptions) => string;

  /** Function to generate the config JSON for this client */
  configTemplate: (
    subdomainOrUrl?: string,
    apiToken?: string,
    options?: ConfigureOptions,
  ) => MCPConfig;

  /** Instructions displayed after successful configuration */
  successMessage: (configPath: string, options?: ConfigureOptions) => string;

  /**
   * Check if configuration exists in the existing config object
   * @param existingConfig Existing configuration object from the config file
   * @param options Additional options that may affect detection logic
   * @returns boolean indicating if configuration exists
   */
  hasExistingConfig: (
    existingConfig: ConfigFileContents,
    options?: ConfigureOptions,
  ) => boolean;

  /**
   * Update existing configuration with new config
   * @param existingConfig Existing configuration object to update
   * @param newConfig New configuration to merge with existing
   * @param options Additional options that may affect merging logic
   * @returns Updated configuration object
   */
  updateConfig: (
    existingConfig: ConfigFileContents,
    newConfig: MCPConfig,
    options?: ConfigureOptions,
  ) => ConfigFileContents;
}

/**
 * Creates a standard MCP server configuration template
 */
export function createConfigTemplate(
  instanceOrUrl = '<glean instance name>',
  apiToken?: string,
): StandardMCPConfig {
  const env: Record<string, string> = {};

  // If it looks like a URL, use GLEAN_BASE_URL
  if (
    instanceOrUrl.startsWith('http://') ||
    instanceOrUrl.startsWith('https://')
  ) {
    const baseUrl = instanceOrUrl.endsWith('/rest/api/v1')
      ? instanceOrUrl
      : `${instanceOrUrl}/rest/api/v1`;
    env.GLEAN_BASE_URL = baseUrl;
  } else {
    env.GLEAN_INSTANCE = instanceOrUrl;
  }

  // Only include GLEAN_API_TOKEN if a token is provided
  if (apiToken) {
    env.GLEAN_API_TOKEN = apiToken;
  }

  return {
    mcpServers: {
      glean: {
        command: 'npx',
        args: ['-y', '@gleanwork/local-mcp-server'],
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
- You may need to set your Glean instance and API token if they weren't provided during configuration
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

    hasExistingConfig: (existingConfig: ConfigFileContents) => {
      const standardConfig = existingConfig as StandardMCPConfig;
      return (
        standardConfig.mcpServers?.glean?.command === 'npx' &&
        standardConfig.mcpServers?.glean?.args?.includes(
          '@gleanwork/local-mcp-server',
        )
      );
    },

    updateConfig: (
      existingConfig: ConfigFileContents,
      newConfig: MCPConfig,
    ) => {
      const standardNewConfig = newConfig as StandardMCPConfig;
      const result = { ...existingConfig } as ConfigFileContents &
        StandardMCPConfig;
      result.mcpServers = result.mcpServers || {};
      result.mcpServers.glean = standardNewConfig.mcpServers.glean;
      return result;
    },
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
  const clientDir = __dirname;

  try {
    const files = fs.readdirSync(clientDir);

    const clientFiles = files.filter(
      (file) => file.endsWith('.js') && file !== 'index.js',
    );

    for (const file of clientFiles) {
      const clientName = path.basename(file, '.js');

      try {
        const clientModule = await import(`./${clientName}.js`);

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
