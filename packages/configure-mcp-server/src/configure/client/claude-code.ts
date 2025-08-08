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
} from './index.js';

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

export default claudeCodeClient;
