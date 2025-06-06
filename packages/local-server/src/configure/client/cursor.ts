/**
 * Cursor MCP Client Implementation
 *
 * https://docs.cursor.com/context/model-context-protocol
 */

import { MCPConfigPath, createBaseClient } from '../index.js';

export const cursorConfigPath: MCPConfigPath = {
  configDir: '.cursor',
  configFileName: 'mcp.json',
};

/**
 * Cursor client configuration
 */
const cursorClient = createBaseClient('Cursor', cursorConfigPath, [
  'Restart Cursor',
  'Agent will now have access to Glean search and chat tools',
  "You'll be asked for approval when Agent uses these tools",
]);

export default cursorClient;
