# Use Alpine-based Node.js 20 for minimal image size and security
FROM node:20-alpine

# Create non-root user for security best practices
# uid/gid 1001 is a common convention for application users
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcpserver -u 1001

# Switch to non-root user before installing packages
# This ensures npm global installs go to user space, not /usr/local
USER mcpserver

# Install the published @gleanwork/local-mcp-server package from npm
# Using -g installs it globally in the user's home directory
RUN npm install -g @gleanwork/local-mcp-server

# Run the MCP server
# The server uses stdio transport and keeps running until terminated
CMD ["local-mcp-server"]
