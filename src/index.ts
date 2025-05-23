#!/usr/bin/env node
/**
 * @fileoverview Glean Model Context Protocol (MCP) Server Entry Point
 *
 * This is the main entry point for the @gleanwork/mcp-server package.
 * It branches between two main functionalities:
 *
 * 1. Running as an MCP server (default behavior)
 * 2. Configuring MCP settings for different hosts (when run with 'configure' argument)
 *
 * @module @gleanwork/mcp-server
 */

import meow from 'meow';
import { runServer } from './server.js';
import { configure, listSupportedClients } from './configure.js';
import { availableClients, ensureClientsLoaded } from './configure/index.js';
import { VERSION } from './common/version.js';
import { Logger, trace, LogLevel, error } from './log/logger.js';
import {
  discoverOAuthConfig,
  forceAuthorize,
  forceRefreshTokens,
} from './auth/auth.js';
import { chat, formatResponse } from './tools/chat.js';

/**
 * Validates client and credential parameters
 * Returns true if validation passes, false if it fails (with appropriate error messages)
 */
export async function validateFlags(
  client: string | undefined,
  token: string | undefined,
  instance: string | undefined,
  url: string | undefined,
  env: string | undefined,
): Promise<boolean> {
  if (!client) {
    console.error('Error: --client parameter is required');
    console.error('Run with --help for usage information');
    await listSupportedClients();
    return false;
  }

  const hasDeployment = Boolean(instance || url);
  const hasToken = Boolean(token);
  const hasCredential = Boolean(hasDeployment || hasToken);
  const hasEnvParam = Boolean(env);

  if (hasCredential && hasEnvParam) {
    console.error(
      'Error: You must provide either --instance OR --env, not both.',
    );
    console.error('Run with --help for usage information');
    return false;
  }

  if (hasToken && !hasDeployment) {
    console.error(`
"Warning: Configuring without complete credentials.
You must provide either:
  1. Both --token and --instance, or
  2. --env pointing to a .env file containing GLEAN_API_TOKEN and GLEAN_INSTANCE

Continuing with configuration, but you will need to set credentials manually later."
`);
    return true;
  }

  if (instance && url) {
    // --url is unlisted.  It's only for dev so you can specify a local server.
    console.error(
      'Error: Specify your Glean instance with either --url or --instance but not both.',
    );
    console.error('Run with --help for usage information');
    return false;
  }

  if (!hasToken && !hasDeployment && !hasEnvParam) {
    console.error('Error: You must provide either:');
    console.error('  1. Both --token and --instance for authentication, or');
    console.error(
      '  2. --env pointing to a .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN',
    );
    console.error('Run with --help for usage information');
    return false;
  }

  return true;
}

/**
 * Main function to handle command line arguments and branch between server and configure modes
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
      Typically this package is configured in an MCP client configuration file.
      However, you can also run it directly with the following commands, which help you set up the server configuration in an MCP client:

      $ npx @gleanwork/mcp-server [server] [options]                 # Run the MCP server (default)
      $ npx @gleanwork/mcp-server configure --client <client-name> [options]

    Commands
      server      Run the MCP server (default if no command is specified)
      configure   Configure MCP settings for a specific client/host
      help        Show this help message

    Options for server
      --instance, -i   Glean instance name
      --token, -t      Glean API token

    Options for configure
      --client, -c   MCP client to configure for (${clientList || 'loading available clients...'})
      --token, -t    Glean API token (required)
      --instance, -i   Glean instance name
      --env, -e      Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
      --local        Create local workspace configuration instead of global (VS Code only)

    Examples
      $ npx @gleanwork/mcp-server
      $ npx @gleanwork/mcp-server server --instance my-company --token glean_api_xyz
      $ npx @gleanwork/mcp-server configure --client cursor --token glean_api_xyz --instance my-company
      $ npx @gleanwork/mcp-server configure --client claude --token glean_api_xyz --instance my-company
      $ npx @gleanwork/mcp-server configure --client windsurf --env ~/.glean.env
      $ npx @gleanwork/mcp-server configure --client vscode --token glean_api_xyz --instance my-company --local

    Run 'npx @gleanwork/mcp-server help' for more details on supported clients
    
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
        // Omit url from help output.  This flag is only useful for dev, when
        // you're running a local server and need to specify a port.
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
        local: {
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

  // Get the command, defaulting to 'server' if none provided
  const command =
    cli.input.length === 0 ? 'server' : cli.input[0].toLowerCase();

  switch (command) {
    case 'server': {
      const { instance, token } = cli.flags;
      runServer({ instance, token }).catch((error) => {
        console.error('Error starting MCP server:', error);
        process.exit(1);
      });
      return;
    }
    case 'configure': {
      const { client, token, instance, url, env, local } = cli.flags;

      if (!(await validateFlags(client, token, instance, url, env))) {
        process.exit(1);
      }

      try {
        await configure(client as string, {
          token,
          instance,
          url,
          envPath: env,
          local,
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

    // unlisted commands

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
