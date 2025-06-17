# @gleanwork/local-mcp-server

![MCP Server](https://badge.mcpx.dev?type=server 'MCP Server')
![CI Build](https://github.com/gleanwork/mcp-server/actions/workflows/ci.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@gleanwork%2Flocal-mcp-server.svg)](https://badge.fury.io/js/@gleanwork%2Flocal-mcp-server)
[![License](https://img.shields.io/npm/l/@gleanwork%2Fmcp-server.svg)](https://github.com/gleanwork/mcp-server/blob/main/LICENSE)

The Glean MCP Server is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server that provides seamless integration with Glean's enterprise knowledge.

## Features

- **Company Search**: Access Glean's powerful content search capabilities
- **People Profile Search**: Access Glean's people directory
- **Chat**: Interact with Glean's AI assistant
- **Read Documents**: Retrieve documents from Glean by ID or URL
- **MCP Compliant**: Implements the Model Context Protocol specification

## Tools

- ### company_search

  Search Glean's content index using the Glean Search API. This tool allows you to query Glean's content index with various filtering and configuration options.

- ### chat

  Interact with Glean's AI assistant using the Glean Chat API. This tool allows you to have conversational interactions with Glean's AI, including support for message history, citations, and various configuration options.

- ### people_profile_search

  Search Glean's People directory to find employee information.

- ### read_documents

  Read documents from Glean by providing document IDs or URLs. This tool allows you to retrieve the full content of specific documents for detailed analysis or reference.

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
        "GLEAN_INSTANCE": "<glean instance name>",
        "GLEAN_API_TOKEN": "<glean api token>"
      }
    }
  }
}
```

Replace the environment variable values with your actual Glean credentials.

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
- Email: [support@glean.com](mailto:support@glean.com)

