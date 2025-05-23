import { describe, it, expect } from 'vitest';
import vscodeClient from '../../configure/client/vscode.js';
import type { ConfigureOptions, MCPConfig } from '../../configure.js';
import os from 'os';
import path from 'path';

describe('VS Code MCP Client', () => {
  const homedir = os.homedir();

  it('should have the correct display name', () => {
    expect(vscodeClient.displayName).toBe('VS Code');
  });

  it('should generate the correct config path based on platform', () => {
    const platform = process.platform;
    let expectedPath: string;

    if (platform === 'win32') {
      expectedPath = path.join(
        process.env.APPDATA || '',
        'Code',
        'User',
        'settings.json',
      );
    } else if (platform === 'darwin') {
      expectedPath = path.join(
        homedir,
        'Library',
        'Application Support',
        'Code',
        'User',
        'settings.json',
      );
    } else {
      expectedPath = path.join(
        homedir,
        '.config',
        'Code',
        'User',
        'settings.json',
      );
    }

    expect(vscodeClient.configFilePath(homedir)).toBe(expectedPath);
  });

  it('should generate workspace config path when workspace option is provided', () => {
    const originalCwd = process.cwd();

    try {
      process.cwd = () => '/test/workspace';

      const options: ConfigureOptions = { workspace: true };
      const configPath = vscodeClient.configFilePath(homedir, options);
      expect(configPath).toBe('/test/workspace/.vscode/mcp.json');
    } finally {
      process.cwd = () => originalCwd;
    }
  });

  it('should generate workspace config path in any directory', () => {
    const originalCwd = process.cwd();

    try {
      process.cwd = () => '/any/directory';

      const options: ConfigureOptions = { workspace: true };
      const configPath = vscodeClient.configFilePath(homedir, options);
      expect(configPath).toBe('/any/directory/.vscode/mcp.json');
    } finally {
      process.cwd = () => originalCwd;
    }
  });

  it('should generate a valid VS Code MCP config template with instance', () => {
    const config = vscodeClient.configTemplate(
      'example-instance',
      'test-token',
    );

    expect(config).toMatchObject({
      mcp: {
        servers: {
          glean: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@gleanwork/mcp-server'],
            env: {
              GLEAN_INSTANCE: 'example-instance',
              GLEAN_API_TOKEN: 'test-token',
            },
          },
        },
      },
    });
  });

  it('should generate a valid VS Code workspace config template with instance', () => {
    const options: ConfigureOptions = { workspace: true };
    const config = vscodeClient.configTemplate(
      'example-instance',
      'test-token',
      options,
    );

    expect(config).toMatchObject({
      servers: {
        glean: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@gleanwork/mcp-server'],
          env: {
            GLEAN_INSTANCE: 'example-instance',
            GLEAN_API_TOKEN: 'test-token',
          },
        },
      },
    });
  });

  it('should generate a valid VS Code MCP config template with URL', () => {
    const config = vscodeClient.configTemplate(
      'https://example.com/rest/api/v1',
      'test-token',
    );

    expect(config).toMatchObject({
      mcp: {
        servers: {
          glean: {
            env: {
              GLEAN_BASE_URL: 'https://example.com/rest/api/v1',
              GLEAN_API_TOKEN: 'test-token',
            },
          },
        },
      },
    });
  });

  it('should include success message with instructions', () => {
    const configPath = '/path/to/config';
    const message = vscodeClient.successMessage(configPath);

    expect(message).toContain('VS Code MCP configuration has been configured');
    expect(message).toContain(configPath);
    expect(message).toContain('Restart VS Code');
  });

  it('should include workspace-specific success message for workspace config', () => {
    const configPath = '/workspace/.vscode/mcp.json';
    const options: ConfigureOptions = { workspace: true };
    const message = vscodeClient.successMessage(configPath, options);

    expect(message).toContain(
      'VS Code workspace MCP configuration has been configured',
    );
    expect(message).toContain(
      'This configuration is specific to this workspace',
    );
    expect(message).toContain(configPath);
  });

  it('should detect existing global config correctly', () => {
    const existingConfig = {
      mcp: {
        servers: {
          glean: {
            command: 'npx',
            args: ['-y', '@gleanwork/mcp-server'],
          },
        },
      },
    };

    expect(vscodeClient.hasExistingConfig(existingConfig)).toBe(true);
  });

  it('should detect existing workspace config correctly', () => {
    const existingConfig = {
      servers: {
        glean: {
          command: 'npx',
          args: ['-y', '@gleanwork/mcp-server'],
        },
      },
    };

    const options: ConfigureOptions = { workspace: true };
    expect(vscodeClient.hasExistingConfig(existingConfig, options)).toBe(true);
  });

  it('should update global config correctly', () => {
    const existingConfig = { someOtherConfig: true };
    const newConfig: MCPConfig = {
      mcp: {
        servers: {
          glean: {
            command: 'npx',
            args: ['-y', '@gleanwork/mcp-server'],
            env: {},
          },
        },
      },
    };

    const updated = vscodeClient.updateConfig(existingConfig, newConfig);

    expect(updated).toMatchObject({
      someOtherConfig: true,
      mcp: newConfig.mcp,
    });
  });

  it('should update workspace config correctly', () => {
    const existingConfig = { someOtherConfig: true };
    const newConfig: MCPConfig = {
      servers: {
        glean: {
          command: 'npx',
          args: ['-y', '@gleanwork/mcp-server'],
          env: {},
        },
      },
    };

    const options: ConfigureOptions = { workspace: true };
    const updated = vscodeClient.updateConfig(
      existingConfig,
      newConfig,
      options,
    );

    expect(updated).toMatchObject({
      someOtherConfig: true,
      servers: newConfig.servers,
    });
  });

  it('should generate a valid VS Code workspace config template with URL', () => {
    const options: ConfigureOptions = { workspace: true };
    const config = vscodeClient.configTemplate(
      'https://example.com/rest/api/v1',
      'test-token',
      options,
    );

    expect(config).toMatchObject({
      servers: {
        glean: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@gleanwork/mcp-server'],
          env: {
            GLEAN_BASE_URL: 'https://example.com/rest/api/v1',
            GLEAN_API_TOKEN: 'test-token',
          },
        },
      },
    });
  });

  it('should generate global config when workspace option is false', () => {
    const options: ConfigureOptions = { workspace: false };
    const config = vscodeClient.configTemplate(
      'example-instance',
      'test-token',
      options,
    );

    expect(config).toMatchObject({
      mcp: {
        servers: {
          glean: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@gleanwork/mcp-server'],
            env: {
              GLEAN_INSTANCE: 'example-instance',
              GLEAN_API_TOKEN: 'test-token',
            },
          },
        },
      },
    });
  });
});
