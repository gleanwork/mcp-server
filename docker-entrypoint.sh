#!/bin/sh
set -e

# Run the MCP server
exec node build/index.js "$@"
