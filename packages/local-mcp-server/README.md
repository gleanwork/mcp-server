# @gleanwork/local-mcp-server

> [!IMPORTANT]
> This package is deprecated / no longer maintained.
>
> Do not use `@gleanwork/local-mcp-server` for new MCP setups. It predates Glean’s managed remote MCP server and is no longer the supported path for connecting MCP-compatible hosts to Glean.

## What to use instead

Use the managed Glean MCP server built into your Glean instance:

- [Using the Glean MCP Server](https://docs.glean.com/user-guide/mcp/usage) — end-user setup for supported MCP hosts.
- [Set up Glean MCP server](https://docs.glean.com/administration/platform/mcp/enable-mcp-servers) — admin setup and enablement.
- [About Glean MCP server](https://docs.glean.com/administration/platform/mcp/about) — overview of Glean’s managed MCP server.

For local command-line workflows, use [Glean CLI](https://github.com/gleanwork/glean-cli) instead.

## Package status

`@gleanwork/local-mcp-server` is being retired in favor of the managed Glean MCP server. No new feature work or bug fixes are planned for this package.

Do not treat this package as an actively maintained MCP surface. Existing users should migrate to the managed Glean MCP server where possible.

## Historical note

This package previously implemented a local stdio-based Model Context Protocol server for Glean. It exposed tools for:

- Glean company search
- Glean Chat
- People profile search
- Document reading

That local implementation was useful before Glean’s managed remote MCP server was available. The managed server is now the supported path and provides centralized enablement, OAuth-based setup, and a better long-term support model.

## Historical reference only

Install, Docker, environment-variable, and MCP client configuration instructions have intentionally been removed from this README so new users are not directed toward an unsupported setup. If you need to understand the old implementation or recover old setup details, inspect the repository history.

## License

MIT License — see the repository [LICENSE](../../LICENSE) file for details.
