#!/usr/bin/env node
/**
 * @fileoverview Glean Model Context Protocol (MCP) Server Entry Point
 *
 * This is the main entry point for the @gleanwork/local-mcp-server package.
 * It handles running the MCP server.
 *
 * @module @gleanwork/local-mcp-server
 */

import meow from 'meow';
import { runServer } from './server.js';
import { Logger, trace, LogLevel } from '@gleanwork/mcp-server-utils/logger';
import { VERSION } from './common/version.js';
import { checkAndOpenLaunchWarning } from '@gleanwork/mcp-server-utils/util';

/**
 * Main function to handle command line arguments and run the server
 */
async function main() {
  const cli = meow(
    `
    Usage
      $ npx @gleanwork/local-mcp-server [options]

    Options
      --server-url, -s Glean server URL (e.g. https://my-company-be.glean.com)
      --instance, -i   Glean instance name
      --token, -t      Glean API token
      --help, -h       Show this help message
      --trace          Enable trace logging

    Examples
      $ npx @gleanwork/local-mcp-server
      $ npx @gleanwork/local-mcp-server --server-url https://my-company-be.glean.com --token glean_api_xyz
      $ npx @gleanwork/local-mcp-server --instance my-company --token glean_api_xyz

    Version: v${VERSION}
  `,
    {
      importMeta: import.meta,
      flags: {
        serverUrl: {
          type: 'string',
          shortFlag: 's',
        },
        token: {
          type: 'string',
          shortFlag: 't',
        },
        instance: {
          type: 'string',
          shortFlag: 'i',
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

  await checkAndOpenLaunchWarning(VERSION);

  const { serverUrl, instance, token } = cli.flags;
  runServer({ serverUrl, instance, token }).catch((error) => {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
