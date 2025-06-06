#!/usr/bin/env node
/**
 * @fileoverview Glean Model Context Protocol (MCP) Configuration and Auth Utilities
 *
 * This is the main entry point for the @gleanwork/configure-mcp-server
 * package. It handles configuration and authentication functionality:
 *
 * 1. Configuring MCP settings for different hosts
 * 2. Managing authentication and OAuth flows
 *
 * @module @gleanwork/mcp-server
 */

import meow from 'meow';
import {
  configure,
  listSupportedClients,
  validateFlags,
} from './configure/index.js';
import {
  availableClients,
  ensureClientsLoaded,
} from './configure/client/index.js';
import {
  Logger,
  trace,
  LogLevel,
  error,
} from '@gleanwork/mcp-server-utils/logger';
import {
  discoverOAuthConfig,
  forceAuthorize,
  forceRefreshTokens,
} from '@gleanwork/mcp-server-utils/auth';
import { chat, formatResponse } from '@gleanwork/mcp-server-utils/tools/chat';
import { VERSION } from './common/version.js';

/**
 * Main function to handle command line arguments and branch between configure and auth modes
 */
async function main() {
  try {
    await ensureClientsLoaded();
  } catch {
    console.error(
      'Warning: Failed to load client modules. Help text may be incomplete.',
    );
  }

  const clientList = Object.keys(availableClients).join(', ');

  const cli = meow(
    `
    Usage
      Configure popular MCP clients to add Glean as an MCP server.

      $ npx @gleanwork/configure-mcp-server --client <client-name> [options]

    Commands
      configure   Configure MCP settings for a specific client/host
      help        Show this help message

    Options for configure
      --client, -c   MCP client to configure for (${clientList || 'loading available clients...'})
      --token, -t    Glean API token (required)
      --instance, -i   Glean instance name
      --env, -e      Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
      --workspace    Create workspace configuration instead of global (VS Code only)

    Examples
      $ npx @gleanwork/configure-mcp-server --client cursor --token glean_api_xyz --instance my-company
      $ npx @gleanwork/configure-mcp-server --client claude --token glean_api_xyz --instance my-company
      $ npx @gleanwork/configure-mcp-server --client windsurf --env ~/.glean.env
      $ npx @gleanwork/configure-mcp-server --client vscode --token glean_api_xyz --instance my-company --workspace

    Run 'npx @gleanwork/configure-mcp-server help' for more details on supported clients
    
    Version: v${VERSION}
  `,
    {
      importMeta: import.meta,
      flags: {
        client: {
          type: 'string',
          shortFlag: 'c',
        },
        token: {
          type: 'string',
          shortFlag: 't',
        },
        instance: {
          type: 'string',
          shortFlag: 'i',
        },
        url: {
          type: 'string',
          shortFlag: 'u',
        },
        env: {
          type: 'string',
          shortFlag: 'e',
        },
        help: {
          type: 'boolean',
          shortFlag: 'h',
        },
        trace: {
          type: 'boolean',
        },
        workspace: {
          type: 'boolean',
        },
      },
    },
  );

  if (!cli.flags.trace) {
    Logger.getInstance().setLogLevel(LogLevel.INFO);
  }

  trace(process.title, `ppid/pid: [${process.ppid} / ${process.pid}]`);
  trace(process.execPath, process.execArgv, process.argv);

  // Get the command, defaulting to 'configure' if none provided
  const command =
    cli.input.length === 0 ? 'configure' : cli.input[0].toLowerCase();

  switch (command) {
    case 'configure': {
      const { client, token, instance, url, env, workspace } = cli.flags;

      if (!(await validateFlags(client, token, instance, url, env))) {
        process.exit(1);
      }

      try {
        await configure(client as string, {
          token,
          instance,
          url,
          envPath: env,
          workspace,
        });
      } catch (error: any) {
        console.error(`Configuration failed: ${error.message}`);
        process.exit(1);
      }
      break;
    }

    case 'help': {
      console.log(cli.help);
      await listSupportedClients();
      break;
    }

    // Auth commands
    case 'auth': {
      try {
        await forceAuthorize();
        console.log('Authorized successfully.');
      } catch (err: any) {
        error('Authorization error', err);
        console.error(`Authorization failed: ${err.message}`);
        process.exit(1);
      }
      break;
    }

    case 'auth-discover': {
      try {
        const config = await discoverOAuthConfig();
        trace('auth-discover', config);
      } catch (error: any) {
        console.error(`Authorization discovery failed: ${error.message}`);
        process.exit(1);
      }
      break;
    }

    case 'auth-refresh': {
      try {
        await forceRefreshTokens();
        console.log('Refreshed authorization token.');
      } catch (error: any) {
        console.error(`Refreshing access token failed: ${error.message}`);
        process.exit(1);
      }
      break;
    }

    case 'auth-test': {
      try {
        const chatResponse = await chat({ message: 'Who am I?' });
        trace('auth-test search', formatResponse(chatResponse));
        console.log('Access token accepted.');
      } catch (err: any) {
        error('auth-test error', err);
        console.error(
          `Failed to validate access token with server: ${err.message}`,
        );
        process.exit(1);
      }
      break;
    }

    default: {
      console.error(`Unknown command: ${command}`);
      console.error('Run with --help for usage information');
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
