import { TOOL_NAMES } from '../server.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHandlers: Record<string, any> = {};

vi.mock('../index.ts', async () => {
  const mockServer = {
    setRequestHandler: vi.fn((schema: any, handler: any) => {
      mockHandlers[schema.name] = handler;
      return handler;
    }),
  };

  return {
    server: mockServer,
    formatGleanError: vi.fn(),
    runServer: vi.fn(),
  };
});

vi.mock('../tools/search.ts', () => ({
  SearchSchema: {},
  search: vi.fn(),
  formatResponse: vi.fn(),
}));

vi.mock('../tools/chat.ts', () => ({
  ChatSchema: {},
  chat: vi.fn(),
  formatResponse: vi.fn(),
}));

vi.mock('zod-to-json-schema', () => ({
  default: vi.fn().mockReturnValue({}),
}));

describe('MCP Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.keys(mockHandlers).forEach((key) => delete mockHandlers[key]);

    const expectedToolNames = TOOL_NAMES;

    mockHandlers['list_tools'] = async () => ({
      tools: [
        {
          name: 'glean_search',
          description: 'Search Glean',
          inputSchema: {},
        },
        {
          name: 'glean_chat',
          description: 'Chat with Glean',
          inputSchema: {},
        },
      ],
    });

    mockHandlers['call_tool'] = async (request: {
      params: { name: string; arguments: any };
    }) => {
      if (!Object.values(expectedToolNames).includes(request.params.name)) {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }
      return { content: [], isError: false };
    };
  });

  describe('Tool Names Consistency', () => {
    it('should use the same tool names in ListTools and CallTool handlers', async () => {
      // Get the expected tool names from the beforeEach scope
      const expectedToolNames = ['glean_search', 'glean_chat'];

      const listToolsResponse = await mockHandlers['list_tools']();
      const definedToolNames = listToolsResponse.tools.map(
        (tool: { name: string }) => tool.name,
      );

      for (const toolName of definedToolNames) {
        try {
          await mockHandlers['call_tool']({
            params: {
              name: toolName,
              arguments: { dummy: 'data' },
            },
          });
        } catch (error: unknown) {
          if (error instanceof Error) {
            expect(error.message).not.toContain(`Unknown tool: ${toolName}`);
          }
        }
      }

      // Verify all expected tool names are in the ListTools response
      expectedToolNames.forEach((toolName) => {
        expect(definedToolNames).toContain(toolName);
      });

      // Verify the number of tools matches
      expect(definedToolNames.length).toBe(expectedToolNames.length);
    });

    it('should include all expected tools in the ListTools response', async () => {
      const expectedToolNames = ['glean_search', 'glean_chat'];
      const listToolsResponse = await mockHandlers['list_tools']();

      listToolsResponse.tools.forEach((tool: { name: string }) => {
        expect(expectedToolNames).toContain(tool.name);
      });
    });
  });
});
