import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChatSchema, chat } from '../../tools/chat';
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

  describe('Schema Validation', () => {
    it('should validate a valid chat request', () => {
      const validRequest = {
        messages: [
          {
            author: 'USER',
            fragments: [
              {
                text: 'Hello',
              },
            ],
          },
        ],
      };

      const result = ChatSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate complex message structure', () => {
      const validRequest = {
        messages: [
          {
            author: 'USER',
            fragments: [
              {
                text: 'Hello',
                action: {
                  parameters: {
                    param1: {
                      type: 'STRING',
                      value: 'test',
                      description: 'Test parameter',
                    },
                  },
                },
              },
            ],
            messageType: 'CONTENT',
          },
        ],
        agentConfig: {
          agent: 'GPT',
          mode: 'DEFAULT',
        },
      };

      const result = ChatSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid message structure', () => {
      const invalidRequest = {
        messages: [
          {
            author: 'INVALID_AUTHOR', // Should be USER or GLEAN_AI
            fragments: 'not an array', // Should be an array
          },
        ],
      };

      const result = ChatSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool Implementation', () => {
    it('should call Glean client with validated params', async () => {
      const params = {
        messages: [
          {
            author: 'USER',
            fragments: [
              {
                text: 'Hello',
              },
            ],
          },
        ],
      };

      const response = await chat(params as any);

      // Verify response structure
      const typedResponse = response as { messages: Array<{ author: string; fragments: Array<{ text: string }>; messageId: string; messageType: string }> };
      expect(typedResponse).toHaveProperty('messages');
      expect(typedResponse.messages).toBeInstanceOf(Array);
      expect(typedResponse.messages[0]).toMatchObject({
        author: 'GLEAN_AI',
        fragments: [
          {
            text: 'Search company knowledge'
          }
        ],
        messageId: expect.any(String),
        messageType: 'UPDATE'
      });
    });
  });
});
