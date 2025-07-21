import { describe, it, expect, vi, beforeEach } from 'vitest';
import { search } from '../../tools/search.js';
import { peopleProfileSearch } from '../../tools/people_profile_search.js';
import { chat } from '../../tools/chat.js';
import { chatResponseBuffer } from '../../tools/chat-response-buffer.js';
import { getClient } from '../../common/client.js';

vi.mock('../../common/client.js');

describe('Pagination Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Search Pagination', () => {
    it('should handle pagination cursor in search requests', async () => {
      const mockClient = {
        search: {
          query: vi.fn().mockResolvedValue({
            results: [
              { title: 'Result 1', url: 'http://example1.com' },
              { title: 'Result 2', url: 'http://example2.com' },
            ],
            cursor: 'next-page-cursor',
            hasMoreResults: true,
            totalResults: 50,
            metadata: { searchedQuery: 'test query' },
          }),
        },
      };

      vi.mocked(getClient).mockResolvedValue(mockClient as any);

      const result = await search({
        query: 'test query',
        pageSize: 2,
        cursor: 'initial-cursor',
      });

      expect(mockClient.search.query).toHaveBeenCalledWith({
        query: 'test query',
        pageSize: 2,
        cursor: 'initial-cursor',
      });

      expect(result.cursor).toBe('next-page-cursor');
      expect(result.hasMoreResults).toBe(true);
    });
  });

  describe('People Search Pagination', () => {
    it('should handle pagination cursor in people search requests', async () => {
      const mockClient = {
        entities: {
          list: vi.fn().mockResolvedValue({
            results: [
              { name: 'Person 1', metadata: { email: 'person1@example.com' } },
              { name: 'Person 2', metadata: { email: 'person2@example.com' } },
            ],
            cursor: 'people-next-cursor',
            hasMoreResults: true,
            totalCount: 100,
          }),
        },
      };

      vi.mocked(getClient).mockResolvedValue(mockClient as any);

      const result = await peopleProfileSearch({
        query: 'engineers',
        pageSize: 2,
        cursor: 'people-cursor',
      });

      expect(mockClient.entities.list).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: 'people-cursor',
          pageSize: 2,
        })
      );

      expect(result.cursor).toBe('people-next-cursor');
      expect(result.hasMoreResults).toBe(true);
    });
  });

  describe('Chat Response Chunking', () => {
    it('should chunk large chat responses', async () => {
      // Create a large response that exceeds the token limit
      const largeText = 'This is a test paragraph. '.repeat(5000); // ~25k chars = ~6.25k tokens
      
      const chunked = await chatResponseBuffer.processResponse(largeText);
      
      expect(chunked.metadata).toBeDefined();
      expect(chunked.metadata?.totalChunks).toBeGreaterThan(1);
      expect(chunked.metadata?.hasMore).toBe(true);
      expect(chunked.content.length).toBeLessThan(largeText.length);
    });

    it('should retrieve subsequent chunks', async () => {
      const largeText = 'This is a test paragraph. '.repeat(5000);
      
      const initial = await chatResponseBuffer.processResponse(largeText);
      const responseId = initial.metadata!.responseId;
      
      // Get second chunk
      const chunk2 = chatResponseBuffer.getChunk(responseId, 1);
      
      expect(chunk2).toBeDefined();
      expect(chunk2?.metadata?.chunkIndex).toBe(1);
      expect(chunk2?.content).toBeTruthy();
    });

    it('should handle chat continuation requests', async () => {
      const mockClient = {
        chat: {
          create: vi.fn().mockResolvedValue({
            messages: [{ text: 'Response' }],
          }),
        },
      };

      vi.mocked(getClient).mockResolvedValue(mockClient as any);

      // First, make a regular chat request
      await chat({
        message: 'Hello',
      });

      // Create a large response manually
      const largeText = 'This is a test paragraph. '.repeat(5000);
      const chunked = await chatResponseBuffer.processResponse(largeText);
      const responseId = chunked.metadata!.responseId;

      // Now test continuation
      const continued = await chat({
        message: '',
        continueFrom: {
          responseId,
          chunkIndex: 1,
        },
      });

      expect(continued.content).toBeTruthy();
      expect(continued.metadata?.chunkIndex).toBe(1);
    });
  });
});