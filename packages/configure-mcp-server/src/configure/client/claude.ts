/**
 * Claude Desktop MCP Client Implementation
 *
 * https://modelcontextprotocol.io/quickstart/user
 */

import { createBaseClient } from './index.js';
import { CLIENT } from '@gleanwork/mcp-config-schema';

const claudeClient = createBaseClient(CLIENT.CLAUDE_DESKTOP, [
  'Restart Claude Desktop',
  'MCP tools will be available in your conversations',
  'The model will have access to Glean search and other configured tools',
]);

export default claudeClient;
