# MCP Server Installation Guide for LLM Agents

This guide provides instructions for LLM agents like Cline to install and configure the Glean MCP Server.

## Installation Options

### Option 1: Docker Installation (Recommended)

The Docker installation method is recommended as it provides the simplest setup experience and works across different architectures (amd64 and arm64).

```json
{
  "mcpServers": {
    "glean": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "ghcr.io/gleanwork/mcp-server:latest"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Option 2: Node.js Installation

If Docker is not available, you can install the MCP server using Node.js:

1. Ensure Node.js 18+ is installed
2. Clone the repository
3. Install dependencies
4. Build the project
5. Configure the MCP server

```json
{
  "mcpServers": {
    "glean": {
      "command": "node",
      "args": ["/path/to/glean-mcp-server/dist/index.js"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Environment Variables

The Glean MCP Server does not require any environment variables for basic functionality. However, you may add custom environment variables for specific use cases:

```json
"env": {
  "CUSTOM_VARIABLE": "value"
}
```

## Capabilities

The Glean MCP Server provides the following capabilities:

- **Chat Tools**: Tools for interacting with chat-based APIs
- **Search Tools**: Tools for performing searches across various data sources

## Troubleshooting

### Common Issues

1. **Connection Errors**: If you encounter connection errors, ensure the server is running and accessible.

   Solution: Check if the Docker container is running or if the Node.js process is active.

2. **Permission Issues**: If you encounter permission issues, ensure the user has the necessary permissions.

   Solution: For Docker, ensure the user has permissions to run Docker containers.

3. **Port Conflicts**: If you encounter port conflicts, change the port mapping.

   Solution: Modify the Docker run command to use a different port.

### Logs

To view logs for troubleshooting:

- **Docker**: `docker logs <container_id>`
- **Node.js**: Check the console output or configured log files

## Updating

To update to the latest version:

- **Docker**: Pull the latest image: `docker pull ghcr.io/gleanwork/mcp-server:latest`
- **Node.js**: Pull the latest code and rebuild: `git pull && npm install && npm run build`

## Support

If you encounter any issues not covered in this guide, please open an issue on the GitHub repository.
