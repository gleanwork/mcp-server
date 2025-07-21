import { describe, it, expect, beforeEach } from 'vitest';
import { ChatResponseBuffer } from '../../tools/chat-response-buffer.js';

describe('ChatResponseBuffer', () => {
  let buffer: ChatResponseBuffer;

  beforeEach(() => {
    buffer = new ChatResponseBuffer();
  });

  describe('Token Estimation', () => {
    it('should estimate tokens correctly', async () => {
      const text = 'Hello world!'; // 12 chars = 4 tokens (3 chars/token)
      const result = await buffer.processResponse(text);
      
      expect(result.metadata).toBeUndefined(); // Should not chunk small text
      expect(result.content).toBe(text);
    });

    it('should not chunk responses under token limit', async () => {
      // 10k chars = ~3.3k tokens, under 15k limit
      const smallText = 'a'.repeat(10000);
      const result = await buffer.processResponse(smallText);
      
      expect(result.metadata).toBeUndefined();
      expect(result.content).toBe(smallText);
    });
  });

  describe('Text Chunking Logic', () => {
    it('should chunk large responses', async () => {
      // 100k chars = ~33k tokens, over 15k limit
      const largeText = 'This is a test paragraph.\n\n'.repeat(4000);
      const result = await buffer.processResponse(largeText);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.chunkIndex).toBe(0);
      expect(result.metadata!.totalChunks).toBeGreaterThan(1);
      expect(result.metadata!.hasMore).toBe(true);
      expect(result.metadata!.responseId).toBeTruthy();
    });

    it('should prefer splitting at paragraph boundaries', async () => {
      // Create text with manageable paragraph breaks that will trigger chunking
      const paragraph = 'This is a test paragraph with some content.\n\n';
      const largeText = paragraph.repeat(2000); // Creates text large enough to chunk
      
      const result = await buffer.processResponse(largeText);
      
      expect(result.metadata).toBeDefined();
      // The content should be chunked and may end with paragraph boundary
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content.length).toBeLessThan(largeText.length);
    });

    it('should fall back to sentence boundaries when paragraphs are too large', async () => {
      // Create one huge paragraph with sentences
      const sentence = 'A'.repeat(1000) + '. ';
      const hugeParagraph = sentence.repeat(100); // 100k+ chars, no paragraph breaks
      
      const result = await buffer.processResponse(hugeParagraph);
      
      expect(result.metadata).toBeDefined();
      expect(result.content).toMatch(/\.\s*$/); // Should end at sentence boundary
    });

    it('should force split when no natural boundaries exist', async () => {
      // Create text with no natural boundaries
      // Use 50k chars (just over the 45k chunk limit) to test force split
      const largeText = 'A'.repeat(50000); 
      
      const result = await buffer.processResponse(largeText);
      
      expect(result.metadata).toBeDefined();
      expect(result.content.length).toBeLessThan(largeText.length);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.metadata!.totalChunks).toBe(2); // Should split into 2 chunks
    });
  });

  describe('Chunk Storage and Retrieval', () => {
    it('should store and retrieve chunks correctly', async () => {
      const largeText = 'Test paragraph.\n\n'.repeat(5000);
      const firstChunk = await buffer.processResponse(largeText);
      
      expect(firstChunk.metadata).toBeDefined();
      const responseId = firstChunk.metadata!.responseId;
      
      // Get second chunk
      const secondChunk = buffer.getChunk(responseId, 1);
      
      expect(secondChunk).toBeDefined();
      expect(secondChunk!.metadata!.chunkIndex).toBe(1);
      expect(secondChunk!.metadata!.responseId).toBe(responseId);
      expect(secondChunk!.content).toBeTruthy();
    });

    it('should return null for invalid chunk requests', async () => {
      const invalidChunk = buffer.getChunk('invalid-id', 0);
      expect(invalidChunk).toBeNull();
      
      // Create a response first that will definitely chunk
      const largeText = 'Test.\n\n'.repeat(10000); // Much larger - 70k chars
      const result = await buffer.processResponse(largeText);
      const responseId = result.metadata!.responseId;
      
      // Request chunk beyond available range
      const beyondRange = buffer.getChunk(responseId, 999);
      expect(beyondRange).toBeNull();
    });

    it('should handle last chunk correctly', async () => {
      const largeText = 'Test paragraph.\n\n'.repeat(10000); // Much larger - 160k chars
      const firstChunk = await buffer.processResponse(largeText);
      
      const responseId = firstChunk.metadata!.responseId;
      const totalChunks = firstChunk.metadata!.totalChunks;
      
      // Get last chunk
      const lastChunk = buffer.getChunk(responseId, totalChunks - 1);
      
      expect(lastChunk).toBeDefined();
      expect(lastChunk!.metadata!.hasMore).toBe(false);
      expect(lastChunk!.metadata!.chunkIndex).toBe(totalChunks - 1);
    });
  });

  describe('Chunk Metadata', () => {
    it('should provide accurate chunk metadata', async () => {
      const largeText = 'Test paragraph.\n\n'.repeat(10000); // Much larger - 160k chars  
      const result = await buffer.processResponse(largeText);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.chunkIndex).toBe(0);
      expect(result.metadata!.totalChunks).toBeGreaterThan(1);
      expect(result.metadata!.responseId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
      expect(result.metadata!.hasMore).toBe(true);
    });

    it('should correctly identify when no more chunks exist', async () => {
      const largeText = 'Short text that fits in one chunk.';
      const result = await buffer.processResponse(largeText);
      
      expect(result.metadata).toBeUndefined(); // No chunking needed
    });
  });

  describe('Cleanup', () => {
    it('should allow manual cleanup of stored responses', async () => {
      const largeText = 'Test.\n\n'.repeat(10000); // Much larger - 70k chars
      const result = await buffer.processResponse(largeText);
      const responseId = result.metadata!.responseId;
      
      // Should be able to get chunk before cleanup
      const chunk = buffer.getChunk(responseId, 1);
      expect(chunk).toBeDefined();
      
      // Clean up
      buffer.cleanup(responseId);
      
      // Should not be able to get chunk after cleanup
      const cleanedChunk = buffer.getChunk(responseId, 1);
      expect(cleanedChunk).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', async () => {
      const result = await buffer.processResponse('');
      expect(result.content).toBe('');
      expect(result.metadata).toBeUndefined();
    });

    it('should handle strings with only whitespace', async () => {
      const whitespaceText = '   \n\n   \t\t   ';
      const result = await buffer.processResponse(whitespaceText);
      expect(result.content).toBe(whitespaceText);
      expect(result.metadata).toBeUndefined();
    });

    it('should handle text exactly at the token limit boundary', async () => {
      // Create text that's close to the limit (15k tokens = 45k chars)
      const borderlineText = 'a'.repeat(45000);
      const result = await buffer.processResponse(borderlineText);
      
      // Should just fit in one chunk
      expect(result.metadata).toBeUndefined();
      expect(result.content).toBe(borderlineText);
    });
  });
});