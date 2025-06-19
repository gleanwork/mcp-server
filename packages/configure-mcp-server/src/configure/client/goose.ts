import path from 'path';
import { MCPConfigPath, MCPClientConfig, createSuccessMessage, GooseConfig } from './index.js';
import type { ConfigureOptions } from '../index.js';
import { isOAuthEnabled } from '../../common/env.js';
import { RemoteMcpTargets } from '@gleanwork/mcp-server-utils/util';

export const gooseConfigPath: MCPConfigPath = {
  configDir: path.join('.config', 'goose'),
  configFileName: 'config.yaml',
};

function buildMcpUrl(instanceOrUrl: string, target: RemoteMcpTargets) {
  const baseUrl =
    instanceOrUrl.startsWith('http://') || instanceOrUrl.startsWith('https://')
      ? new URL(instanceOrUrl).origin + '/mcp'
      : `https://${instanceOrUrl}-be.glean.com/mcp`;

  return `${baseUrl}/${target}/sse`;
}

function createConfigTemplate(
  instanceOrUrl = '<glean instance name>',
  apiToken?: string,
  options?: ConfigureOptions,
): GooseConfig {
  const envs: Record<string, string> = {};
  const isLocal = !options?.remote;

  if (isLocal) {
    if (instanceOrUrl.startsWith('http://') || instanceOrUrl.startsWith('https://')) {
      const baseUrl = instanceOrUrl.endsWith('/rest/api/v1')
        ? instanceOrUrl
        : `${instanceOrUrl}/rest/api/v1`;
      envs.GLEAN_BASE_URL = baseUrl;
    } else {
      envs.GLEAN_INSTANCE = instanceOrUrl;
    }
  }

  if (apiToken) {
    envs.GLEAN_API_TOKEN = apiToken;
  }

  let args: string[];
  if (isLocal) {
    args = ['-y', '@gleanwork/local-mcp-server'];
  } else {
    const usingOAuth = apiToken === undefined && isOAuthEnabled();
    const serverUrl = buildMcpUrl(instanceOrUrl, options?.agents ? 'agents' : 'default');
    args = ['-y', '@gleanwork/connect-mcp-server', serverUrl];
    if (usingOAuth) {
      args.push('--header', 'X-Glean-Auth-Type:OAUTH');
    }
  }

  return {
    extensions: {
      glean: {
        args,
        bundled: null,
        cmd: 'npx',
        description: '',
        enabled: true,
        env_keys: [],
        envs,
        name: 'glean',
        timeout: 300,
        type: 'stdio',
      },
    },
  };
}

function updateConfig(
  existingConfig: Record<string, any>,
  newConfig: Record<string, any>,
): Record<string, any> {
  const result = { ...existingConfig };
  result.extensions = result.extensions || {};
  result.extensions.glean = newConfig.extensions.glean;
  return result;
}

const gooseClient: MCPClientConfig = {
  displayName: 'Goose',
  configFilePath(homedir: string) {
    if (process.platform === 'win32') {
      return path.join(process.env.APPDATA || homedir, 'goose', 'config.yaml');
    }
    return path.join(homedir, gooseConfigPath.configDir, gooseConfigPath.configFileName);
  },
  configTemplate: createConfigTemplate,
  successMessage: (configPath: string) =>
    createSuccessMessage('Goose', configPath, ['Restart Goose']),
  updateConfig,
};

export default gooseClient;
