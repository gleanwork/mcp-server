import { describe, it, expect } from 'vitest';
import { formatResponse } from '../../tools/search';

describe('Search Formatter', () => {
  it('should format search results correctly', () => {
    const mockSearchResults = {
      results: [
        {
          trackingToken:
            'g1HUqHqv3iYv5qOq,CmUKEGcxSFVxSHF2M2lZdjVxT3EaIWdsZWFud2Vic2l0ZV8xNzYxNjM0NDMxNjgwNzEzMzAwMiIMZ2xlYW53ZWJzaXRlKgNhbGwyCERvY3VtZW50OhFQVUJMSVNIRURfQ09OVEVOVA==',
          document: {
            id: 'gleanwebsite_17616344316807133002',
            datasource: 'gleanwebsite',
            docType: 'Document',
            title:
              'Work AI for all - AI platform for agents, assistant, search',
            url: 'https://www.glean.com/',
          },
          title: 'Work AI for all - AI platform for agents, assistant, search',
          url: 'https://www.glean.com/',
          snippets: [
            {
              snippet: '',
              mimeType: 'text/plain',
              text: 'Find & understand information',
              snippetTextOrdering: 1,
              ranges: [
                {
                  startIndex: 0,
                  endIndex: 4,
                  type: 'BOLD',
                },
                {
                  startIndex: 18,
                  endIndex: 29,
                  type: 'BOLD',
                },
              ],
            },
            {
              snippet: '',
              mimeType: 'text/plain',
              text: "The world's leading enterprises put AI to work with Glean.",
              ranges: [
                {
                  startIndex: 36,
                  endIndex: 38,
                  type: 'BOLD',
                },
                {
                  startIndex: 52,
                  endIndex: 57,
                  type: 'BOLD',
                },
              ],
            },
            {
              snippet: '',
              mimeType: 'text/plain',
              text: 'the power of Glean and the knowledge it has across organizations comes in. You can make the prompt engineering much smarter so that you get a better',
              snippetTextOrdering: 2,
              ranges: [
                {
                  startIndex: 13,
                  endIndex: 18,
                  type: 'BOLD',
                },
              ],
            },
          ],
          clusteredResults: [
            // Simplified for test
          ],
        },
      ],
      metadata: {
        searchedQuery: 'glean',
      },
    };

    const formattedResults = formatResponse(mockSearchResults);

    expect(formattedResults).toContain('Search results for "glean"');
    expect(formattedResults).toContain(
      'Work AI for all - AI platform for agents, assistant, search',
    );
    expect(formattedResults).toContain('Find & understand information');
    expect(formattedResults).toContain(
      "The world's leading enterprises put AI to work with Glean.",
    );
    expect(formattedResults).toContain('Source: gleanwebsite');
    expect(formattedResults).toContain('URL: https://www.glean.com/');
  });

  it('should handle empty results', () => {
    const emptyResults = {
      results: [],
      metadata: {
        searchedQuery: 'nonexistent term',
      },
    };

    const formattedResults = formatResponse(emptyResults);
    expect(formattedResults).toContain(
      'Search results for "nonexistent term" (0 results)',
    );
  });

  it('should handle missing results', () => {
    const noResults = {};
    const formattedResults = formatResponse(noResults);
    expect(formattedResults).toBe('No results found.');
  });

  it('should handle missing snippets', () => {
    const resultsWithoutSnippets = {
      results: [
        {
          title: 'Test Result',
          url: 'https://example.com',
          document: {
            datasource: 'testdatasource',
          },
        },
      ],
      metadata: {
        searchedQuery: 'test',
      },
    };

    const formattedResults = formatResponse(resultsWithoutSnippets);
    expect(formattedResults).toContain('Test Result');
    expect(formattedResults).toContain('No description available');
    expect(formattedResults).toContain('Source: testdatasource');
  });
});
