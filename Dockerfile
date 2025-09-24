# syntax=docker/dockerfile:1.4

# Build stage - multi-architecture support
FROM node:20-bullseye AS builder

# Add metadata
LABEL org.opencontainers.image.source="https://github.com/gleanwork/mcp-server"
LABEL org.opencontainers.image.description="Glean MCP Server - Multi-architecture build"
LABEL org.opencontainers.image.licenses="MIT"

# Install build dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@10.6.2

# Copy workspace configuration and root package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all package.json files to enable proper dependency resolution
COPY packages/ ./packages/

# Install dependencies using pnpm (includes workspace packages)
# Use --no-frozen-lockfile in case lockfile is out of sync
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Build all packages
RUN pnpm run build

# Production stage
FROM node:20-bullseye-slim

WORKDIR /app

# Set docker hash as environment variable
ARG DOCKER_HASH=unknown
ENV DOCKER_HASH=$DOCKER_HASH

# Install pnpm in production stage too
RUN npm install -g pnpm@10.6.2

# Copy workspace config and package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy built packages from builder stage (includes package.json files)
COPY --from=builder /app/packages ./packages

# Install only production dependencies (skip prepare scripts)
RUN pnpm install --no-frozen-lockfile --prod --ignore-scripts && \
    pnpm store prune

# Make the main server executable
RUN chmod +x packages/local-mcp-server/build/index.js

# Create non-root user and required directories
RUN groupadd -r mcp && useradd -r -g mcp -m mcp && \
    mkdir -p /app/logs && \
    mkdir -p /home/mcp/.local/state/glean && \
    mkdir -p /home/mcp/.cache && \
    chown -R mcp:mcp /app && \
    chown -R mcp:mcp /home/mcp

# Copy and set up entrypoint
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER mcp

# Default command runs the local MCP server
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["packages/local-mcp-server/build/index.js"]