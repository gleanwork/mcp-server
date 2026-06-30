# @gleanwork/mcp-server-utils

> [!IMPORTANT]
> This package is deprecated / no longer maintained in this repository.
>
> Do not use `@gleanwork/mcp-server-utils` for new MCP-related work. It exists only as part of the historical local MCP server implementation in the archived `gleanwork/mcp-server` repository.

## What to use instead

Use the managed Glean MCP server built into your Glean instance for supported MCP host integrations:

- [Using the Glean MCP Server](https://docs.glean.com/user-guide/mcp/usage) — end-user setup for supported MCP hosts.
- [Set up Glean MCP server](https://docs.glean.com/administration/platform/mcp/enable-mcp-servers) — admin setup and enablement.
- [About Glean MCP server](https://docs.glean.com/administration/platform/mcp/about) — overview of Glean’s managed MCP server.

For local command-line workflows, use [Glean CLI](https://github.com/gleanwork/glean-cli).

## Package status

`@gleanwork/mcp-server-utils` contains shared utilities that were used by the historical local MCP server packages in this repository. No new feature work or bug fixes are planned for this package here.

This README documents the package’s archival status. npm package deprecation is intentionally handled separately from this documentation update.

## Historical note

This utility package was part of the local stdio-based MCP server monorepo. That local implementation was useful before Glean’s managed remote MCP server was available. The managed server is now the supported path and provides centralized enablement, OAuth-based setup, and a better long-term support model.

## Historical reference only

Usage and development guidance have intentionally been removed from this README so new users are not directed toward an unsupported setup. If you need to understand the old implementation or recover old setup details, inspect the repository history.

## License

MIT License — see the repository [LICENSE](../../LICENSE) file for details.
