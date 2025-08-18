import path from 'path';
import {
  MCPConfigPath,
  MCPClientConfig,
  GooseConfig,
  GooseExtensionConfig,
  createBaseClient,
  buildMcpServerName,
  MCPServersConfig,
} from './index.js';
import type { ConfigureOptions } from '../index.js';

export const gooseConfigPath: MCPConfigPath = {
  configDir: path.join('.config', 'goose'),
  configFileName: 'config.yaml',
};

function goosePathResolver(homedir: string) {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || homedir, 'goose', 'config.yaml');
  }

  const baseDir = process.env.GLEAN_MCP_CONFIG_DIR || homedir;
  return path.join(
    baseDir,
    gooseConfigPath.configDir,
    gooseConfigPath.configFileName,
  );
}

function toGooseConfig(servers: MCPServersConfig): GooseConfig {
  const extensions: Record<string, GooseExtensionConfig> = {};
  for (const [name, server] of Object.entries(servers)) {
    if (!server) continue;

    // Goose only supports stdio configs (with command and args)
    // This shouldn't happen in practice since Goose uses createMcpServersConfig
    // which always generates stdio configs, but check defensively
    if (!server.command || !server.args) {
      console.warn(
        `Skipping server ${name}: Goose requires stdio configuration`,
      );
      continue;
    }

    extensions[name] = {
      args: server.args,
      bundled: null,
      cmd: server.command,
      description: '',
      enabled: true,
      env_keys: [],
      envs: server.env || {},
      name: 'glean',
      timeout: 300,
      type: server.type ?? 'stdio',
    };
  }
  return { extensions };
}

function updateConfig(
  existingConfig: Record<string, any>,
  newConfig: Record<string, any>,
  options: ConfigureOptions,
): Record<string, any> {
  const result = { ...existingConfig };
  result.extensions = result.extensions || {};
  const mcpServerName = buildMcpServerName(options);
  result.extensions[mcpServerName] = newConfig.extensions[mcpServerName];
  return result;
}

const gooseClient: MCPClientConfig = createBaseClient(
  'Goose',
  gooseConfigPath,
  ['Restart Goose'],
  goosePathResolver,
  toGooseConfig,
);

gooseClient.updateConfig = updateConfig;

export default gooseClient;
