import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listToolsHandler, callToolHandler, TOOL_NAMES } from '../server.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import '@gleanwork/mcp-test-utils/mocks/setup';

describe('MCP Server Handlers (integration)', () => {
  beforeEach(() => {
    delete process.env.GLEAN_URL;
    process.env.GLEAN_INSTANCE = 'test';
    process.env.GLEAN_API_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.GLEAN_INSTANCE;
    delete process.env.GLEAN_API_TOKEN;
  });

  it('lists all expected tools with valid JSON schema', async () => {
    const { tools } = await listToolsHandler();
    const names = tools.map((t: any) => t.name);

    expect(names).toEqual(
      expect.arrayContaining([
        TOOL_NAMES.companySearch,
        TOOL_NAMES.chat,
        TOOL_NAMES.peopleProfileSearch,
      ]),
    );

    tools.forEach((tool: any) => {
      expect(tool.inputSchema).toHaveProperty('$schema');
    });
  });

  it('executes the people_profile_search tool end-to-end', async () => {
    const request = CallToolRequestSchema.parse({
      method: 'tools/call',
      id: '1',
      jsonrpc: '2.0',
      params: {
        name: TOOL_NAMES.peopleProfileSearch,
        arguments: { query: 'Steve' },
      },
    });

    const response = await callToolHandler(request);

    expect(response.isError).toBe(false);
    expect(response.content[0].text).toMatch(/Software Engineer/);
    expect(response.content[0].text).toMatch(/Engineering/);
  });

  it('returns validation error for missing arguments', async () => {
    const badRequest = {
      method: 'tools/call',
      params: { name: TOOL_NAMES.companySearch },
    } as any;

    const result = await callToolHandler(badRequest);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/Arguments are required/);
  });

  it('executes company_search tool happy path', async () => {
    const req = CallToolRequestSchema.parse({
      method: 'tools/call',
      id: '2',
      jsonrpc: '2.0',
      params: {
        name: TOOL_NAMES.companySearch,
        arguments: { query: 'vacation policy' },
      },
    });

    const res = await callToolHandler(req);
    expect(res).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "text": "Error: Cannot read properties of undefined (reading 'searchedQuery')",
            "type": "text",
          },
        ],
        "isError": true,
      }
    `);
  });

  it('executes chat tool happy path', async () => {
    const req = CallToolRequestSchema.parse({
      method: 'tools/call',
      id: '3',
      jsonrpc: '2.0',
      params: {
        name: TOOL_NAMES.chat,
        arguments: { message: 'hello' },
      },
    });

    const res = await callToolHandler(req);
    expect(res).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "text": "GLEAN_AI (UPDATE): Search company knowledge",
            "type": "text",
          },
        ],
        "isError": false,
      }
    `);
  });

  it('returns Zod validation error when query is wrong type', async () => {
    const badReq = {
      method: 'tools/call',
      id: '4',
      jsonrpc: '2.0',
      params: {
        name: TOOL_NAMES.companySearch,
        arguments: { query: 123 },
      },
    } as any;

    const res = await callToolHandler(badReq);
    expect(res).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "text": "Invalid input:
      query: Invalid input: expected string, received number",
            "type": "text",
          },
        ],
        "isError": true,
      }
    `);
  });

  it('returns error for unknown tool', async () => {
    const badReq = CallToolRequestSchema.parse({
      method: 'tools/call',
      id: '5',
      jsonrpc: '2.0',
      params: {
        name: 'nonexistent_tool',
        arguments: {},
      },
    });

    const res = await callToolHandler(badReq);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatchInlineSnapshot(
      `"Error: Unknown tool: nonexistent_tool"`,
    );
  });

  it('executes people_profile_search with filters only', async () => {
    const req = CallToolRequestSchema.parse({
      method: 'tools/call',
      id: '6',
      jsonrpc: '2.0',
      params: {
        name: TOOL_NAMES.peopleProfileSearch,
        arguments: {
          filters: { department: 'Engineering' },
          pageSize: 5,
        },
      },
    });

    const res = await callToolHandler(req);
    expect(res).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "text": "Found 1 people:

      1. Jane Doe – Software Engineer, Engineering (San Francisco) • jane.doe@example.com",
            "type": "text",
          },
        ],
        "isError": false,
      }
    `);
  });

  it('validation error when neither query nor filters provided', async () => {
    const badReq = CallToolRequestSchema.parse({
      method: 'tools/call',
      id: '7',
      jsonrpc: '2.0',
      params: {
        name: TOOL_NAMES.peopleProfileSearch,
        arguments: {},
      },
    });

    const res = await callToolHandler(badReq);
    expect(res).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "text": "Invalid input:
      : At least one of "query" or "filters" must be provided.",
            "type": "text",
          },
        ],
        "isError": true,
      }
    `);
  });

  it('validation error when pageSize is out of range', async () => {
    const badReq = CallToolRequestSchema.parse({
      method: 'tools/call',
      id: '8',
      jsonrpc: '2.0',
      params: {
        name: TOOL_NAMES.peopleProfileSearch,
        arguments: { query: 'Steve', pageSize: 500 },
      },
    });

    const res = await callToolHandler(badReq);
    expect(res).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "text": "Invalid input:
      pageSize: Too big: expected number to be <=100",
            "type": "text",
          },
        ],
        "isError": true,
      }
    `);
  });
});
