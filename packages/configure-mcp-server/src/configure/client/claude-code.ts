/**
 * Claude Code MCP Client Implementation
 *
 * Similar to Claude Desktop but uses a different config path
 */

import { createBaseClient } from './index.js';
import { CLIENT } from '@gleanwork/mcp-config-schema';

const claudeCodeClient = createBaseClient(CLIENT.CLAUDE_CODE, [
  'Run `claude mcp list` and verify the server is listed',
]);

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
