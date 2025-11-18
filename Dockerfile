# Use Alpine-based Node.js 20 for minimal image size and security
FROM node:20-alpine

# Install the published @gleanwork/local-mcp-server package from npm
# PACKAGE_VERSION can be set at build time to pin to a specific version
ARG PACKAGE_VERSION=latest
RUN npm install -g @gleanwork/local-mcp-server@${PACKAGE_VERSION}

# Create non-root user for security best practices
# uid/gid 1001 is a common convention for application users
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcpserver -u 1001

# Switch to non-root user for running the server
USER mcpserver

# Run the MCP server
# The server uses stdio transport and keeps running until terminated
CMD ["local-mcp-server"]
