# Troubleshooting

This guide helps you diagnose and resolve common issues with the Glean MCP Server.

## Docker image pull fails with `denied` / `403 Forbidden`

If `docker pull ghcr.io/gleanwork/local-mcp-server:latest` fails with a permissions error:

1. Authenticate to GitHub Container Registry:

```bash
# Token must include read:packages
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin
```

2. Retry the pull:

```bash
docker pull ghcr.io/gleanwork/local-mcp-server:latest
```

3. If the image was just published, wait a few minutes for GHCR propagation and retry.

4. If access is still blocked, build from source as a fallback:

```bash
docker build -t glean/local-mcp-server:local .
```

5. If the issue persists, open a GitHub issue and include:

- the exact `docker pull` command
- the full error output
