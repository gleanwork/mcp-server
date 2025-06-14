/**
 * @fileoverview Tests for the read documents tool implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readDocuments, formatResponse, ToolReadDocumentsSchema } from '../../tools/read_documents'
import { getClient } from '../../common/client.js';

vi.mock('../../common/client.js');

describe('read-documents tool', () => {
  const mockClient = {
    documents: {
      retrieve: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClient).mockResolvedValue(mockClient as any);
  });

  describe('ToolReadDocumentsSchema', () => {
    it('should validate request with document IDs', () => {
      const validRequest = {
        documentSpecs: [
          { id: 'doc-123' },
          { id: 'doc-456' },
        ],
      };

      const result = ToolReadDocumentsSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate request with URLs', () => {
      const validRequest = {
        documentSpecs: [
          { url: 'https://example.com/doc1' },
          { url: 'https://example.com/doc2' },
        ],
      };

      const result = ToolReadDocumentsSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate request with mixed IDs and URLs', () => {
      const validRequest = {
        documentSpecs: [
          { id: 'doc-123' },
          { url: 'https://example.com/doc1' },
        ],
      };

      const result = ToolReadDocumentsSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should fail validation without documentSpecs', () => {
      const invalidRequest = {};

      const result = ToolReadDocumentsSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should fail validation with empty documentSpecs array', () => {
      const invalidRequest = {
        documentSpecs: [],
      };

      const result = ToolReadDocumentsSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should fail validation with documentSpec missing both id and url', () => {
      const invalidRequest = {
        documentSpecs: [{}],
      };

      const result = ToolReadDocumentsSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('readDocuments', () => {
    it('should call client.documents.retrieve with document ID', async () => {
      const mockResponse = {
        documents: {
          'doc-123': {
            id: 'doc-123',
            title: 'Test Document',
            content: 'Test content',
          },
        },
      };

      mockClient.documents.retrieve.mockResolvedValue(mockResponse);

      const request = { documentSpecs: [{ id: 'doc-123' }] };
      const result = await readDocuments(request);

      expect(mockClient.documents.retrieve).toHaveBeenCalledWith({
        documentSpecs: [{ id: 'doc-123' }],
      });
      expect(result).toEqual(mockResponse);
    });

    it('should call client.documents.retrieve with document URL', async () => {
      const mockResponse = {
        documents: {
          'url-1': {
            title: 'Test Document',
            url: 'https://example.com/doc1',
            content: 'Test content',
          },
        },
      };

      mockClient.documents.retrieve.mockResolvedValue(mockResponse);

      const request = { documentSpecs: [{ url: 'https://example.com/doc1' }] };
      const result = await readDocuments(request);

      expect(mockClient.documents.retrieve).toHaveBeenCalledWith({
        documentSpecs: [{ url: 'https://example.com/doc1' }],
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('formatResponse', () => {
    it('should format single document response correctly', () => {
      const response = {
        documents: {
          'doc-123': {
            title: 'Test Document',
            url: 'https://example.com/doc1',
            docType: 'Article',
            datasource: 'confluence',
            body: {
              textContent: 'This is test content for the document.',
            },
            author: 'John Doe',
            createdAt: '2023-01-01T00:00:00Z',
          },
        },
      };

      const result = formatResponse(response);

      expect(result).toContain('Retrieved 1 document:');
      expect(result).toContain('[1] Test Document');
      expect(result).toContain('Type: Article');
      expect(result).toContain('Source: confluence');
      expect(result).toContain('Author: John Doe');
      expect(result).toContain('URL: https://example.com/doc1');
      expect(result).toContain('This is test content for the document.');
    });

    it('should format multiple documents response correctly', () => {
      const response = {
        documents: {
          'doc-123': {
            title: 'First Document',
            content: 'First content',
          },
          'doc-456': {
            title: 'Second Document',
            content: 'Second content',
          },
        },
      };

      const result = formatResponse(response);

      expect(result).toContain('Retrieved 2 documents:');
      expect(result).toContain('[1] First Document');
      expect(result).toContain('[2] Second Document');
      expect(result).toContain('First content');
      expect(result).toContain('Second content');
    });

    it('should handle empty response', () => {
      const response = {
        documents: {},
      };

      const result = formatResponse(response);
      expect(result).toBe('No documents found.');
    });

    it('should handle missing documents field', () => {
      const response = {};

      const result = formatResponse(response);
      expect(result).toBe('No documents found.');
    });

    it('should truncate long content', () => {
      const longContent = 'A'.repeat(3000);
      const response = {
        documents: {
          'doc-123': {
            title: 'Long Document',
            body: {
              textContent: longContent,
            },
          },
        },
      };

      const result = formatResponse(response);

      expect(result).toContain('A'.repeat(2000) + '...');
      expect(result).not.toContain('A'.repeat(2001));
    });
  });
}); 