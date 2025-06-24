/**
 * Claude Code MCP Client Implementation
 *
 * Similar to Claude Desktop but uses a different config path
 */

import path from 'path';
import { MCPConfigPath, createBaseClient } from './index.js';

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

const claudeCodeClient = createBaseClient(
  'Claude Code',
  claudeCodeConfigPath,
  [
    'Run `claude mcp list` and verify the server is listed',
  ],
  claudeCodePathResolver,
);

export default claudeCodeClient;
