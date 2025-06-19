# @gleanwork/configure-mcp-server

![MCP Server](https://badge.mcpx.dev?type=server 'MCP Server')
![CI Build](https://github.com/gleanwork/mcp-server/actions/workflows/ci.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@gleanwork%2Fconfigure-mcp-server.svg)](https://badge.fury.io/js/@gleanwork%2Fconfigure-mcp-server)
[![License](https://img.shields.io/npm/l/@gleanwork%2Fmcp-server.svg)](https://github.com/gleanwork/mcp-server/blob/main/LICENSE)

This package is for configuring popular MCP clients to connect to Glean's API using [@gleanwork/local-mcp-server](https://github.com/gleanwork/mcp-server/tree/main/packages/local-mcp-server).

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

You can specify your token and instance on the command line.

```bash
# Configure for Cursor
npx @gleanwork/configure-mcp-server --client cursor --token your_api_token --instance instance_name

# Configure for Claude Desktop
npx @gleanwork/configure-mcp-server --client claude --token your_api_token --instance instance_name

# Configure for VS Code
npx @gleanwork/configure-mcp-server --client vscode --token your_api_token --instance instance_name

# Configure for Windsurf
npx @gleanwork/configure-mcp-server --client windsurf --token your_api_token --instance instance_name

# Configure for Goose
npx @gleanwork/configure-mcp-server --client goose --token your_api_token --instance instance_name
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
- For Goose: Restart Goose to load the new configuration

## Contributing

Please see [CONTRIBUTING.md](https://github.com/gleanwork/mcp-server/blob/main/CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see the [LICENSE](LICENSE) file for details

## Support

- Documentation: [docs.glean.com](https://docs.glean.com)
- Issues: [GitHub Issues](https://github.com/gleanwork/mcp-server/issues)
- Email: [support@glean.com](mailto:support@glean.com)

