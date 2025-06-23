/**
 * Claude Code MCP Client Implementation
 *
 * Similar to Claude Desktop but uses a different config path
 */

import path from 'path';
import {
  MCPConfigPath,
  createBaseClient,
  updateMcpServersConfig,
  MCPServersConfig,
  ConfigFileContents,
  MCPConfig,
} from './index.js';

export const claudeCodeConfigPath: MCPConfigPath = {
  configDir: '',
  configFileName: '.claude.json',
};

function claudeCodePathResolver(homedir: string) {
  let baseDir: string;

  if (process.env.GLEAN_MCP_CONFIG_DIR) {
    baseDir = process.env.GLEAN_MCP_CONFIG_DIR;
  } else if (process.platform === 'darwin') {
    baseDir = homedir;
  } else {
    throw new Error('Unsupported platform for Claude Code');
  }

  return path.join(baseDir, claudeCodeConfigPath.configFileName);
}

function mcpServersHook(servers: MCPServersConfig): MCPConfig {
  return {
    '.mcpServers': servers,
  } as unknown as MCPConfig;
}

const claudeCodeClient = createBaseClient(
  'Claude Code',
  claudeCodeConfigPath,
  [
    'Restart Claude Code',
    'Run `claude mcp list` and verify the server is listed',
  ],
  claudeCodePathResolver,
  mcpServersHook,
);

claudeCodeClient.updateConfig = (
  existingConfig: ConfigFileContents,
  newConfig: MCPConfig,
) => {
  const result = { ...existingConfig } as ConfigFileContents & {
    '.mcpServers': MCPServersConfig;
  };
  const newServers = (newConfig as any)['.mcpServers'];
  result['.mcpServers'] = updateMcpServersConfig(result['.mcpServers'] || {}, newServers);
  return result;
};

export default claudeCodeClient;
