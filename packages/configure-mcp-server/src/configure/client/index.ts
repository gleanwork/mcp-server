/**
 * Client module for MCP Clients
 *
 * Common interfaces and types for MCP client implementations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import type { ConfigureOptions } from '../index.js';
import {
  MCPConfigRegistry,
  ClientId,
  CLIENT,
  type ServerConfig,
  type McpServersConfig,
  buildMcpServerName,
  extractServerNameFromUrl,
} from '@gleanwork/mcp-config-schema';
import mcpRemotePackageJson from 'mcp-remote/package.json' with { type: 'json' };

const mcpRemoteVersion = mcpRemotePackageJson.version;

/**
 * Re-export types from the schema package for backward compatibility
 */
export type MCPServerConfig = ServerConfig;

/**
 * Extract the servers collection type from the wrapped config
 * The package's McpServersConfig is { mcpServers: ... }, but we need just the inner part
 */
export type MCPServersConfig = McpServersConfig extends { mcpServers: infer S }
  ? S
  : Record<string, ServerConfig>;

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

/**
 * Union of all possible MCP configuration formats
 */
export type MCPConfig =
  | StandardMCPConfig
  | VSCodeGlobalConfig
  | VSCodeWorkspaceConfig
  | Record<string, any>; // Goose and other YAML-based configs

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
  clientId: ClientId = CLIENT.CURSOR,
): MCPServersConfig {
  const registry = new MCPConfigRegistry();
  const builder = registry.createBuilder(clientId);

  const isRemote = options?.remote === true;

  const configOutput = builder.buildConfiguration({
    mode: isRemote ? 'remote' : 'local',
    serverUrl: isRemote ? instanceOrUrl : undefined,
    instance: !isRemote ? instanceOrUrl : undefined,
    apiToken: apiToken,
    serverName: isRemote
      ? buildMcpServerName({
          mode: 'remote',
          serverUrl: instanceOrUrl,
          agents: options?.agents,
        })
      : undefined,
    includeWrapper: false,
  });

  let parsed: any;
  try {
    parsed = JSON.parse(configOutput);
  } catch {
    try {
      parsed = yaml.parse(configOutput);
    } catch (yamlError) {
      throw new Error(`Failed to parse configuration output: ${yamlError}`);
    }
  }

  let servers: MCPServersConfig;

  if (parsed.mcpServers) {
    servers = parsed.mcpServers;
  } else if (parsed.mcp?.servers) {
    servers = parsed.mcp.servers;
  } else if (parsed.servers) {
    servers = parsed.servers;
  } else if (parsed.extensions) {
    servers = {};
    for (const [name, ext] of Object.entries(parsed.extensions) as [
      string,
      any,
    ][]) {
      servers[name] = {
        type: ext.type,
        command: ext.cmd,
        args: ext.args,
        env: ext.envs,
      };
    }
  } else if (clientId === CLIENT.GOOSE) {
    servers = {};
    for (const [name, ext] of Object.entries(parsed) as [string, any][]) {
      servers[name] = {
        type: ext.type || 'stdio',
        command: ext.cmd,
        args: ext.args,
        env: ext.envs,
      };
    }
  } else {
    servers = parsed;
  }

  if (isRemote) {
    for (const [serverName, serverConfig] of Object.entries(servers)) {
      if (
        serverConfig &&
        'command' in serverConfig &&
        serverConfig.command === 'npx' &&
        'args' in serverConfig &&
        serverConfig.args
      ) {
        serverConfig.args = serverConfig.args.map((arg: string) => {
          if (arg === 'mcp-remote' || arg.startsWith('mcp-remote@')) {
            return `mcp-remote@${mcpRemoteVersion}`;
          }
          return arg;
        });
      }
    }
  }

  return servers;
}

/**
 * Creates a universal path resolver using the package's config metadata
 */
export function createUniversalPathResolver(clientId: ClientId) {
  return (homedir: string, options?: ConfigureOptions) => {
    const registry = new MCPConfigRegistry();
    const clientInfo = registry.getConfig(clientId);
    if (!clientInfo) {
      throw new Error(`Unknown client: ${clientId}`);
    }
    const configPaths = clientInfo.configPath;

    if (process.env.GLEAN_MCP_CONFIG_DIR) {
      const platform = process.platform as 'darwin' | 'linux' | 'win32';
      const pathTemplate = configPaths[platform];

      if (!pathTemplate) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Extract the path after $HOME or %USERPROFILE%
      const relativePath = pathTemplate
        .replace(/^\$HOME[\\/]?/, '')
        .replace(/^%USERPROFILE%[\\/]?/, '');
      return path.join(process.env.GLEAN_MCP_CONFIG_DIR, relativePath);
    }

    const platform = process.platform as 'darwin' | 'linux' | 'win32';
    const pathTemplate = configPaths[platform];

    if (!pathTemplate) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    return pathTemplate
      .replace('$HOME', homedir)
      .replace('%USERPROFILE%', homedir)
      .replace(/\\/g, path.sep);
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
  clientId: ClientId,
  instructions: string[],
  pathResolverOverride?: (
    homedir: string,
    options?: ConfigureOptions,
  ) => string,
  mcpServersHook: (
    servers: MCPServersConfig,
    options?: ConfigureOptions,
  ) => MCPConfig = (servers) => ({ mcpServers: servers }),
): MCPClientConfig {
  const registry = new MCPConfigRegistry();
  const clientInfo = registry.getConfig(clientId);
  if (!clientInfo) {
    throw new Error(`Unknown client: ${clientId}`);
  }
  const displayName = clientInfo.displayName;

  return {
    displayName,

    configFilePath:
      pathResolverOverride || createUniversalPathResolver(clientId),

    configTemplate: (
      instanceOrUrl?: string,
      apiToken?: string,
      options?: ConfigureOptions,
    ) => {
      const servers = createMcpServersConfig(
        instanceOrUrl,
        apiToken,
        options,
        clientId,
      );
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
