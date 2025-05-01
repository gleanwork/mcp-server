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
import { getClient } from './common/client.js';
import { Logger, trace, LogLevel, error } from './log/logger.js';
import {
  discoverOAuthConfig,
  forceAuthorize,
  forceRefreshTokens,
} from './auth/auth.js';

/**
 * Validates client and credential parameters
 * Returns true if validation passes, false if it fails (with appropriate error messages)
 */
export async function validateFlags(
  client: string | undefined,
  token: string | undefined,
  domain: string | undefined,
  env: string | undefined,
): Promise<boolean> {
  if (!client) {
    console.error('Error: --client parameter is required');
    console.error('Run with --help for usage information');
    await listSupportedClients();
    return false;
  }

  const hasCredentialParams = Boolean(token || domain);
  const hasEnvParam = Boolean(env);

  if (hasCredentialParams && hasEnvParam) {
    console.error(
      'Error: You must provide either --token and --domain OR --env, not both.',
    );
    console.error('Run with --help for usage information');
    return false;
  }

  if ((!token || !domain) && !env) {
    console.error('Warning: Configuring without complete credentials.');
    console.error('You must provide either:');
    console.error('  1. Both --token and --domain, or');
    console.error(
      '  2. --env pointing to a .env file containing GLEAN_API_TOKEN and GLEAN_SUBDOMAIN',
    );
    console.error('');
    console.error(
      'Continuing with configuration, but you will need to set credentials manually later.',
    );
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

      $ npx @gleanwork/mcp-server configure --client <client-name> [options]

    Commands
      configure   Configure MCP settings for a specific client/host
      help        Show this help message

    Options for configure
      --client, -c   MCP client to configure for (${clientList || 'loading available clients...'})
      --token, -t    Glean API token
      --domain, -d   Glean instance domain/subdomain
      --env, -e      Path to .env file containing GLEAN_API_TOKEN and GLEAN_SUBDOMAIN

    Examples
      $ npx @gleanwork/mcp-server
      $ npx @gleanwork/mcp-server configure --client cursor --token glean_api_xyz --domain my-company
      $ npx @gleanwork/mcp-server configure --client claude --env ~/.env.glean

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
        domain: {
          type: 'string',
          shortFlag: 'd',
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
      },
    },
  );

  if (!cli.flags.trace) {
    Logger.getInstance().setLogLevel(LogLevel.INFO);
  }

  trace(process.title, `ppid/pid: [${process.ppid} / ${process.pid}]`);
  trace(process.execPath, process.execArgv, process.argv);

  // If no input is provided, run the MCP server
  if (cli.input.length === 0) {
    runServer().catch((error) => {
      console.error('Error starting MCP server:', error);
      process.exit(1);
    });
    return;
  }

  const command = cli.input[0].toLowerCase();

  switch (command) {
    case 'configure': {
      const { client, token, domain, env } = cli.flags;

      if (!(await validateFlags(client, token, domain, env))) {
        process.exit(1);
      }

      try {
        await configure(client as string, { token, domain, envPath: env });
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
        error("Authorization error", err);
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
        const client = getClient();
        const searchResponse = await client.search({
          query: 'doc',
          pageSize: 10,
        });
        trace('auth-test search', searchResponse);
        console.log('Access token accepted.');
      } catch (error: any) {
        console.error(
          `Failed to validate access token with server: ${error.message}`,
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
