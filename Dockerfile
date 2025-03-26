# syntax=docker/dockerfile:1.4

# Build stage
FROM --platform=$BUILDPLATFORM node:20.11-bullseye AS builder

# Add metadata
LABEL org.opencontainers.image.source="https://github.com/aaronsb/glean-mcp-server"
LABEL org.opencontainers.image.description="Glean MCP Server"
LABEL org.opencontainers.image.licenses="MIT"

# Install build dependencies
ENV NODE_ENV=development
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY . .
# Run TypeScript compiler and set permissions separately
RUN npx tsc && chmod +x build/index.js

# Production stage
FROM node:20.11-bullseye
ENV NODE_ENV=production
WORKDIR /app

# Set docker hash as environment variable
ARG DOCKER_HASH=unknown
ENV DOCKER_HASH=$DOCKER_HASH

# Copy only necessary files from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --only=production --ignore-scripts && \
    chmod +x build/index.js && \
    mkdir -p /app/logs && \
    chown -R 1000:1000 /app

# Copy and set up entrypoint
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER 1000:1000

ENTRYPOINT ["docker-entrypoint.sh"]
