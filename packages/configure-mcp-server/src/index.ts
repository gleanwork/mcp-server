#!/usr/bin/env node
/**
 * @fileoverview Glean Model Context Protocol (MCP) Configuration Utilities
 *
 * This is the main entry point for the @gleanwork/configure-mcp-server
 * package. It handles MCP client configuration for various host applications,
 * supporting both local and remote MCP server setups.
 *
 * 1. Configuring MCP settings for different host applications
 * 2. Supporting local MCP servers with instance + token authentication
 * 3. Supporting remote MCP servers with URL-based configuration
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
import { Logger, trace, LogLevel } from '@gleanwork/mcp-server-utils/logger';
import { VERSION } from './common/version.js';
import { checkAndOpenLaunchWarning } from '@gleanwork/mcp-server-utils/util';

/**
 * Main function to handle command line arguments and branch between configure and auth modes
 */
async function main() {
  await checkAndOpenLaunchWarning(VERSION);

  try {
    await ensureClientsLoaded();
  } catch {
    console.error(
      'Warning: Failed to load client modules. Help text may be incomplete.',
    );
  }

  const clientList = Object.keys(availableClients).join(', ');

  const help = `
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
      --client, -c    MCP client to configure for (${clientList || 'loading available clients...'})
      --url, -u       Full MCP server URL (required, e.g., https://my-be.glean.com/mcp/default)
      --token, -t     Glean API token (optional, OAuth will be used if not provided)
      --env, -e       Path to .env file containing GLEAN_URL and optionally GLEAN_API_TOKEN
      --workspace     Create workspace configuration instead of global (VS Code only)

    
    Examples

      Local:

      npx @gleanwork/configure-mcp-server local --instance acme --client cursor --token glean_api_xyz
      npx @gleanwork/configure-mcp-server local --instance acme --client claude --token glean_api_xyz
      npx @gleanwork/configure-mcp-server local --instance acme --client cursor --token glean_api_xyz
      npx @gleanwork/configure-mcp-server local --instance acme --client goose --token glean_api_xyz
      npx @gleanwork/configure-mcp-server local --instance acme --client windsurf --env ~/.glean.env
      npx @gleanwork/configure-mcp-server local --instance acme --client vscode --workspace --token glean_api_xyz

      Remote:

      npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client cursor
      npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/agents --client claude
      npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/analytics --client cursor
      npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client goose
      npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client windsurf
      npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client vscode --workspace
      
      # With explicit token (bypasses DCR):
      npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client cursor --token glean_api_xyz

    Run 'npx @gleanwork/configure-mcp-server help' for more details on supported clients

    Version: v${VERSION}

`;

  const cli = meow(help, {
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
      const { client, token, instance, url, env, workspace, agents } =
        cli.flags;

      if (!(await validateFlags(client, token, instance, url, env))) {
        process.exit(1);
      }

      // Warn if --agents is used with --url since the server is determined by the URL
      if (url && agents) {
        console.warn(
          'Note: --agents flag is ignored when using --url. The server is determined by the URL path.\n',
        );
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
