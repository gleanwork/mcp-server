/**
 * @fileoverview Search tool implementation for the Glean MCP server.
 *
 * This module provides a search interface to Glean's content index through the MCP protocol.
 * It defines the schema for search parameters and implements the search functionality using
 * the Glean client SDK.
 *
 * @module tools/search
 */

import { z } from 'zod';
import { getClient } from '../common/client.js';
import { SearchRequest$inboundSchema as SearchRequestSchema } from '@gleanwork/api-client/models/components';

/**
 * Simplified schema for Glean search requests designed for LLM interaction
 */
export const ToolSearchSchema = z.object({
  query: z
    .string()
    .describe('The search query. This is what you want to search for.'),

  datasources: z
    .array(z.string())
    .describe(
      'Optional list of data sources to search in. Examples: "github", "gdrive", "confluence", "jira".',
    )
    .optional(),
});

export type ToolSearchRequest = z.infer<typeof ToolSearchSchema>;

/**
 * Maps a simplified search request to the format expected by the Glean API.
 *
 * @param input Simplified search request parameters
 * @returns Glean API compatible search request
 */
function mapSearchRequest(input: ToolSearchRequest) {
  const { query, datasources } = input;

  // Initialize request object with fixed page size
  const searchRequest: any = {
    query,
    pageSize: 10, // Fixed default page size
  };

  // Map datasources to datasourcesFilter if provided
  if (datasources && datasources.length > 0) {
    searchRequest.requestOptions = {
      datasourcesFilter: datasources,
    };
  }

  return searchRequest;
}

/**
 * Executes a search query against Glean's content index.
 *
 * @param params The search parameters using the simplified schema
 * @returns The search results
 * @throws If the search request fails
 */
export async function search(params: ToolSearchRequest) {
  // Map simplified params to the format expected by the Glean API
  const mappedParams = mapSearchRequest(params);

  // Validate with the original schema to ensure compatibility
  const parsedParams = SearchRequestSchema.parse(mappedParams);

  // Get client and execute request
  const client = await getClient();
  return await client.search.query(parsedParams);
}

/**
 * Formats search results into a human-readable text format.
 *
 * @param searchResults The raw search results from Glean API
 * @returns Formatted search results as text
 */
export function formatResponse(searchResults: any): string {
  if (
    !searchResults ||
    !searchResults.results ||
    !Array.isArray(searchResults.results)
  ) {
    return 'No results found.';
  }

  const formattedResults = searchResults.results
    .map((result: any, index: number) => {
      const title = result.title || 'No title';
      const url = result.url || '';
      const document = result.document || {};

      let snippetText = '';
      if (result.snippets && Array.isArray(result.snippets)) {
        const sortedSnippets = [...result.snippets].sort((a, b) => {
          const orderA = a.snippetTextOrdering || 0;
          const orderB = b.snippetTextOrdering || 0;
          return orderA - orderB;
        });

        snippetText = sortedSnippets
          .map((snippet) => snippet.text || '')
          .filter(Boolean)
          .join('\n');
      }

      if (!snippetText) {
        snippetText = 'No description available';
      }

      return `[${index + 1}] ${title}\n${snippetText}\nSource: ${
        document.datasource || 'Unknown source'
      }\nURL: ${url}`;
    })
    .join('\n\n');

  const totalResults =
    searchResults.totalResults || searchResults.results.length;
  const query = searchResults.metadata.searchedQuery || 'your query';

  return `Search results for "${query}" (${totalResults} results):\n\n${formattedResults}`;
}
