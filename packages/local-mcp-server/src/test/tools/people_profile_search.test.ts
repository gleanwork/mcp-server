import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ToolPeopleProfileSearchSchema,
  peopleProfileSearch,
} from '../../tools/people_profile_search';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ListEntitiesResponse } from '@gleanwork/api-client/models/components';
import '@gleanwork/mcp-test-utils/mocks/setup';

describe('People Profile Search Tool', () => {
  beforeEach(() => {
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
      expect(
        zodToJsonSchema(ToolPeopleProfileSearchSchema, 'PeopleProfileSearch'),
      ).toMatchInlineSnapshot(`
        {
          "$ref": "#/definitions/PeopleProfileSearch",
          "$schema": "http://json-schema.org/draft-07/schema#",
          "definitions": {
            "PeopleProfileSearch": {
              "additionalProperties": false,
              "properties": {
                "filters": {
                  "additionalProperties": {
                    "type": "string",
                  },
                  "description": "Allowed facet fields: email, first_name, last_name, manager_email, department, title, location, city, country, state, region, business_unit, team, team_id, nickname, preferred_name, roletype, reportsto, startafter, startbefore, industry, has, from. Provide as { "facet": "value" }.",
                  "propertyNames": {
                    "enum": [
                      "email",
                      "first_name",
                      "last_name",
                      "manager_email",
                      "department",
                      "title",
                      "location",
                      "city",
                      "country",
                      "state",
                      "region",
                      "business_unit",
                      "team",
                      "team_id",
                      "nickname",
                      "preferred_name",
                      "roletype",
                      "reportsto",
                      "startafter",
                      "startbefore",
                      "industry",
                      "has",
                      "from",
                    ],
                  },
                  "type": "object",
                },
                "pageSize": {
                  "description": "Hint to the server for how many people to return (1-100, default 10).",
                  "maximum": 100,
                  "minimum": 1,
                  "type": "integer",
                },
                "query": {
                  "description": "Free-text query to search people by name, title, etc.",
                  "type": "string",
                },
              },
              "type": "object",
            },
          },
        }
      `);
    });
  });

  describe('Schema Validation', () => {
    it('validates query only', () => {
      const result = ToolPeopleProfileSearchSchema.safeParse({ query: 'Jane' });
      expect(result.success).toBe(true);
    });

    it('validates filters only', () => {
      const result = ToolPeopleProfileSearchSchema.safeParse({
        filters: { department: 'Engineering' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty request', () => {
      const result = ToolPeopleProfileSearchSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('Tool Implementation', () => {
    it('calls Glean client and returns results', async () => {
      const response = await peopleProfileSearch({ query: 'Jane' });
      const typedResponse = response as ListEntitiesResponse;

      expect(typedResponse.results).toBeInstanceOf(Array);
    });
  });
});
