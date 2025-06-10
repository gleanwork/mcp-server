/**
 * Windsurf MCP Client Implementation
 *
 * https://docs.windsurf.com/windsurf/mcp
 */

import path from 'path';
import { MCPConfigPath, createBaseClient } from './index.js';

export const windsurfConfigPath: MCPConfigPath = {
  configDir: path.join('.codeium', 'windsurf'),
  configFileName: 'mcp_config.json',
};

/**
 * Windsurf client configuration
 */
const windsurfClient = createBaseClient('Windsurf', windsurfConfigPath, [
  'Open Windsurf Settings > Advanced Settings',
  'Scroll to the Cascade section',
  'Press the refresh button after configuration',
  'You should now see Glean in your available MCP servers',
]);

export default windsurfClient;
