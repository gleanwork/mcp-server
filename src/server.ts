/**
 * @fileoverview Glean Model Context Protocol (MCP) Server Implementation
 *
 * This server implements the Model Context Protocol, providing a standardized interface
 * for AI models to interact with Glean's search and chat capabilities. It uses stdio
 * for communication and implements the MCP specification for tool discovery and execution.
 *
 * The server provides two main tools:
 * 1. search - Allows searching through Glean's indexed content
 * 2. chat - Enables conversation with Glean's AI assistant
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as search from './tools/search.js';
import * as chat from './tools/chat.js';
import * as peopleProfileSearch from './tools/people_profile_search.js';
import {
  isGleanError,
  GleanError,
  GleanInvalidRequestError,
  GleanAuthenticationError,
  GleanPermissionError,
  GleanRateLimitError,
  GleanRequestTimeoutError,
  GleanValidationError,
} from './common/errors.js';
import { VERSION } from './common/version.js';

export const TOOL_NAMES = {
  companySearch: 'company_search',
  peopleProfileSearch: 'people_profile_search',
  chat: 'chat',
};

/**
 * MCP server instance configured for Glean's implementation.
 * Supports tool discovery and execution through the MCP protocol.
 */
const server = new Server(
  {
    name: 'Glean Tools MCP',
    version: VERSION,
  },
  { capabilities: { tools: {} } },
);

/**
 * Returns the list of available tools with descriptions & JSON Schemas.
 */
export async function listToolsHandler() {
  return {
    tools: [
      {
        name: TOOL_NAMES.companySearch,
        description: `Find relevant company documents and data

        Example request:

        {
            "query": "What are the company holidays this year?",
            "datasources": ["drive", "confluence"]
        }
        `,
        inputSchema: zodToJsonSchema(search.ToolSearchSchema),
      },
      {
        name: TOOL_NAMES.chat,
        description: `Chat with Glean Assistant using Glean's RAG

        Example request:

        {
            "message": "What are the company holidays this year?",
            "context": [
                "Hello, I need some information about time off.",
                "I'm planning my vacation for next year."
            ]
        }
        `,
        inputSchema: zodToJsonSchema(chat.ToolChatSchema),
      },
      {
        name: TOOL_NAMES.peopleProfileSearch,
        description: `Search for people profiles in the company

        Example request:

        {
            "query": "Find people named John Doe",
            "filters": {
                "department": "Engineering",
                "city": "San Francisco"
            },
            "pageSize": 10
        }

        `,
        inputSchema: zodToJsonSchema(
          peopleProfileSearch.ToolPeopleProfileSearchSchema,
        ),
      },
    ],
  };
}

/**
 * Executes a tool based on the MCP callTool request.
 */
export async function callToolHandler(
  request: z.infer<typeof CallToolRequestSchema>,
) {
  try {
    if (!request.params.arguments) {
      throw new Error('Arguments are required');
    }

    switch (request.params.name) {
      case TOOL_NAMES.companySearch: {
        const args = search.ToolSearchSchema.parse(request.params.arguments);
        const result = await search.search(args);
        const formattedResults = search.formatResponse(result);

        return {
          content: [{ type: 'text', text: formattedResults }],
          isError: false,
        };
      }

      case TOOL_NAMES.chat: {
        const args = chat.ToolChatSchema.parse(request.params.arguments);
        const result = await chat.chat(args);
        const formattedResults = chat.formatResponse(result);

        return {
          content: [{ type: 'text', text: formattedResults }],
          isError: false,
        };
      }

      case TOOL_NAMES.peopleProfileSearch: {
        const args = peopleProfileSearch.ToolPeopleProfileSearchSchema.parse(
          request.params.arguments,
        );
        const result = await peopleProfileSearch.peopleProfileSearch(args);
        const formattedResults = peopleProfileSearch.formatResponse(result);

        return {
          content: [{ type: 'text', text: formattedResults }],
          isError: false,
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors
        .map((err) => {
          return `${err.path.join('.')}: ${err.message}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Invalid input:\n${errorDetails}`,
          },
        ],
        isError: true,
      };
    }

    if (isGleanError(error)) {
      return {
        content: [{ type: 'text', text: formatGleanError(error) }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

server.setRequestHandler(ListToolsRequestSchema, listToolsHandler);
server.setRequestHandler(CallToolRequestSchema, callToolHandler);

/**
 * Formats a GleanError into a human-readable error message.
 * This function provides detailed error messages based on the specific error type.
 *
 * @param {GleanError} error - The error to format
 * @returns {string} A formatted error message
 */
export function formatGleanError(error: GleanError): string {
  let message = `Glean API Error: ${error.message}`;

  if (error instanceof GleanInvalidRequestError) {
    message = `Invalid Request: ${error.message}`;
    if (error.response) {
      message += `\nDetails: ${JSON.stringify(error.response)}`;
    }
  } else if (error instanceof GleanAuthenticationError) {
    message = `Authentication Failed: ${error.message}`;
  } else if (error instanceof GleanPermissionError) {
    message = `Permission Denied: ${error.message}`;
  } else if (error instanceof GleanRequestTimeoutError) {
    message = `Request Timeout: ${error.message}`;
  } else if (error instanceof GleanValidationError) {
    message = `Invalid Query: ${error.message}`;
    if (error.response) {
      message += `\nDetails: ${JSON.stringify(error.response)}`;
    }
  } else if (error instanceof GleanRateLimitError) {
    message = `Rate Limit Exceeded: ${error.message}`;
    message += `\nResets at: ${error.resetAt.toISOString()}`;
  }

  return message;
}

/**
 * Initializes and starts the MCP server using stdio transport.
 * This is the main entry point for the server process.
 *
 * @async
 * @throws {Error} If server initialization or connection fails
 */
export async function runServer() {
  const transport = new StdioServerTransport();

  try {
    await server.connect(transport);
    console.error(`Glean MCP Server v${VERSION} running on stdio`);

    // Create a promise that never resolves to keep the process alive
    // This is necessary because the MCP server will handle requests
    // over the transport until terminated
    return new Promise<void>(() => {
      // The server keeps running until the process is terminated
      console.error(
        'Server is now handling requests. Press Ctrl+C to terminate.',
      );

      // Handle shutdown signals
      process.on('SIGINT', () => {
        console.error('Received SIGINT signal. Shutting down...');
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.error('Received SIGTERM signal. Shutting down...');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Error starting MCP server:', error);
    throw error; // Re-throw to allow the outer catch to handle it
  }
}
