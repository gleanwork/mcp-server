import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ToolEscalationsGetSchema,
  escalationsGet,
  formatResponse,
} from '../../tools/escalations.js';
import { z } from 'zod';
import '@gleanwork/mcp-test-utils/mocks/setup';

describe('Escalations Get Tool', () => {
  beforeEach(() => {
    delete process.env.GLEAN_URL;
    process.env.GLEAN_INSTANCE = 'test';
    process.env.GLEAN_API_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.GLEAN_INSTANCE;
    delete process.env.GLEAN_API_TOKEN;
  });

  describe('JSON Schema Generation', () => {
    it('generates correct JSON schema', () => {
      expect(z.toJSONSchema(ToolEscalationsGetSchema)).toMatchInlineSnapshot(`
        {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "additionalProperties": false,
          "properties": {
            "limit": {
              "description": "Maximum number of escalations to return (1-100, default 50).",
              "maximum": 100,
              "minimum": 1,
              "type": "integer",
            },
            "offset": {
              "description": "Number of results to skip for pagination (default 0).",
              "maximum": 9007199254740991,
              "minimum": 0,
              "type": "integer",
            },
            "query": {
              "description": "Optional search query to filter escalations.",
              "type": "string",
            },
          },
          "type": "object",
        }
      `);
    });
  });

  describe('Schema Validation', () => {
    it('accepts empty params with defaults', () => {
      const result = ToolEscalationsGetSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts a query', () => {
      const result = ToolEscalationsGetSchema.safeParse({
        query: 'auth outage',
      });
      expect(result.success).toBe(true);
    });

    it('accepts limit and offset', () => {
      const result = ToolEscalationsGetSchema.safeParse({
        limit: 10,
        offset: 20,
      });
      expect(result.success).toBe(true);
    });

    it('rejects limit above max', () => {
      const result = ToolEscalationsGetSchema.safeParse({ limit: 200 });
      expect(result.success).toBe(false);
    });

    it('rejects negative offset', () => {
      const result = ToolEscalationsGetSchema.safeParse({ offset: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer limit', () => {
      const result = ToolEscalationsGetSchema.safeParse({ limit: 10.5 });
      expect(result.success).toBe(false);
    });
  });

  describe('Tool Implementation', () => {
    it('returns escalations with default pagination', async () => {
      const response = (await escalationsGet({})) as any;

      expect(response.results).toBeInstanceOf(Array);
      expect(response.results.length).toBe(3);
      expect(response.totalCount).toBe(3);
      expect(response.hasMoreResults).toBe(false);
    });

    it('filters by query', async () => {
      const response = (await escalationsGet({ query: 'auth' })) as any;

      expect(response.results).toBeInstanceOf(Array);
      expect(response.results.length).toBe(1);
      expect(response.results[0].title).toContain('Auth');
    });

    it('paginates with limit and offset', async () => {
      const response = (await escalationsGet({
        limit: 1,
        offset: 1,
      })) as any;

      expect(response.results.length).toBe(1);
      expect(response.results[0].id).toBe('esc-002');
      expect(response.hasMoreResults).toBe(true);
    });
  });

  describe('formatResponse', () => {
    it('formats empty results', () => {
      expect(formatResponse({ results: [] })).toMatchInlineSnapshot(
        `"No escalations found."`,
      );
    });

    it('formats null response', () => {
      expect(formatResponse(null)).toMatchInlineSnapshot(
        `"No escalations found."`,
      );
    });

    it('formats escalation results', () => {
      const response = {
        results: [
          {
            title: 'Test escalation',
            status: 'OPEN',
            priority: 'P1',
            createdAt: '2026-04-20T08:30:00Z',
            assignee: { name: 'Alice', email: 'alice@example.com' },
            description: 'Something is broken.',
            url: 'https://example.com/esc/1',
          },
        ],
        totalCount: 1,
        hasMoreResults: false,
      };

      expect(formatResponse(response)).toMatchInlineSnapshot(`
        "Found 1 escalation:

        [1] Test escalation
          Status: OPEN | Priority: P1
          Assignee: Alice | Created: 4/20/2026
          Something is broken.
          URL: https://example.com/esc/1"
      `);
    });

    it('indicates when more results are available', () => {
      const response = {
        results: [
          {
            title: 'Escalation A',
            status: 'OPEN',
            priority: 'P2',
          },
        ],
        totalCount: 50,
        hasMoreResults: true,
      };

      const result = formatResponse(response);
      expect(result).toContain('more results available');
      expect(result).toContain('increase offset to paginate');
    });

    it('truncates long descriptions', () => {
      const response = {
        results: [
          {
            title: 'Verbose escalation',
            status: 'OPEN',
            priority: 'P1',
            description: 'A'.repeat(300),
          },
        ],
        totalCount: 1,
        hasMoreResults: false,
      };

      const result = formatResponse(response);
      expect(result).toContain('...');
    });
  });
});
