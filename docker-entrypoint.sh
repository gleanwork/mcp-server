#!/bin/bash
set -e

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

# Handle signals gracefully
cleanup() {
    log "Received termination signal, shutting down gracefully..."
    if [ ! -z "$child_pid" ]; then
        kill -TERM "$child_pid" 2>/dev/null || true
        wait "$child_pid"
    fi
    exit 0
}

trap cleanup SIGTERM SIGINT

log "Starting Glean MCP Server (Docker Hash: ${DOCKER_HASH:-unknown})"

# Set up environment
export NODE_ENV=${NODE_ENV:-production}

# Change to app directory
cd /app

# Default to local-mcp-server if no arguments provided
if [ $# -eq 0 ]; then
    set -- "packages/local-mcp-server/build/index.js"
fi

# Handle different commands
case "$1" in
    packages/local-mcp-server/build/index.js|local-mcp-server)
        log "Starting local MCP server..."
        exec node packages/local-mcp-server/build/index.js "${@:2}"
        ;;
    packages/configure-mcp-server/build/index.js|configure-mcp-server)
        log "Starting configure MCP server..."
        exec node packages/configure-mcp-server/build/index.js "${@:2}"
        ;;
    node)
        # Allow running node directly
        exec "$@"
        ;;
    bash|sh)
        # Allow shell access for debugging
        exec "$@"
        ;;
    *)
        # Try to execute as a node script
        if [ -f "$1" ]; then
            log "Executing custom script: $1"
            exec node "$@"
        else
            log "Unknown command: $1"
            log "Available commands:"
            log "  - local-mcp-server (default)"
            log "  - configure-mcp-server"
            log "  - node <script>"
            log "  - bash/sh (for debugging)"
            exit 1
        fi
        ;;
esac