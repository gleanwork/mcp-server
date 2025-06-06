# Contributing to @gleanwork/mcp-server

Thank you for your interest in contributing to the Glean MCP Server! This document provides guidelines and instructions for development.

## Development Setup

1. Clone the repository:

```bash
git clone https://github.com/gleanwork/mcp-server.git
cd mcp-server
```

1. Ensure `node` and `pnpm` are installed. This project has a built-in
   [mise](http://mise.jdx.dev/) config file that you can use if you'd like
(though it is not required):

```
mise trust
mise install
```

1. Install dependencies:

```bash
pnpm install
```

1. Build the project:

```bash
pnpm run build
```

1. Run tests:

```bash
pnpm test
```

## Repo Organization

The repository is structured as a monorepo with the following packages:

- `@gleanwork/configure-mcp-server` a tool for configuring popular MCP clients to use Glean.
- `@gleanwork/local-mcp-server` the stdio MCP server that exposes Glean APIs to local assistants.
- `@gleanwork/mcp-server-utils` a collection of utilities used by both the configure tool and local mcp server.

## Running the Server Locally

The server communicates via stdio, making it ideal for integration with AI models and other tools:

```bash
node packages/local-server/build/index.js
```

Input and output follow the JSON-RPC 2.0 protocol, with each message on a new line.

## Making Changes

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## Code Style

- Use TypeScript for all new code
- Follow the existing code style (enforced by ESLint and Prettier)
- Include JSDoc comments for public APIs
- Write tests for new functionality

## Testing

- Add unit tests for new features
- Ensure all tests pass before submitting a pull request
- Use the provided test utilities and fixtures

## Documentation

- Update documentation for any changed functionality
- Include examples for new features
- Keep the README.md and API documentation up to date

## Need Help?

- Documentation: [docs.glean.com](https://docs.glean.com)
- Issues: [GitHub Issues](https://github.com/gleanwork/mcp-server/issues)
- Email: [support@glean.com](mailto:support@glean.com)
