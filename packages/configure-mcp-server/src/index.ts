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
  setupMcpRemote,
} from '@gleanwork/mcp-server-utils/auth';
import { chat, formatResponse } from '@gleanwork/local-mcp-server/tools/chat';
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

  const help_default = `
    Usage
      Configure popular MCP clients to add Glean as an MCP server.

      $ npx @gleanwork/configure-mcp-server --client <client-name> [options]

    Commands
      configure   Configure MCP settings for a specific client/host
      help        Show this help message

    Options for configure
      --client, -c    MCP client to configure for (${clientList || 'loading available clients...'})
      --token, -t     Glean API token (required)
      --instance, -i  Glean instance name
      --env, -e       Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
      --workspace     Create workspace configuration instead of global (VS Code only)

    Examples
      $ npx @gleanwork/configure-mcp-server --client cursor --token glean_api_xyz --instance my-company
      $ npx @gleanwork/configure-mcp-server --client claude --token glean_api_xyz --instance my-company
      $ npx @gleanwork/configure-mcp-server --client windsurf --env ~/.glean.env
      $ npx @gleanwork/configure-mcp-server --client vscode --token glean_api_xyz --instance my-company --workspace

    Run 'npx @gleanwork/configure-mcp-server help' for more details on supported clients
    
    Version: v${VERSION}
`;

  const betaEnabled = process.env.GLEAN_BETA_ENABLED;
  const help_beta = `
    Usage
      Configure popular MCP clients to add Glean as an MCP server.

      Available MCP servers:

        local     A local server using Glean's API to access common tools (search, chat)
        remote    Connect to Glean's hosted MCP servers (default tools and agents).
        

      $ npx @gleanwork/configure-mcp-server --client <client-name> [options]

    Commands
      local       Configure Glean's local MCP server for a given client
      remote      Configure Glean's remote MCP server for a given client
      help        Show this help message

    Options for local
      --client, -c    MCP client to configure for (${clientList || 'loading available clients...'})
      --token, -t     Glean API token (required)
      --instance, -i  Glean instance name
      --env, -e       Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
      --workspace     Create workspace configuration instead of global (VS Code only)

    Options for remote
      --agents        Connect your Glean Agents to your MCP client.  If unset, will connect the default tools.
      --client, -c    MCP client to configure for (${clientList || 'loading available clients...'})
      --token, -t     Glean API token (required)
      --instance, -i  Glean instance name
      --env, -e       Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
      --workspace     Create workspace configuration instead of global (VS Code only)

    Examples
      $ npx @gleanwork/configure-mcp-server remote --client cursor --token glean_api_xyz --instance my-company
      $ npx @gleanwork/configure-mcp-server remote --agents --client claude --token glean_api_xyz --instance my-company
      $ npx @gleanwork/configure-mcp-server remote --client windsurf --env ~/.glean.env
      $ npx @gleanwork/configure-mcp-server remote --client vscode --token glean_api_xyz --instance my-company --workspace

    Run 'npx @gleanwork/configure-mcp-server help' for more details on supported clients
    
    Version: v${VERSION}

`;

  const cli = meow(betaEnabled ? help_beta : help_default, {
    importMeta: import.meta,
    flags: {
      agents: {
        type: 'boolean',
        default: false,
      },
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
  });

  if (!cli.flags.trace) {
    Logger.getInstance().setLogLevel(LogLevel.INFO);
  }

  trace(process.title, `ppid/pid: [${process.ppid} / ${process.pid}]`);
  trace(process.execPath, process.execArgv, process.argv);

  // Get the command, defaulting to 'local' if none provided
  const command = cli.input.length === 0 ? 'local' : cli.input[0].toLowerCase();
  switch (command) {
    case 'remote': {
      if(!betaEnabled) {
        console.warn(`
Please note Glean-hosted MCP servers are in private beta.  Make sure your
instance is opted into the private beta or your assistant won't be able to
connect after configuration.

`);
      }

      const { client, token, instance, url, env, workspace, agents } =
        cli.flags;

      if (!(await validateFlags(client, token, instance, url, env))) {
        process.exit(1);
      }

      try {
        await configure(client as string, {
          token,
          instance,
          url,
          envPath: env,
          remote: true,
          agents,
          workspace,
        });
      } catch (error: any) {
        console.error(`Configuration failed: ${error.message}`);
        process.exit(1);
      }
      break;
    }
    case 'local': {
      const { client, token, instance, url, env, workspace } =
        cli.flags;

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

    case 'setup-mcp-remote': {
      try {
        trace('setup-mcp-remote(tools)');
        await setupMcpRemote({ target: 'default' });
        console.log('mcp-remote set up');
      } catch (err: any) {
        error('setup-mcp-remote error', err);
        console.error(`Failed to set up mcp-remote: ${err.message}`);
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
