import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChatResponse, Author } from '@gleanwork/api-client/models/components';
import { chat, ToolChatSchema } from '../../tools/chat';
import { zodToJsonSchema } from 'zod-to-json-schema';
import '../mocks/setup';

describe('Chat Tool', () => {
  beforeEach(() => {
    // delete BASE_URL because it takes precedence over SUBDOMAIN
    delete process.env.GLEAN_BASE_URL;
    process.env.GLEAN_SUBDOMAIN = 'test';
    process.env.GLEAN_API_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.GLEAN_SUBDOMAIN;
    delete process.env.GLEAN_API_TOKEN;
  });

  describe('JSON Schema Generation', () => {
    it('generates correct JSON schema', () => {
      expect(zodToJsonSchema(ToolChatSchema, 'GleanChat'))
        .toMatchInlineSnapshot(`
        {
          "$ref": "#/definitions/GleanChat",
          "$schema": "http://json-schema.org/draft-07/schema#",
          "definitions": {
            "GleanChat": {
              "additionalProperties": false,
              "properties": {
                "context": {
                  "description": "Optional previous messages for context. Will be included in order before the current message.",
                  "items": {
                    "type": "string",
                  },
                  "type": "array",
                },
                "message": {
                  "description": "The user question or message to send to Glean Assistant.",
                  "type": "string",
                },
              },
              "required": [
                "message",
              ],
              "type": "object",
            },
          },
        }
      `);
    });
  });

  describe('Schema Validation', () => {
    it('should validate a valid chat request', () => {
      const validRequest = {
        message: 'Hello',
      };

      const result = ToolChatSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate with context messages', () => {
      const validRequest = {
        message: 'How do I solve this problem?',
        context: [
          'I need help with an integration issue',
          'I tried following the documentation',
        ],
      };

      const result = ToolChatSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid message structure', () => {
      const invalidRequest = {
        message: 123, // Should be string
        context: 'not an array', // Should be an array of strings
      };

      const result = ToolChatSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool Implementation', () => {
    it('should call Glean client with validated params', async () => {
      const params = {
        message: 'What are the company holidays this year?',
      };

      const response = await chat(params);

      let typedResponse: ChatResponse;
      if (typeof response === 'string') {
        typedResponse = JSON.parse(response) as ChatResponse;
      } else {
        typedResponse = response as ChatResponse;
      }

      expect(typedResponse).toHaveProperty('messages');
      expect(typedResponse.messages).toBeInstanceOf(Array);
      expect(typedResponse.messages?.[0]).toMatchObject({
        author: Author.GleanAi,
        fragments: [
          {
            text: 'Search company knowledge',
          },
        ],
        messageId: expect.any(String),
        messageType: 'UPDATE',
      });
    });
  });
});
