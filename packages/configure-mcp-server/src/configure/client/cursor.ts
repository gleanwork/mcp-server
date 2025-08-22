/**
 * Cursor MCP Client Implementation
 *
 * https://docs.cursor.com/context/model-context-protocol
 */

import { createBaseClient } from './index.js';
import { CLIENT } from '@gleanwork/mcp-config-schema';

const cursorClient = createBaseClient(CLIENT.CURSOR, [
  'Restart Cursor',
  'Agent will now have access to Glean tools',
  "You'll be asked for approval when Agent uses these tools",
]);

export default cursorClient;
