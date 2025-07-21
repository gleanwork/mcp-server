# @gleanwork/local-mcp-server

![MCP Server](https://badge.mcpx.dev?type=server 'MCP Server')
![CI Build](https://github.com/gleanwork/mcp-server/actions/workflows/ci.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@gleanwork%2Flocal-mcp-server.svg)](https://badge.fury.io/js/@gleanwork%2Flocal-mcp-server)
[![License](https://img.shields.io/npm/l/@gleanwork%2Fmcp-server.svg)](https://github.com/gleanwork/mcp-server/blob/main/LICENSE)

The Glean MCP Server is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server that provides seamless integration with Glean's enterprise knowledge.

## Features

- **Company Search**: Access Glean's powerful content search capabilities with pagination support
- **People Profile Search**: Access Glean's people directory with pagination support
- **Chat**: Interact with Glean's AI assistant with automatic response chunking for large responses
- **Read Documents**: Retrieve documents from Glean by ID or URL
- **Pagination Support**: Handle large result sets efficiently with cursor-based pagination
- **Response Chunking**: Automatically splits large chat responses to avoid token limits
- **MCP Compliant**: Implements the Model Context Protocol specification

## Tools

- ### company_search

  Search Glean's content index using the Glean Search API. This tool allows you to query Glean's content index with various filtering and configuration options. Supports pagination through cursor parameter for handling large result sets.

- ### chat

  Interact with Glean's AI assistant using the Glean Chat API. This tool allows you to have conversational interactions with Glean's AI, including support for message history, citations, and various configuration options. Automatically chunks large responses to avoid token limits and provides continuation support.

- ### people_profile_search

  Search Glean's People directory to find employee information. Supports pagination through cursor parameter for handling large result sets.

- ### read_documents

  Read documents from Glean by providing document IDs or URLs. This tool allows you to retrieve the full content of specific documents for detailed analysis or reference.

## Pagination

For detailed information about pagination support and examples, see [Pagination Documentation](../../docs/pagination.md).

## MCP Client Configuration

To configure this MCP server in your MCP client (such as Claude Desktop, Windsurf, Cursor, etc.), run [@gleanwork/configure-mcp-server](https://github.com/gleanwork/mcp-server/tree/main/packages/configure-mcp-server) passing in your client, token and instance.

```bash
# Configure for Cursor
npx @gleanwork/configure-mcp-server --client cursor --token your_api_token --instance instance_name

# Configure for Claude Desktop
npx @gleanwork/configure-mcp-server --client claude --token your_api_token --instance instance_name
```

For more details see: [@gleanwork/configure-mcp-server](https://github.com/gleanwork/mcp-server/tree/main/packages/configure-mcp-server).

### Manual MCP Configuration

To manually configure an MCP client (such as Claude Desktop, Windsurf, Cursor, etc.), add the following configuration to your MCP client settings:

```json
{
  "mcpServers": {
    "glean": {
      "command": "npx",
      "args": ["-y", "@gleanwork/local-mcp-server"],
      "env": {
        "GLEAN_SERVER_INSTANCE": "<your server URL from Glean admin panel>",
        "GLEAN_API_TOKEN": "<glean api token>"
      }
    }
  }
}
```

Example values:
- `GLEAN_SERVER_INSTANCE`: `https://acme-corp-be.glean.com/` (copy from your Glean admin panel)
- `GLEAN_API_TOKEN`: Your API token from Glean settings

Alternative configuration (legacy - note that `-be` is automatically appended):
```json
"env": {
  "GLEAN_INSTANCE": "acme-corp",  // becomes https://acme-corp-be.glean.com/
  "GLEAN_API_TOKEN": "<glean api token>"
}
```

### Local Development

For local development, you can use a `.env` file to store your credentials:

1. Create a `.env` file in the package root:
```bash
# .env
GLEAN_SERVER_INSTANCE=https://your-company-be.glean.com/
GLEAN_API_TOKEN=your_api_token_here
```

2. Run the server locally:
```bash
npm run build
node build/index.js
```

3. For use with MCP clients during development:
```json
{
  "mcpServers": {
    "glean-dev": {
      "command": "node",
      "args": ["/path/to/packages/local-mcp-server/build/index.js"]
    }
  }
}
```

The server will automatically load environment variables from the `.env` file.

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

## Contributing

Please see [CONTRIBUTING.md](https://github.com/gleanwork/mcp-server/blob/main/CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see the [LICENSE](LICENSE) file for details

## Support

- Documentation: [docs.glean.com](https://docs.glean.com)
- Issues: [GitHub Issues](https://github.com/gleanwork/mcp-server/issues)
