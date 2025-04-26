import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchResponse } from '@gleanwork/api-client/models/components';
import { SearchSchema, search } from '../../tools/search';
import '../mocks/setup';

describe('Search Tool', () => {
  beforeEach(() => {
    process.env.GLEAN_SUBDOMAIN = 'test';
    process.env.GLEAN_API_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.GLEAN_SUBDOMAIN;
    delete process.env.GLEAN_API_TOKEN;
  });

  describe('Schema Validation', () => {
    it('should validate a valid search request', () => {
      const validRequest = {
        query: 'test query',
        pageSize: 10,
        disableSpellcheck: false,
      };

      const result = SearchSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate optional fields', () => {
      const validRequest = {
        query: 'test query',
        people: [
          {
            name: 'Test User',
            obfuscatedId: '123',
            email: 'test@example.com',
            metadata: {
              title: 'Software Engineer',
              department: 'Engineering',
            },
          },
        ],
      };

      const result = SearchSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid types', () => {
      const invalidRequest = {
        query: 123, // Should be string
        pageSize: 'large', // Should be number
      };

      const result = SearchSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('Tool Implementation', () => {
    it('should call Glean client with validated params', async () => {
      const params = {
        query: 'test query',
        pageSize: 10,
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
