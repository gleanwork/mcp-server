/**
 * @fileoverview Tests for the read documents tool implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readDocuments, formatResponse, ToolReadDocumentsSchema } from '../../tools/read_documents.js'

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('@gleanwork/mcp-server-utils/config', () => ({
  getConfig: vi.fn(),
  isGleanTokenConfig: vi.fn(),
  isOAuthConfig: vi.fn(),
}));

vi.mock('@gleanwork/mcp-server-utils/auth', () => ({
  ensureAuthTokenPresence: vi.fn(),
  loadTokens: vi.fn(),
  AuthError: class AuthError extends Error {
    constructor(message: string, options?: { code?: string }) {
      super(message);
      this.name = 'AuthError';
    }
  },
  AuthErrorCode: {
    InvalidConfig: 'InvalidConfig',
  },
}));

import { getConfig, isGleanTokenConfig, isOAuthConfig } from '@gleanwork/mcp-server-utils/config';
import { ensureAuthTokenPresence, loadTokens } from '@gleanwork/mcp-server-utils/auth';

describe('read-documents tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockFetch.mockReset();
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      headers: {
        get: (name: string) => {
          if (name === 'content-type') return 'application/json';
          return null;
        },
      },
    });
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
    it('should make fetch request with document ID', async () => {
      const mockResponse = {
        documents: {
          'doc-123': {
            id: 'doc-123',
            title: 'Test Document',
            content: 'Test content',
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(''),
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'application/json';
            return null;
          },
        },
      });

      vi.mocked(getConfig).mockResolvedValue({
        baseUrl: 'https://test-instance-be.glean.com/',
        token: 'test-token',
        authType: 'token'
      });
      vi.mocked(isGleanTokenConfig).mockReturnValue(true);
      vi.mocked(isOAuthConfig).mockReturnValue(false);

      const request = { documentSpecs: [{ id: 'doc-123' }] };
      const result = await readDocuments(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-instance-be.glean.com/rest/api/v1/getdocuments',
        {
          method: 'POST',
          body: JSON.stringify({
            documentSpecs: [{ id: 'doc-123' }],
            includeFields: ['DOCUMENT_CONTENT'],
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make fetch request with document URL', async () => {
      const mockResponse = {
        documents: {
          'url-1': {
            title: 'Test Document',
            url: 'https://example.com/doc1',
            content: 'Test content',
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(''),
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'application/json';
            return null;
          },
        },
      });

      vi.mocked(getConfig).mockResolvedValue({
        baseUrl: 'https://test-instance-be.glean.com/',
        token: 'test-token',
        authType: 'token'
      });
      vi.mocked(isGleanTokenConfig).mockReturnValue(true);
      vi.mocked(isOAuthConfig).mockReturnValue(false);

      const request = { documentSpecs: [{ url: 'https://example.com/doc1' }] };
      const result = await readDocuments(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-instance-be.glean.com/rest/api/v1/getdocuments',
        {
          method: 'POST',
          body: JSON.stringify({
            documentSpecs: [{ url: 'https://example.com/doc1' }],
            includeFields: ['DOCUMENT_CONTENT'],
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make fetch request with OAuth authorization header when using OAuth config', async () => {
      const mockResponse = {
        documents: {
          'doc-123': {
            id: 'doc-123',
            title: 'Test Document',
            content: 'Test content',
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(''),
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'application/json';
            return null;
          },
        },
      });

      vi.mocked(getConfig).mockResolvedValue({
        baseUrl: 'https://test-instance-be.glean.com/',
        authType: 'oauth',
        issuer: 'https://issuer.example.com',
        clientId: 'client-id',
        authorizationEndpoint: 'https://issuer.example.com/auth',
        tokenEndpoint: 'https://issuer.example.com/token',
      });
      vi.mocked(isGleanTokenConfig).mockReturnValue(false);
      vi.mocked(isOAuthConfig).mockReturnValue(true);
      vi.mocked(ensureAuthTokenPresence).mockResolvedValue(true);
      vi.mocked(loadTokens).mockReturnValue({
        accessToken: 'oauth-access-token',
        refreshToken: 'oauth-refresh-token',
        isExpired: vi.fn().mockReturnValue(false),
      } as any);

      const request = { documentSpecs: [{ id: 'doc-123' }] };
      const result = await readDocuments(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-instance-be.glean.com/rest/api/v1/getdocuments',
        {
          method: 'POST',
          body: JSON.stringify({
            documentSpecs: [{ id: 'doc-123' }],
            includeFields: ['DOCUMENT_CONTENT'],
          }),
          headers: {
            'Content-Type': 'application/json',
            'X-Glean-Auth-Type': 'OAUTH',
            'Authorization': 'Bearer oauth-access-token',
          },
        }
      );
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
            content: {
              fullTextList: ['This is test content for the document.'],
            },
            metadata: {
              author: {
                name: 'John Doe',
              },
              createTime: '2023-01-01T00:00:00Z',
            },
          },
        },
      };

      const result = formatResponse(response);
      
      // Normalize date formatting to avoid timezone differences between environments
      const normalizedResult = result.replace(/Created: \d{1,2}\/\d{1,2}\/\d{4}/, 'Created: [NORMALIZED_DATE]');

      expect(normalizedResult).toMatchInlineSnapshot(`
        "Retrieved 1 document:

        [1] Test Document
                Type: Article
                Source: confluence
                Author: John Doe
        Created: [NORMALIZED_DATE]
        URL: https://example.com/doc1

                Content:
                This is test content for the document."
      `);
    });

    it('should format multiple documents response correctly', () => {
      const response = {
        documents: {
          'doc-123': {
            title: 'First Document',
            content: {
              fullTextList: ['First content'],
            },
          },
          'doc-456': {
            title: 'Second Document',
            content: {
              fullTextList: ['Second content'],
            },
          },
        },
      };

      const result = formatResponse(response);

      expect(result).toMatchInlineSnapshot(`
        "Retrieved 2 documents:

        [1] First Document
                Type: Document
                Source: Unknown source
                URL: 

                Content:
                First content

        ---

        [2] Second Document
                Type: Document
                Source: Unknown source
                URL: 

                Content:
                Second content"
      `);
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
  });
}); 