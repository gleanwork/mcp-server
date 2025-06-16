import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchResponse } from '@gleanwork/api-client/models/components';
import { ToolSearchSchema, search } from '../../tools/search.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import '@gleanwork/mcp-test-utils/mocks/setup';

describe('Search Tool', () => {
  beforeEach(() => {
    // delete BASE_URL because it takes precedence over INSTANCE
    delete process.env.GLEAN_BASE_URL;
    process.env.GLEAN_INSTANCE = 'test';
    process.env.GLEAN_API_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.GLEAN_INSTANCE;
    delete process.env.GLEAN_API_TOKEN;
  });

  describe('JSON Schema Generation', () => {
    it('generates correct JSON schema', () => {
      expect(zodToJsonSchema(ToolSearchSchema, 'GleanSearch'))
        .toMatchInlineSnapshot(`
          {
            "$ref": "#/definitions/GleanSearch",
            "$schema": "http://json-schema.org/draft-07/schema#",
            "definitions": {
              "GleanSearch": {
                "additionalProperties": false,
                "properties": {
                  "datasources": {
                    "description": "Optional list of data sources to search in. Examples: "github", "gdrive", "confluence", "jira".",
                    "items": {
                      "type": "string",
                    },
                    "type": "array",
                  },
                  "query": {
                    "description": "The search query. This is what you want to search for.",
                    "type": "string",
                  },
                },
                "required": [
                  "query",
                ],
                "type": "object",
              },
            },
          }
        `);
    });
  });

  describe('Schema Validation', () => {
    it('should validate a valid search request', () => {
      const validRequest = {
        query: 'test query',
      };

      const result = ToolSearchSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate with datasources', () => {
      const validRequest = {
        query: 'test query',
        datasources: ['github', 'drive'],
      };

      const result = ToolSearchSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid types', () => {
      const invalidRequest = {
        query: 123, // Should be string
        datasources: 'github', // Should be an array
      };

      const result = ToolSearchSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool Implementation', () => {
    it('should call Glean client with validated params', async () => {
      const params = {
        query: 'test query',
      };

      const response = await search(params);
      const typedResponse = response as SearchResponse;

      expect(typedResponse).toHaveProperty('results');
      expect(typedResponse.results).toBeInstanceOf(Array);
      expect(typedResponse).toHaveProperty('trackingToken');
      expect(typedResponse).toHaveProperty('sessionInfo');
    });
  });
});
