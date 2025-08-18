/**
 * Claude Code MCP Client Implementation
 *
 * Similar to Claude Desktop but uses a different config path
 */

import path from 'path';
import {
  MCPConfigPath,
  createBaseClient,
  MCPServersConfig,
  StandardMCPConfig,
  buildMcpServerName,
} from './index.js';
import type { ConfigureOptions } from '../index.js';

export const claudeCodeConfigPath: MCPConfigPath = {
  configDir: '',
  configFileName: '.claude.json',
};

function claudeCodePathResolver(homedir: string) {
  const baseDir = process.env.GLEAN_MCP_CONFIG_DIR || homedir;
  return path.join(baseDir, claudeCodeConfigPath.configFileName);
}

function mcpServersHook(servers: MCPServersConfig): StandardMCPConfig {
  return {
    mcpServers: servers,
  };
}

const claudeCodeClient = createBaseClient(
  'Claude Code',
  claudeCodeConfigPath,
  ['Run `claude mcp list` and verify the server is listed'],
  claudeCodePathResolver,
  mcpServersHook,
);

function createClaudeCodeMcpServersConfig(
  instanceOrUrl: string,
  apiToken?: string,
  options?: ConfigureOptions,
): MCPServersConfig {
  const env = {};

  // local set up
  if (!options?.remote) {
    const args = ['serve'];
    if (options?.agents) {
      args.push('--agents');
    }
    if (instanceOrUrl) {
      args.push('--instance', instanceOrUrl);
    }
    if (apiToken) {
      args.push('--token', apiToken);
    }

    const mcpServerName = buildMcpServerName(options || {});
    return {
      [mcpServerName]: {
        command: 'npx',
        args: ['-y', '@gleanwork/local-mcp-server', ...args],
        type: 'stdio',
        env,
      },
    };
  }

  // Remote configuration requires a full URL
  if (
    !instanceOrUrl.startsWith('http://') &&
    !instanceOrUrl.startsWith('https://')
  ) {
    throw new Error(
      'Remote configuration requires a full URL (starting with http:// or https://)',
    );
  }

  const serverUrl = instanceOrUrl;
  const mcpServerName = buildMcpServerName(options || {}, serverUrl);

  return {
    [mcpServerName]: {
      type: 'http',
      url: serverUrl,
    },
  };
}

claudeCodeClient.configTemplate = (
  subdomainOrUrl?: string,
  apiToken?: string,
  options?: ConfigureOptions,
): StandardMCPConfig => {
  const servers = createClaudeCodeMcpServersConfig(
    subdomainOrUrl || '<glean instance name or URL>',
    apiToken,
    options,
  );
  return { mcpServers: servers };
};

claudeCodeClient.successMessage = (
  configPath: string,
  options?: import('../index.js').ConfigureOptions,
) => {
  const isRemote = options?.remote;

  if (isRemote) {
    // For remote configurations, the URL has already been configured
    return `
Claude Code MCP configuration has been configured to: ${configPath}

You can verify the configuration with:
  claude mcp list

The MCP server has been configured with the provided URL.
`;
  }

  // For local configurations
  return `
Claude Code MCP configuration has been configured to: ${configPath}

To use it:
1. Run \`claude mcp list\` and verify the server is listed
`;
};

export default claudeCodeClient;
