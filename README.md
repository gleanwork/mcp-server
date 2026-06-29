# Glean Local MCP Server Monorepo

> [!IMPORTANT]
> This repository is archived / no longer maintained.
>
> Do not use this repository for new MCP setups. It predates Glean’s managed remote MCP server and is no longer the supported path for connecting MCP-compatible hosts to Glean.

## What to use instead

Use the managed Glean MCP server built into your Glean instance:

- [Using the Glean MCP Server](https://docs.glean.com/user-guide/mcp/usage) — end-user setup for supported MCP hosts.
- [Set up Glean MCP server](https://docs.glean.com/administration/platform/mcp/enable-mcp-servers) — admin setup and enablement.
- [About Glean MCP server](https://docs.glean.com/administration/platform/mcp/about) — overview of Glean’s managed MCP server.

For local command-line workflows, use [Glean CLI](https://github.com/gleanwork/glean-cli) instead of this local MCP server.

## Repository status

This repository is retained for historical reference only. Issues and pull requests have been closed as part of archival cleanup, and no new feature work or bug fixes are planned here.

The local packages in this repository should not be used for new installations. Published user-facing local MCP packages are being retired in favor of the managed Glean MCP server.

## What this repository used to contain

This monorepo previously contained packages for running and supporting a local stdio-based MCP server for Glean:

- `@gleanwork/local-mcp-server` — a local MCP server that exposed Glean Search, Chat, People Search, and document-reading tools.
- `@gleanwork/mcp-server-utils` — shared utilities used by the local MCP server packages.

These packages predate the managed remote MCP server and are no longer the recommended or supported MCP integration path.

## Historical reference

Existing install, Docker, and client-configuration instructions have intentionally been removed from the main documentation so new users are not directed toward an unsupported setup. If you need to understand the old implementation, inspect the repository history.

## License

MIT License — see the [LICENSE](LICENSE) file for details.
