# @gleanwork/mcp-server

![MCP Server](https://badge.mcpx.dev?type=server 'MCP Server')
![CI Build](https://github.com/gleanwork/mcp-server/actions/workflows/ci.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@gleanwork%2Fmcp-server.svg)](https://badge.fury.io/js/@gleanwork%2Fmcp-server)
[![License](https://img.shields.io/npm/l/@gleanwork%2Fmcp-server.svg)](https://github.com/gleanwork/mcp-server/blob/main/LICENSE)

The Glean MCP Server is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server that provides seamless integration with Glean's enterprise knowledge.

## Features

- **Company Search**: Access Glean's powerful content search capabilities
- **People Profile Search**: Access Glean's people directory
- **Chat**: Interact with Glean's AI assistant
- **MCP Compliant**: Implements the Model Context Protocol specification

## Tools

- ### company_search

  Search Glean's content index using the Glean Search API. This tool allows you to query Glean's content index with various filtering and configuration options.

- ### chat

  Interact with Glean's AI assistant using the Glean Chat API. This tool allows you to have conversational interactions with Glean's AI, including support for message history, citations, and various configuration options.

- ### people_profile_search

  Search Glean's People directory to find employee information.

## Configuration

### API Tokens

You'll need Glean [API credentials](https://developers.glean.com/client/authentication#glean-issued-tokens), and specifically a [user-scoped API token](https://developers.glean.com/client/authentication#user). API Tokens require the following scopes: `chat`, `search`. You should speak to your Glean administrator to provision these tokens.

### Configure Environment Variables

1. Set up your Glean API credentials:

   ```bash
   export GLEAN_INSTANCE=instance_name
   export GLEAN_API_TOKEN=your_api_token
   ```

   Note: For backward compatibility, `GLEAN_SUBDOMAIN` is still supported, but `GLEAN_INSTANCE` is preferred.

1. (Optional) For [global tokens](https://developers.glean.com/indexing/authentication/permissions#global-tokens) that support impersonation:

   ```bash
   export GLEAN_ACT_AS=user@example.com
   ```

## Client Configuration

You can use the built-in configuration tool to automatically set up Glean for your MCP client:

```bash
# Configure for Cursor
npx @gleanwork/configure-mcp-server --client cursor --token your_api_token --instance instance_name

# Configure for Claude Desktop
npx @gleanwork/configure-mcp-server --client claude --token your_api_token --instance instance_name

# Configure for VS Code
npx @gleanwork/configure-mcp-server --client vscode --token your_api_token --instance instance_name

# Configure for Windsurf
npx @gleanwork/configure-mcp-server --client windsurf --token your_api_token --instance instance_name
```

Alternatively, you can use an environment file:

```bash
npx @gleanwork/configure-mcp-server --client cursor --env path/to/.env.glean
```

The environment file should contain:

```bash
GLEAN_INSTANCE=instance_name
GLEAN_API_TOKEN=your_api_token
```

After configuration:

- For Cursor: Restart Cursor and the agent will have access to Glean tools
- For Claude Desktop: Restart Claude and use the hammer icon to access Glean tools
- For Windsurf: Open Settings > Advanced Settings, scroll to Cascade section, and press refresh

## MCP Client Configuration

To configure this MCP server in your MCP client (such as Claude Desktop, Windsurf, Cursor, etc.), add the following configuration to your MCP client settings:

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

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see the [LICENSE](LICENSE) file for details

## Support

- Documentation: [docs.glean.com](https://docs.glean.com)
- Issues: [GitHub Issues](https://github.com/gleanwork/mcp-server/issues)
- Email: [support@glean.com](mailto:support@glean.com)
