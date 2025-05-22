import { describe, it, expect } from 'vitest';
import vscodeClient from '../../configure/client/vscode.js';
import os from 'os';
import path from 'path';

describe('VS Code MCP Client', () => {
  it('should have the correct display name', () => {
    expect(vscodeClient.displayName).toBe('VS Code');
  });

  it('should generate the correct config path based on platform', () => {
    const homedir = os.homedir();
    const platform = process.platform;
    let expectedPath: string;
    
    if (platform === 'win32') {
      expectedPath = path.join(process.env.APPDATA || '', 'Code', 'User', 'settings.json');
    } else if (platform === 'darwin') {
      expectedPath = path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'settings.json');
    } else {
      // Linux or other platforms
      expectedPath = path.join(homedir, '.config', 'Code', 'User', 'settings.json');
    }
    
    expect(vscodeClient.configFilePath(homedir)).toBe(expectedPath);
  });

  it('should generate a valid VS Code MCP config template with instance', () => {
    const config = vscodeClient.configTemplate('example-instance', 'test-token');
    expect(config).toMatchInlineSnapshot(`
      {
        "mcp": {
          "servers": {
            "glean": {
              "args": [
                "-y",
                "@gleanwork/mcp-server",
              ],
              "command": "npx",
              "env": {
                "GLEAN_API_TOKEN": "test-token",
                "GLEAN_INSTANCE": "example-instance",
              },
              "type": "stdio",
            },
          },
        },
      }
    `);
  });

  it('should generate a valid VS Code MCP config template with URL', () => {
    const config = vscodeClient.configTemplate('https://example.com/rest/api/v1', 'test-token');
    expect(config).toMatchInlineSnapshot(`
      {
        "mcp": {
          "servers": {
            "glean": {
              "args": [
                "-y",
                "@gleanwork/mcp-server",
              ],
              "command": "npx",
              "env": {
                "GLEAN_API_TOKEN": "test-token",
                "GLEAN_BASE_URL": "https://example.com/rest/api/v1",
              },
              "type": "stdio",
            },
          },
        },
      }
    `);
  });

  it('should include success message with instructions', () => {
    const message = vscodeClient.successMessage('/path/to/config');
    expect(message).toContain('VS Code MCP configuration has been configured in your user settings');
    expect(message).toContain('Enable MCP support in VS Code');
    expect(message).toContain('Restart VS Code');
    expect(message).toContain('Agent mode');
    expect(message).toContain('User settings are at:');
  });
});