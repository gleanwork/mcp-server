/**
 * Windsurf MCP Client Implementation
 *
 * https://docs.windsurf.com/windsurf/mcp
 */

import { createBaseClient } from './index.js';
import { CLIENT } from '@gleanwork/mcp-config-schema';

const windsurfClient = createBaseClient(CLIENT.WINDSURF, [
  'Open Windsurf Settings > Advanced Settings',
  'Scroll to the Cascade section',
  'Press the refresh button after configuration',
  'You should now see Glean in your available MCP servers',
]);

export default windsurfClient;
