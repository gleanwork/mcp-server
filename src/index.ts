#!/usr/bin/env node
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
 *
 * @module @gleanwork/mcp-server
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
import * as workflow from './tools/workflow.js';
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

const TOOL_NAMES = {
  search: 'glean_search',
  chat: 'glean_chat',
  callAgent: 'glean_call_agent',
  getAgents: 'glean_get_agents',
  getAgent: 'glean_get_agent',
};

/**
 * MCP server instance configured for Glean's implementation.
 * Supports tool discovery and execution through the MCP protocol.
 */
const server = new Server(
  {
    name: 'Glean Tools MCP',
    version: '0.0.1',
  },
  { capabilities: { tools: {} } },
);

/**
 * Handles tool discovery requests by providing a list of available tools.
 * Each tool includes its name, description, and input schema in JSON Schema format.
 *
 * @returns {Promise<{tools: Array<{name: string, description: string, inputSchema: object}>}>}
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: TOOL_NAMES.search,
        description: 'Search Glean Enterprise Knowledge',
        inputSchema: zodToJsonSchema(search.SearchSchema),
      },
      {
        name: TOOL_NAMES.chat,
        description: "Chat with Glean Assistant using Glean's RAG",
        inputSchema: zodToJsonSchema(chat.ChatSchema),
      },
      {
        name: TOOL_NAMES.callAgent,
        description: "Run a Glean Workflow with custom input fields",
        inputSchema: zodToJsonSchema(workflow.RunWorkflowSchema),
      },
      {
        name: TOOL_NAMES.getAgents,
        description: "List all available Glean Agents",
        inputSchema: zodToJsonSchema(workflow.ListWorkflowsSchema),
      },
      {
        name: TOOL_NAMES.getAgent,
        description: "Get details of a specific Glean Agent by ID",
        inputSchema: zodToJsonSchema(workflow.GetWorkflowSchema),
      },
    ],
  };
});

/**
 * Handles tool execution requests by validating input and dispatching to the appropriate tool.
 * Supports the following tools:
 * - search: Executes a search query against Glean's index
 * - chat: Initiates or continues a conversation with Glean's AI
 *
 * @param {object} request - The tool execution request
 * @param {string} request.params.name - The name of the tool to execute
 * @param {object} request.params.arguments - The arguments to pass to the tool
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 * @throws {Error} If arguments are missing, tool is unknown, or validation fails
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error('Arguments are required');
    }

    switch (request.params.name) {
      case TOOL_NAMES.search: {
        const args = search.SearchSchema.parse(request.params.arguments);
        const result = await search.search(args);
        const formattedResults = search.formatResponse(result);

        return {
          content: [{ type: 'text', text: formattedResults }],
          isError: false,
        };
      }

      case TOOL_NAMES.chat: {
        const args = chat.ChatSchema.parse(request.params.arguments);
        const response = await chat.chat(args);
        const formattedResponse = chat.formatResponse(response);

        return {
          content: [{ type: 'text', text: formattedResponse }],
          isError: false,
        };
      }

      case TOOL_NAMES.callAgent: {
        const args = workflow.RunWorkflowSchema.parse(request.params.arguments);
        const response = await workflow.runWorkflow(args);
        const formattedResponse = workflow.formatResponse(response);

        return {
          content: [{ type: 'text', text: formattedResponse }],
          isError: false,
        };
      }

      case TOOL_NAMES.getAgents: {
        const args = workflow.ListWorkflowsSchema.parse({"namespaces":["PROMPT_TEMPLATE","STATIC_WORKFLOW","AGENT"]});
        const response = await workflow.listWorkflows(args);
        const formattedResponse = workflow.formatListWorkflowsResponse(response);

        return {
          content: [{ type: 'text', text: formattedResponse }],
          isError: false,
        };
      }

      case TOOL_NAMES.getAgent: {
        const args = workflow.GetWorkflowSchema.parse(request.params.arguments);
        const response = await workflow.getWorkflow(args);
        const formattedResponse = workflow.formatGetWorkflowResponse(response);

        return {
          content: [{ type: 'text', text: formattedResponse }],
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
});

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
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Glean MCP Server running on stdio');
}

/**
 * Bootstrap the server and handle any fatal errors.
 * Exits the process with code 1 if an unrecoverable error occurs.
 */
runServer().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
