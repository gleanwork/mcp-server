import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChatResponse, Author } from '@gleanwork/api-client/models/components';
import { ChatSchema, chat } from '../../tools/chat';
import '../mocks/setup';

describe('Chat Tool', () => {
  beforeEach(() => {
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
            author: Author.User,
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
            author: Author.User,
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
            author: Author.User,
            fragments: [
              {
                text: 'What are the company holidays this year?',
              },
            ],
          },
        ],
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
