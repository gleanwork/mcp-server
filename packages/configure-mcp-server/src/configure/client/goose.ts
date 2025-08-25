import { createBaseClient } from './index.js';
import type { ConfigureOptions } from '../index.js';
import {
  CLIENT,
  MCPConfigRegistry,
  buildMcpServerName,
} from '@gleanwork/mcp-config-schema';
import yaml from 'yaml';
import mcpRemotePackageJson from 'mcp-remote/package.json' with { type: 'json' };

const mcpRemoteVersion = mcpRemotePackageJson.version;

const gooseClient = createBaseClient(CLIENT.GOOSE, ['Restart Goose']);

// Override configTemplate to use the package's YAML output directly
gooseClient.configTemplate = (
  instanceOrUrl?: string,
  apiToken?: string,
  options?: ConfigureOptions,
) => {
  const registry = new MCPConfigRegistry();
  const builder = registry.createBuilder(CLIENT.GOOSE);
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

  // Parse the YAML to pin mcp-remote version if needed
  const parsed = yaml.parse(configOutput);

  if (isRemote) {
    for (const [, serverConfig] of Object.entries(parsed)) {
      if (
        serverConfig &&
        typeof serverConfig === 'object' &&
        'cmd' in serverConfig
      ) {
        const config = serverConfig as any;
        if (config.cmd === 'npx' && config.args) {
          config.args = config.args.map((arg: string) => {
            if (arg === 'mcp-remote' || arg.startsWith('mcp-remote@')) {
              return `mcp-remote@${mcpRemoteVersion}`;
            }
            return arg;
          });
        }
      }
    }
  }

  return parsed;
};

// Custom updateConfig for Goose's flat structure
gooseClient.updateConfig = (
  existingConfig: Record<string, any>,
  newConfig: Record<string, any>,
): Record<string, any> => {
  const result = { ...existingConfig };

  // For Goose, servers are at the top level
  for (const serverName in newConfig) {
    if (serverName === 'glean' || serverName.startsWith('glean_')) {
      result[serverName] = newConfig[serverName];
    }
  }

  return result;
};

export default gooseClient;
