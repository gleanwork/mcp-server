/**
 * @fileoverview Glean Model Context Protocol (MCP) Server Implementation
 *
 * This server implements the Model Context Protocol, providing a standardized interface
 * for AI models to interact with Glean's capabilities. It uses stdio
 * for communication and implements the MCP specification for tool discovery and execution.
 *
 * The server exposes four tools:
 * 1. company_search - Search across Glean's indexed content
 * 2. people_profile_search - Search for people profiles inside the company
 * 3. chat - Converse with Glean's AI assistant
 * 4. read_documents - Retrieve documents by ID or URL
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as search from './tools/search.js';
import * as chat from './tools/chat.js';
import * as peopleProfileSearch from './tools/people_profile_search.js';
import * as readDocuments from './tools/read_documents.js';
import {
  formatGleanError,
  isGleanError,
} from '@gleanwork/mcp-server-utils/errors';
import { VERSION } from './common/version.js';

export const TOOL_NAMES = {
  companySearch: 'company_search',
  peopleProfileSearch: 'people_profile_search',
  chat: 'chat',
  readDocuments: 'read_documents',
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
        inputSchema: z.toJSONSchema(search.ToolSearchSchema),
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
        inputSchema: z.toJSONSchema(chat.ToolChatSchema),
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
        inputSchema: z.toJSONSchema(peopleProfileSearch.ToolPeopleProfileSearchSchema),
      },
      {
        name: TOOL_NAMES.readDocuments,
        description: `Read documents from Glean by ID or URL

        Example request:

        "documentSpecs": [
            {
                "id": "doc-123",
            },
            {
                "url": "https://example.com/doc2"
            }
          ]
        `,
        inputSchema: z.toJSONSchema(readDocuments.ToolReadDocumentsSchema),
      },
    ],
  };
}

/**
 * Executes a tool based on the MCP callTool request.
 */
export async function callToolHandler(
  request: CallToolRequest,
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

      case TOOL_NAMES.readDocuments: {
        const args = readDocuments.ToolReadDocumentsSchema.parse(
          request.params.arguments,
        );
        const result = await readDocuments.readDocuments(args);
        const formattedResults = readDocuments.formatResponse(result);

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
      const errorDetails = error.issues
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
 * Initializes and starts the MCP server using stdio transport.
 * This is the main entry point for the server process.
 *
 * @async
 * @param {Object} options - Options for server initialization
 * @param {string} [options.instance] - The Glean instance name from the command line
 * @param {string} [options.token] - The Glean API token from the command line
 * @throws {Error} If server initialization or connection fails
 */
export async function runServer(options?: {
  instance?: string;
  token?: string;
}) {
  // Set environment variables from command line args if provided
  if (options?.instance) {
    process.env.GLEAN_INSTANCE = options.instance;
  }

  if (options?.token) {
    process.env.GLEAN_API_TOKEN = options.token;
  }

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
