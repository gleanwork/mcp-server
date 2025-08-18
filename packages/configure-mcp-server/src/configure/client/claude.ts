/**
 * Claude Desktop MCP Client Implementation
 *
 * https://modelcontextprotocol.io/quickstart/user
 */

import path from 'path';
import { MCPConfigPath, createBaseClient } from './index.js';

export const claudeConfigPath: MCPConfigPath = {
  configDir: 'Claude',
  configFileName: 'claude_desktop_config.json',
};

function claudePathResolver(homedir: string) {
  let baseDir: string;

  if (process.env.GLEAN_MCP_CONFIG_DIR) {
    baseDir = process.env.GLEAN_MCP_CONFIG_DIR;
  } else if (process.platform === 'darwin') {
    baseDir = path.join(homedir, 'Library', 'Application Support');
  } else if (process.platform === 'win32') {
    baseDir = process.env.APPDATA || '';
  } else {
    throw new Error('Unsupported platform for Claude Desktop');
  }

  return path.join(
    baseDir,
    claudeConfigPath.configDir,
    claudeConfigPath.configFileName,
  );
}

/**
 * Claude Desktop client configuration
 */
const claudeClient = createBaseClient(
  'Claude Desktop',
  claudeConfigPath,
  [
    'Restart Claude Desktop',
    'You should see a hammer icon in the input box, indicating MCP tools are available',
    'Click the hammer to see available tools',
  ],
  claudePathResolver,
);

export default claudeClient;
