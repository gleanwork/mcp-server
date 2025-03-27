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

/**
 * Schema for related documents in search requests.
 * Matches the Glean SDK's RelatedDocuments type structure.
 */
export const RelatedDocumentsSchema = z.object({
  relation: z
    .enum([
      'ATTACHMENT',
      'CANONICAL',
      'CASE',
      'CONTACT',
      'CONVERSATION_MESSAGES',
      'EXPERT',
      'FROM',
      'HIGHLIGHT',
      'OPPORTUNITY',
      'RECENT',
      'SOURCE',
      'TICKET',
      'TRANSCRIPT',
      'WITH',
    ])
    .describe('How this document relates to the including entity.'),
  associatedEntityId: z
    .string()
    .optional()
    .describe('Which entity in the response that this entity relates to.'),
  querySuggestion: z
    .any()
    .optional()
    .describe('Query suggestion for this relation'),
  documents: z
    .array(z.any())
    .optional()
    .describe(
      'A truncated list of documents with this relation. TO BE DEPRECATED.',
    ),
  results: z
    .array(z.any())
    .optional()
    .describe('A truncated list of documents associated with this relation.'),
});

/**
 * Schema for a person entity in search requests.
 * Matches the Glean SDK's Person type structure.
 *
 * @type {z.ZodObject}
 */
export const PersonSchema = z.object({
  name: z.string(),
  obfuscatedId: z.string(),
  email: z.string().optional(),
  metadata: z.any().optional(),
  relatedDocuments: z.array(RelatedDocumentsSchema).optional(),
});

/**
 * Schema for facet filter value in search requests.
 * Defines the structure for facet filter values.
 *
 * @type {z.ZodObject}
 */
export const FacetFilterValueSchema = z.object({
  value: z.string().describe('Filter value'),
  relationType: z
    .enum(['EQUALS', 'ID_EQUALS', 'LT', 'GT'])
    .optional()
    .describe('Type of relation'),
  isNegated: z
    .boolean()
    .optional()
    .describe('DEPRECATED - Whether the filter is negated'),
});

/**
 * Schema for facet filter in search requests.
 * Defines the structure for facet filters.
 *
 * @type {z.ZodObject}
 */
export const FacetFilterSchema = z.object({
  fieldName: z.string().describe('Name of the field to filter on'),
  values: z.array(FacetFilterValueSchema).describe('Values to filter by'),
});

/**
 * Schema for restriction filters in search requests.
 * Defines the structure for inclusion/exclusion filters.
 *
 * @type {z.ZodObject}
 */
export const RestrictionFiltersSchema = z.object({
  datasources: z
    .array(z.string())
    .optional()
    .describe('List of datasources to include/exclude'),
  people: z
    .array(PersonSchema)
    .optional()
    .describe('List of people to include/exclude'),
});

/**
 * Schema for search request options.
 * Defines the options that can be specified for a search request.
 *
 * @type {z.ZodObject}
 */
export const SearchRequestOptionsSchema = z.object({
  datasourceFilter: z
    .string()
    .optional()
    .describe('Filter results to a single datasource name'),
  datasourcesFilter: z
    .array(z.string())
    .optional()
    .describe('Filter results to one or more datasources'),
  queryOverridesFacetFilters: z
    .boolean()
    .optional()
    .describe(
      'If true, query operators override facet filters in case of conflict',
    ),
  facetFilters: z
    .array(FacetFilterSchema)
    .optional()
    .describe('List of filters for the query (ANDed together)'),
  facetBucketSize: z
    .number()
    .optional()
    .describe('Maximum number of FacetBuckets to return in each FacetResult'),
  defaultFacets: z
    .array(z.string())
    .optional()
    .describe('Facets for which FacetResults should be fetched'),
  fetchAllDatasourceCounts: z
    .boolean()
    .optional()
    .describe('Return result counts for all supported datasources'),
  responseHints: z
    .array(
      z.enum([
        'ALL_RESULT_COUNTS',
        'FACET_RESULTS',
        'QUERY_METADATA',
        'RESULTS',
        'SPELLCHECK_METADATA',
      ]),
    )
    .optional()
    .describe('Hints for the response content'),
  timezoneOffset: z
    .number()
    .optional()
    .describe('Offset of client timezone in minutes from UTC'),
  disableSpellcheck: z
    .boolean()
    .optional()
    .describe('Whether to disable spellcheck'),
  disableQueryAutocorrect: z
    .boolean()
    .optional()
    .describe('Disables automatic adjustment of the input query'),
  returnLlmContentOverSnippets: z
    .boolean()
    .optional()
    .describe('Enables expanded content to be returned for LLM usage'),
  inclusions: RestrictionFiltersSchema.optional().describe(
    'Filters to restrict search results to only specified content',
  ),
  exclusions: RestrictionFiltersSchema.optional().describe(
    'Filters specifying content to avoid in search results',
  ),
});

/**
 * Schema for search request input details.
 * Defines additional metadata about the search input.
 *
 * @type {z.ZodObject}
 */
export const SearchRequestInputDetailsSchema = z.object({
  hasCopyPaste: z
    .boolean()
    .optional()
    .describe('Whether the query was at least partially copy-pasted'),
});

/**
 * Schema for search request parameters.
 * Defines all possible search parameters supported by the Glean search API.
 *
 * @type {z.ZodObject}
 */
export const SearchSchema = z.object({
  query: z.string().describe('The search terms'),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor for position in overall results'),
  resultTabIds: z
    .array(z.string())
    .optional()
    .describe('Unique IDs of result tabs to fetch'),
  inputDetails: SearchRequestInputDetailsSchema.optional().describe(
    'Additional metadata about the search input',
  ),
  requestOptions: SearchRequestOptionsSchema.optional().describe(
    'Options for the search request',
  ),
  timeoutMillis: z
    .number()
    .optional()
    .describe('Request timeout in milliseconds'),
  people: z
    .array(PersonSchema)
    .optional()
    .describe('People associated with the search request'),
  disableSpellcheck: z
    .boolean()
    .optional()
    .describe('Whether to disable spellcheck'),
  maxSnippetSize: z
    .number()
    .optional()
    .describe('Maximum characters for snippets'),
  pageSize: z.number().default(10).describe('Number of results to return'),
  timestamp: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp of client request'),
  trackingToken: z
    .string()
    .optional()
    .describe('Previous tracking token for same query'),
});

/**
 * Executes a search query against Glean's content index.
 *
 * @param {z.infer<typeof SearchSchema>} params - The search parameters
 * @param {string} [params.query] - The search query terms
 * @param {string} [params.cursor] - Pagination cursor for fetching next page of results
 * @param {boolean} [params.disableSpellcheck] - Whether to disable spellcheck
 * @param {number} [params.maxSnippetSize] - Maximum size of content snippets in results
 * @param {number} [params.pageSize] - Number of results per page
 * @param {Array<Person>} [params.people] - People to filter results by
 * @param {Array<string>} [params.resultTabIds] - IDs of result tabs to include
 * @param {number} [params.timeout] - Search timeout in milliseconds
 * @returns {Promise<object>} The search results
 * @throws {Error} If the search request fails
 */
export async function search(params: z.infer<typeof SearchSchema>) {
  const parsedParams = SearchSchema.parse(params);
  const client = getClient();

  return await client.search(parsedParams);
}

/**
 * Formats search results into a human-readable text format.
 *
 * @param {any} searchResults - The raw search results from Glean API
 * @returns {string} Formatted search results as text
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
