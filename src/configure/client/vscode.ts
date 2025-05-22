/**
 * VS Code MCP Client Implementation
 *
 * https://code.visualstudio.com/docs/copilot/chat/mcp-servers
 */

import path from 'path';
import { MCPConfigPath, createBaseClient } from '../index.js';

// VS Code user settings location varies by platform
function getVSCodeUserSettingsPath(homedir: string): string {
  // Windows: %APPDATA%\Code\User\settings.json
  // macOS: ~/Library/Application Support/Code/User/settings.json
  // Linux: ~/.config/Code/User/settings.json
  const platform = process.platform;

  if (platform === 'win32') {
    return path.join(
      process.env.APPDATA || '',
      'Code',
      'User',
      'settings.json',
    );
  } else if (platform === 'darwin') {
    return path.join(
      homedir,
      'Library',
      'Application Support',
      'Code',
      'User',
      'settings.json',
    );
  } else {
    // Linux or other platforms
    return path.join(homedir, '.config', 'Code', 'User', 'settings.json');
  }
}

export const vscodeConfigPath: MCPConfigPath = {
  configDir: '',
  configFileName: '',
};

const vscodeClient = createBaseClient('VS Code', vscodeConfigPath, [
  'Enable MCP support in VS Code by adding "chat.mcp.enabled": true to your user settings',
  'Restart VS Code',
  'Open the Chat view (Ctrl+Alt+I or ⌃⌘I) and select "Agent" mode from the dropdown',
  'Click the "Tools" button to see and use Glean tools in Agent mode',
  "You'll be asked for approval when Agent uses these tools",
]);

vscodeClient.configFilePath = (homedir: string) => {
  return getVSCodeUserSettingsPath(homedir);
};

vscodeClient.successMessage = (configPath) => `
VS Code MCP configuration has been configured in your user settings: ${configPath}

To use it:
1. Enable MCP support in VS Code by adding "chat.mcp.enabled": true to your user settings
2. Restart VS Code
3. Open the Chat view (Ctrl+Alt+I or ⌃⌘I) and select "Agent" mode from the dropdown
4. Click the "Tools" button to see and use Glean tools in Agent mode
5. You'll be asked for approval when Agent uses these tools

Notes:
- You may need to set your Glean instance and API token if they weren't provided during configuration
- User settings are at: ${configPath}
`;

vscodeClient.configTemplate = (instanceOrUrl?: string, apiToken?: string) => {
  const env: Record<string, string> = {};

  // If it looks like a URL, use GLEAN_BASE_URL
  if (
    instanceOrUrl?.startsWith('http://') ||
    instanceOrUrl?.startsWith('https://')
  ) {
    const baseUrl = instanceOrUrl.endsWith('/rest/api/v1')
      ? instanceOrUrl
      : `${instanceOrUrl}/rest/api/v1`;
    env.GLEAN_BASE_URL = baseUrl;
  } else if (instanceOrUrl) {
    env.GLEAN_INSTANCE = instanceOrUrl;
  }

  if (apiToken) {
    env.GLEAN_API_TOKEN = apiToken;
  }

  return {
    mcp: {
      servers: {
        glean: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@gleanwork/mcp-server'],
          env: env,
        },
      },
    },
  };
};

vscodeClient.hasExistingConfig = (existingConfig: Record<string, any>) => {
  return (
    existingConfig.mcp?.servers?.glean?.command === 'npx' &&
    existingConfig.mcp?.servers?.glean?.args?.includes('@gleanwork/mcp-server')
  );
};

vscodeClient.updateConfig = (
  existingConfig: Record<string, any>,
  newConfig: any,
) => {
  existingConfig.mcp = existingConfig.mcp || {};
  existingConfig.mcp.servers = existingConfig.mcp.servers || {};
  existingConfig.mcp.servers.glean = newConfig.mcp.servers.glean;
  return existingConfig;
};

export default vscodeClient;

