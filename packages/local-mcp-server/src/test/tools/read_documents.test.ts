import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readDocuments } from '../../tools/read_documents.js';
import { server } from '../mocks/setup.js';
import { http, HttpResponse } from 'msw';

// Mock the config module
vi.mock('@gleanwork/mcp-server-utils/config', () => ({
  getConfig: vi.fn(),
  isGleanTokenConfig: vi.fn(),
}));

const { getConfig, isGleanTokenConfig } = await import(
  '@gleanwork/mcp-server-utils/config'
);

describe('readDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('should successfully read documents with token authentication', async () => {
    // Mock config
    const mockConfig = {
      authType: 'token' as const,
      baseUrl: 'https://test-company-be.glean.com/',
      token: 'test-token',
    };
    vi.mocked(getConfig).mockResolvedValue(mockConfig);
    vi.mocked(isGleanTokenConfig).mockReturnValue(true);

    // Mock successful API response
    server.use(
      http.post(
        'https://test-company-be.glean.com/rest/api/v1/getdocuments',
        async ({ request }) => {
          const headers = Object.fromEntries(request.headers.entries());
          expect(headers['content-type']).toBe('application/json');
          expect(headers['authorization']).toBe('Bearer test-token');

          return HttpResponse.json({
            documents: [
              {
                id: 'doc1',
                title: 'Test Document',
                url: 'https://example.com/doc1',
                body: {
                  mimeType: 'text/plain',
                  textContent: 'This is the content of the document.',
                },
                metadata: {
                  createdAt: '2023-01-01T00:00:00Z',
                  updatedAt: '2023-01-02T00:00:00Z',
                  author: { name: 'John Doe' },
                  datasource: 'confluence',
                },
              },
            ],
          });
        },
      ),
    );

    const result = await readDocuments({
      documentSpecs: [{ id: 'doc1' }],
    });

    expect(result).toContain('Test Document');
    expect(result).toContain('This is the content of the document.');
    expect(result).toContain('John Doe');
  });

  it('should successfully read documents without authentication', async () => {
    // Mock config without token
    const mockConfig = {
      authType: 'unknown' as const,
      baseUrl: 'https://test-company-be.glean.com/',
    };
    vi.mocked(getConfig).mockResolvedValue(mockConfig);
    vi.mocked(isGleanTokenConfig).mockReturnValue(false);

    // Mock successful API response
    server.use(
      http.post(
        'https://test-company-be.glean.com/rest/api/v1/getdocuments',
        async ({ request }) => {
          const headers = Object.fromEntries(request.headers.entries());
          expect(headers['content-type']).toBe('application/json');
          expect(headers['authorization']).toBeUndefined();

          return HttpResponse.json({
            documents: [
              {
                id: 'doc1',
                title: 'Test Document',
                url: 'https://example.com/doc1',
                body: {
                  mimeType: 'text/plain',
                  textContent: 'This is the content of the document.',
                },
              },
            ],
          });
        },
      ),
    );

    const result = await readDocuments({
      documentSpecs: [{ id: 'doc1' }],
    });

    expect(result).toContain('Test Document');
    expect(result).toContain('This is the content of the document.');
  });

  it('should include actAs header when provided', async () => {
    // Mock config with actAs
    const mockConfig = {
      authType: 'token' as const,
      baseUrl: 'https://test-company-be.glean.com/',
      token: 'test-token',
      actAs: 'user@example.com',
    };
    vi.mocked(getConfig).mockResolvedValue(mockConfig);
    vi.mocked(isGleanTokenConfig).mockReturnValue(true);

    // Mock successful API response
    server.use(
      http.post(
        'https://test-company-be.glean.com/rest/api/v1/getdocuments',
        async ({ request }) => {
          const headers = Object.fromEntries(request.headers.entries());
          expect(headers['x-glean-act-as']).toBe('user@example.com');

          return HttpResponse.json({
            documents: [
              {
                id: 'doc1',
                title: 'Test Document',
                body: {
                  mimeType: 'text/plain',
                  textContent: 'Content',
                },
              },
            ],
          });
        },
      ),
    );

    await readDocuments({
      documentSpecs: [{ id: 'doc1' }],
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock config
    const mockConfig = {
      authType: 'token' as const,
      baseUrl: 'https://test-company-be.glean.com/',
      token: 'test-token',
    };
    vi.mocked(getConfig).mockResolvedValue(mockConfig);
    vi.mocked(isGleanTokenConfig).mockReturnValue(true);

    // Mock API error response
    server.use(
      http.post(
        'https://test-company-be.glean.com/rest/api/v1/getdocuments',
        () => {
          return new HttpResponse('Unauthorized', { status: 401 });
        },
      ),
    );

    await expect(
      readDocuments({
        documentSpecs: [{ id: 'doc1' }],
      }),
    ).rejects.toThrow('Failed to read documents: 401 Unauthorized');
  });

  it('should handle multiple documents', async () => {
    // Mock config
    const mockConfig = {
      authType: 'token' as const,
      baseUrl: 'https://test-company-be.glean.com/',
      token: 'test-token',
    };
    vi.mocked(getConfig).mockResolvedValue(mockConfig);
    vi.mocked(isGleanTokenConfig).mockReturnValue(true);

    // Mock successful API response with multiple documents
    server.use(
      http.post(
        'https://test-company-be.glean.com/rest/api/v1/getdocuments',
        () => {
          return HttpResponse.json({
            documents: [
              {
                id: 'doc1',
                title: 'First Document',
                body: {
                  mimeType: 'text/plain',
                  textContent: 'First content',
                },
              },
              {
                id: 'doc2',
                title: 'Second Document',
                body: {
                  mimeType: 'text/plain',
                  textContent: 'Second content',
                },
              },
            ],
          });
        },
      ),
    );

    const result = await readDocuments({
      documentSpecs: [{ id: 'doc1' }, { id: 'doc2' }],
    });

    expect(result).toContain('First Document');
    expect(result).toContain('Second Document');
    expect(result).toContain('First content');
    expect(result).toContain('Second content');
  });

  it('should handle HTML content', async () => {
    // Mock config
    const mockConfig = {
      authType: 'token' as const,
      baseUrl: 'https://test-company-be.glean.com/',
      token: 'test-token',
    };
    vi.mocked(getConfig).mockResolvedValue(mockConfig);
    vi.mocked(isGleanTokenConfig).mockReturnValue(true);

    // Mock successful API response with HTML content
    server.use(
      http.post(
        'https://test-company-be.glean.com/rest/api/v1/getdocuments',
        () => {
          return HttpResponse.json({
            documents: [
              {
                id: 'doc1',
                title: 'HTML Document',
                body: {
                  mimeType: 'text/html',
                  textContent: '<p>HTML content</p>',
                },
              },
            ],
          });
        },
      ),
    );

    const result = await readDocuments({
      documentSpecs: [{ id: 'doc1' }],
    });

    expect(result).toContain('HTML Document');
    expect(result).toContain('Content (HTML):');
    expect(result).toContain('<p>HTML content</p>');
  });
});
