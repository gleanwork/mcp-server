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

/**
 * Main function to handle command line arguments and run the server
 */
async function main() {
  const cli = meow(
    `
    Usage
      $ npx @gleanwork/local-mcp-server [options]

    Options
      --instance, -i   Glean instance name
      --token, -t      Glean API token
      --help, -h       Show this help message
      --trace          Enable trace logging

    Examples
      $ npx @gleanwork/local-mcp-server
      $ npx @gleanwork/local-mcp-server --instance my-company --token glean_api_xyz

    Version: v${VERSION}
  `,
    {
      importMeta: import.meta,
      flags: {
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

  const { instance, token } = cli.flags;
  runServer({ instance, token }).catch((error) => {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
