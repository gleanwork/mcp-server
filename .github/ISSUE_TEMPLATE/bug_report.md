---
name: Bug report
about: Create a report to help us improve the MCP server
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description

<!-- A clear and concise description of what the bug is -->

## Self-Service Checklist

<!-- Please complete the following checklist before submitting your issue to ensure you've done basic troubleshooting -->

- [ ] I have verified my environment variables are correctly set
  - `GLEAN_INSTANCE` is set to my Glean instance (note: `GLEAN_SUBDOMAIN` is still supported for backwards compatibility)
  - `GLEAN_API_TOKEN` is a valid, non-expired API token
  - (Optional) `GLEAN_ACT_AS` is correctly set if using impersonation
- [ ] I have tested the MCP server locally using `pnpm inspector` and confirmed the issue occurs there as well
- [ ] I have checked for similar issues in the issue tracker
- [ ] I have updated to the latest version of the MCP server

## Steps to Reproduce

<!-- Steps to reproduce the behavior -->

1.
2.
3.

## Expected Behavior

<!-- A clear and concise description of what you expected to happen -->

## Actual Behavior

<!-- What actually happened, including any error messages or logs -->

## Environment Information

- Node.js version: <!-- e.g., v18.15.0 -->
- NPM/PNPM/Yarn version: <!-- e.g., npm 9.5.0 -->
- MCP server version: <!-- e.g., 0.1.0 -->
- Operating System: <!-- e.g., macOS 13.2.1 -->
- MCP client (if applicable): <!-- e.g., Claude Desktop, Windsurf, etc. -->

## Additional Context

<!-- Add any other context about the problem here, such as screenshots or logs -->

## MCP Client Configuration

<!-- If applicable, include your MCP client configuration (with sensitive tokens redacted) -->

```json
{
  "mcpServers": {
    "glean": {
      "command": "npx",
      "args": ["-y", "@gleanwork/mcp-server"],
      "env": {
        "GLEAN_INSTANCE": "<redacted>",
        "GLEAN_API_TOKEN": "<redacted>"
      }
    }
  }
}
```
