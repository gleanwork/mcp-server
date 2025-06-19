/**
 * Client module for MCP Clients
 *
 * Common interfaces and types for MCP client implementations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ConfigureOptions } from '../index.js';
import { RemoteMcpTargets } from '@gleanwork/mcp-server-utils/util';
import { isOAuthEnabled } from '../../common/env.js';

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

export interface MCPServersConfig {
  glean?: MCPServerConfig;
  glean_agents?: MCPServerConfig;
  glean_local?: MCPServerConfig;
  [key: string]: MCPServerConfig | undefined;
}

/**
 * Standard MCP configuration format (Claude, Cursor, Windsurf)
 */
export interface StandardMCPConfig {
  mcpServers: MCPServersConfig;
}

/**
 * VS Code global configuration format
 */
export interface VSCodeGlobalConfig {
  mcp: {
    servers: MCPServersConfig;
  };
  [key: string]: unknown;
}

/**
 * VS Code workspace configuration format
 */
export interface VSCodeWorkspaceConfig {
  servers: MCPServersConfig;
  [key: string]: unknown;
}

export interface GooseExtensionConfig {
  args: string[];
  bundled: null | string;
  cmd: string;
  description: string;
  enabled: boolean;
  env_keys: string[];
  envs: Record<string, string>;
  name: string;
  timeout: number;
  type: string;
}

export interface GooseConfig {
  extensions: {
    glean: GooseExtensionConfig;
    [key: string]: GooseExtensionConfig;
  };
}

/**
 * Union of all possible MCP configuration formats
 */
export type MCPConfig =
  | StandardMCPConfig
  | VSCodeGlobalConfig
  | VSCodeWorkspaceConfig
  | GooseConfig;

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
  options?: ConfigureOptions,
): StandardMCPConfig {
  return {
    mcpServers: createMcpServersConfig(instanceOrUrl, apiToken, options),
  };
}

export function createMcpServersConfig(
  instanceOrUrl = '<glean instance name>',
  apiToken?: string,
  options?: ConfigureOptions,
): MCPServersConfig {
  const env: Record<string, string> = {};
  const isLocal = !options?.remote;

  // For local servers, set the appropriate base URL or instance
  if (isLocal) {
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
  }

  // Only include GLEAN_API_TOKEN if a token is provided
  if (apiToken) {
    env.GLEAN_API_TOKEN = apiToken;
  }

  if (isLocal) {
    return {
      glean_local: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@gleanwork/local-mcp-server'],
        env,
      },
    };
  }

  const usingOAuth = apiToken === undefined && isOAuthEnabled();

  // remote set up, either default or agents
  const serverUrl = buildMcpUrl(
    instanceOrUrl,
    options?.agents ? 'agents' : 'default',
  );
  const mcpServerName = options?.agents ? 'glean_agents' : 'glean';
  const args = ['-y', '@gleanwork/connect-mcp-server', serverUrl];
  if (usingOAuth) {
    args.push('--header', 'X-Glean-Auth-Type:OAUTH');
  }

  return {
    [mcpServerName]: {
      command: 'npx',
      args,
      type: 'stdio',
      env,
    },
  };
}

function buildMcpUrl(instanceOrUrl: string, target: RemoteMcpTargets) {
  const baseUrl =
    instanceOrUrl.startsWith('http://') || instanceOrUrl.startsWith('https://')
      ? // url: strip path and add /mcp
        new URL(instanceOrUrl).origin + '/mcp'
      : // instance
        `https://${instanceOrUrl}-be.glean.com/mcp`;

  return `${baseUrl}/${target}/sse`;
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

    updateConfig: (
      existingConfig: ConfigFileContents,
      newConfig: MCPConfig,
    ) => {
      const standardNewConfig = newConfig as StandardMCPConfig;
      const result = { ...existingConfig } as ConfigFileContents &
        StandardMCPConfig;

      result.mcpServers = updateMcpServersConfig(result.mcpServers || {}, standardNewConfig.mcpServers)
      return result;
    },
  };
}

export function updateMcpServersConfig(
  existingConfig: MCPServersConfig,
  newConfig: MCPServersConfig,
) {
  const result = { ...existingConfig };
  for (const serverName of ['glean', 'glean_local', 'glean_agents']) {
    if (serverName in newConfig) {
      result[serverName] = newConfig[serverName];
    }
  }
  return result;
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

    const isJsOrTs = (file: string) =>
      file.endsWith('.js') || file.endsWith('.ts');
    const clientFiles = files.filter(
      (file) =>
        isJsOrTs(file) && file !== 'index.js' && !file.endsWith('.d.ts'),
    );

    for (const file of clientFiles) {
      const clientName = path.basename(path.basename(file, '.js'), '.ts');

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
