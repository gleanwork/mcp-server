/**
 * VS Code MCP Client Implementation
 *
 * https://code.visualstudio.com/docs/copilot/chat/mcp-servers
 */

import path from 'path';
import fs from 'fs';
import {
  MCPConfigPath,
  createBaseClient,
  VSCodeGlobalConfig,
  VSCodeWorkspaceConfig,
  MCPConfig,
  ConfigFileContents,
  createMcpServersConfig,
  updateMcpServersConfig,
} from './index.js';
import type { ConfigureOptions } from '../index.js';

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

/**
 * Creates VS Code workspace configuration format
 */
function createVSCodeWorkspaceConfig(
  instanceOrUrl?: string,
  apiToken?: string,
  options?: ConfigureOptions,
): VSCodeWorkspaceConfig {
  return {
    servers: createMcpServersConfig(instanceOrUrl, apiToken, options),
  };
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

// Override configFilePath to handle workspace vs global
vscodeClient.configFilePath = (homedir: string, options?: ConfigureOptions) => {
  if (options?.workspace) {
    return path.join(process.cwd(), '.vscode', 'mcp.json');
  }
  return getVSCodeUserSettingsPath(homedir);
};

// Override configTemplate to handle workspace vs global format
vscodeClient.configTemplate = (
  instanceOrUrl?: string,
  apiToken?: string,
  options?: ConfigureOptions,
): MCPConfig => {
  if (options?.workspace) {
    return createVSCodeWorkspaceConfig(instanceOrUrl, apiToken, options);
  }

  return {
    mcp: {
      servers: createMcpServersConfig(instanceOrUrl, apiToken, options),
    },
  };
};

// Override successMessage to handle workspace vs global
vscodeClient.successMessage = (
  configPath: string,
  options?: ConfigureOptions,
) => {
  if (options?.workspace) {
    return `
VS Code workspace MCP configuration has been configured: ${configPath}

To use it:
1. Restart VS Code
2. Open the Chat view (⌃⌘I on Mac, Ctrl+Alt+I on Windows/Linux) and select "Agent" mode
3. Click the "Tools" button to see and use Glean tools in Agent mode
4. You'll be asked for approval when Agent uses these tools

Notes:
- This configuration is specific to this workspace
- Configuration is at: ${configPath}
`;
  }

  return `
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
};

// Override updateConfig to handle workspace vs global format
vscodeClient.updateConfig = (
  existingConfig: ConfigFileContents,
  newConfig: MCPConfig,
  options?: ConfigureOptions,
): ConfigFileContents => {
  if (options?.workspace) {
    const workspaceNewConfig = newConfig as VSCodeWorkspaceConfig;
    const result = { ...existingConfig } as ConfigFileContents &
      VSCodeWorkspaceConfig;

    result.servers = updateMcpServersConfig(result.servers || {}, workspaceNewConfig.servers)
    return result;
  }

  const globalNewConfig = newConfig as VSCodeGlobalConfig;
  const result = { ...existingConfig } as ConfigFileContents &
    VSCodeGlobalConfig;
  result.mcp = result.mcp || { servers: {} };
  result.mcp.servers = updateMcpServersConfig(result.mcp.servers || {}, globalNewConfig.mcp.servers)
  return result;
};

export default vscodeClient;
