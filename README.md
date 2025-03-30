# @gleanwork/mcp-server

![](https://badge.mcpx.dev?type=server 'MCP Server')
![CI Build](https://github.com/gleanwork/mcp-server/actions/workflows/docker-build.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@gleanwork%2Fmcp-server.svg)](https://badge.fury.io/js/@gleanwork%2Fmcp-server)
[![License](https://img.shields.io/npm/l/@gleanwork%2Fmcp-server.svg)](https://github.com/gleanwork/mcp-server/blob/main/LICENSE)

A Model Context Protocol (MCP) server implementation for Glean's search and chat capabilities. This server provides a standardized interface for AI models to interact with Glean's content search and conversational AI features through stdio communication.

## Features

- 🔍 **Search Integration**: Access Glean's powerful content search capabilities
- 💬 **Chat Interface**: Interact with Glean's AI assistant
- 🔄 **MCP Compliant**: Implements the Model Context Protocol specification

## Prerequisites

- Node.js v18 or higher
- Glean API credentials

## Installation

With `npm`:

```bash
npm install @gleanwork/mcp-server
```

With `pnpm`:

```bash
pnpm install @gleanwork/mcp-server
```

With `yarn`:

```bash
yarn add @gleanwork/mcp-server
```

## Configuration

1. Set up your Glean API credentials:

```bash
export GLEAN_SUBDOMAIN=your_subdomain
export GLEAN_API_TOKEN=your_api_token
```

1. (Optional) For global tokens that support impersonation:

```bash
export GLEAN_ACT_AS=user@example.com
```

## MCP Client Configuration

To configure this MCP server in your MCP client (such as Claude Desktop, Windsurf, Cursor, etc.), add the following configuration to your MCP client settings:

```json
{
  "mcpServers": {
    "glean": {
      "command": "npx",
      "args": ["-y", "@gleanwork/mcp-server"],
      "env": {
        "GLEAN_SUBDOMAIN": "<glean instance subdomain>",
        "GLEAN_API_TOKEN": "<glean api token>"
      }
    }
  }
}
```

Replace the environment variable values with your actual Glean credentials.

## Tools

### glean_search

Search Glean's content index using the Glean Search API. This tool allows you to query Glean's content index with various filtering and configuration options.

For complete parameter details, see [Search API Documentation](https://developers.glean.com/client/operation/search/)

### glean_chat

Interact with Glean's AI assistant using the Glean Chat API. This tool allows you to have conversational interactions with Glean's AI, including support for message history, citations, and various configuration options.

For complete parameter details, see [Chat API Documentation](https://developers.glean.com/client/operation/chat/)

## Running the Server

The server communicates via stdio, making it ideal for integration with AI models and other tools:

```bash
node build/index.js
```

## Docker

You can also run the server using Docker:

```bash
docker run -e GLEAN_SUBDOMAIN=your_subdomain -e GLEAN_API_TOKEN=your_api_token ghcr.io/aaronsb/glean-mcp-server
```

### Building Docker Images

The repository includes scripts to build multi-architecture Docker images (AMD64 and ARM64):

#### Standard Build Script

```bash
# Build multi-architecture image locally
./scripts/build.sh

# Build with custom image name and tag
./scripts/build.sh --image-name=myorg/glean-mcp --tag=v1.0.0

# Build and push to registry
./scripts/build.sh --push

# Build for specific platforms
./scripts/build.sh --platforms=linux/amd64,linux/arm64
```

#### Improved Local Development Build Script

For a more developer-friendly experience with better error handling and output management:

```bash
# Build for local development with improved output handling
./scripts/build-local.sh

# Enable verbose mode to see all output
./scripts/build-local.sh --verbose

# Build with custom image name and tag
./scripts/build-local.sh --image-name=myorg/glean-mcp --tag=v1.0.0

# Build and push to registry
./scripts/build-local.sh --push

# Build for specific platforms
./scripts/build-local.sh --platforms=linux/amd64,linux/arm64
```

The `build-local.sh` script provides:

- Redirected output to log files to avoid overwhelming the console
- Clear status indicators with colored success/failure markers
- Extracted and focused error messages for TypeScript compiler issues
- Log file size warnings and viewing tips for large outputs
- Verbose mode option for detailed debugging

The Docker image is built for both AMD64 and ARM64 architectures by default, making it compatible with a wide range of systems including Apple Silicon Macs and standard x86 servers.

## Running in inspect mode

The server can also be run in inspect mode, which provides additional debugging information:

```bash
pnpm inspector
```

This will run MCP's inspector, which allows you to execute and debug calls to the server.

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see the [LICENSE](LICENSE) file for details

## Support

- Documentation: [docs.glean.com](https://docs.glean.com)
- Issues: [GitHub Issues](https://github.com/aaronsb/glean-mcp-server/issues)
- Email: [support@glean.com](mailto:support@glean.com)
