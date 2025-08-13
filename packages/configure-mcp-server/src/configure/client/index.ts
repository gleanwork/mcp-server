/**
 * Client module for MCP Clients
 *
 * Common interfaces and types for MCP client implementations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ConfigureOptions } from '../index.js';
import mcpRemotePackageJson from 'mcp-remote/package.json' with { type: 'json' };

const mcpRemoteVersion = mcpRemotePackageJson.version;

export interface MCPConfigPath {
  configDir: string;
  configFileName: string;
}

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  type?: string;
  command?: string;
  args?: Array<string>;
  env?: Record<string, string>;
  url?: string;
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
    glean?: GooseExtensionConfig;
    glean_local?: GooseExtensionConfig;
    glean_agents?: GooseExtensionConfig;
    [key: string]: GooseExtensionConfig | undefined;
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
    options: ConfigureOptions,
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
  instanceOrUrl = '<glean instance name or URL>',
  apiToken?: string,
  options?: ConfigureOptions,
): MCPServersConfig {
  const env: Record<string, string> = {};
  const isLocal = !options?.remote;

  // For local servers, set the appropriate instance or URL
  if (isLocal) {
    // If it looks like a URL, use it directly
    if (
      instanceOrUrl.startsWith('http://') ||
      instanceOrUrl.startsWith('https://')
    ) {
      env.GLEAN_BASE_URL = instanceOrUrl;
    } else {
      env.GLEAN_INSTANCE = instanceOrUrl;
    }
  }

  // For local servers include the API token in env
  if (isLocal && apiToken) {
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

  // remote set up
  // For remote, we require a full URL to be provided
  if (
    !instanceOrUrl.startsWith('http://') &&
    !instanceOrUrl.startsWith('https://')
  ) {
    throw new Error(
      'Remote configuration requires a full URL (starting with http:// or https://)',
    );
  }

  const serverUrl = instanceOrUrl;
  const mcpServerName = buildMcpServerName(options, serverUrl);

  const args = ['-y', `mcp-remote@${mcpRemoteVersion}`, serverUrl];

  return {
    [mcpServerName]: {
      command: 'npx',
      args,
      type: 'stdio',
      env,
    },
  };
}

/**
 * Extracts the server name from a full MCP URL
 * e.g., https://my-be.glean.com/mcp/analytics -> analytics
 */
export function extractServerNameFromUrl(url: string): string | null {
  const match = url.match(/\/mcp\/([^/]+)(?:\/|$)/);
  return match ? match[1] : null;
}

export function buildMcpServerName(
  options: ConfigureOptions,
  fullUrl?: string,
) {
  const isLocal = !options?.remote;
  if (isLocal) {
    return 'glean_local';
  }

  // If we have a full URL, extract the server name from it
  if (fullUrl) {
    const serverName = extractServerNameFromUrl(fullUrl);
    // Special case: "default" server should just be "glean"
    if (serverName === 'default') {
      return 'glean';
    }
    return serverName ? `glean_${serverName}` : 'glean';
  }

  return options?.agents ? 'glean_agents' : 'glean';
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
  mcpServersHook: (
    servers: MCPServersConfig,
    options?: ConfigureOptions,
  ) => MCPConfig = (servers) => ({ mcpServers: servers }),
): MCPClientConfig {
  return {
    displayName,

    configFilePath:
      pathResolverOverride || createStandardPathResolver(configPath),

    configTemplate: (
      instanceOrUrl?: string,
      apiToken?: string,
      options?: ConfigureOptions,
    ) => {
      const servers = createMcpServersConfig(instanceOrUrl, apiToken, options);
      return mcpServersHook(servers, options);
    },

    successMessage: (configPath) =>
      createSuccessMessage(displayName, configPath, instructions),

    updateConfig: (
      existingConfig: ConfigFileContents,
      newConfig: MCPConfig,
    ) => {
      const standardNewConfig = newConfig as StandardMCPConfig;
      const result = { ...existingConfig } as ConfigFileContents &
        StandardMCPConfig;

      result.mcpServers = updateMcpServersConfig(
        result.mcpServers || {},
        standardNewConfig.mcpServers,
      );
      return result;
    },
  };
}

export function updateMcpServersConfig(
  existingConfig: MCPServersConfig,
  newConfig: MCPServersConfig,
) {
  const result = { ...existingConfig };

  // Update any Glean-related servers (glean, glean_local, glean_agents, glean_*, etc.)
  for (const serverName in newConfig) {
    if (serverName === 'glean' || serverName.startsWith('glean_')) {
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
