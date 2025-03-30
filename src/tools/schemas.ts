/**
 * @fileoverview Shared schema definitions for Glean MCP server tools.
 *
 * This module contains schema definitions that are used across multiple tools,
 * particularly between search and chat functionality.
 */

import { z } from 'zod';

/**
 * Schema for document content in search requests.
 */
export const DocumentContentSchema = z.object({
  fullTextList: z
    .array(z.string())
    .optional()
    .describe('The plaintext content of the document'),
});

/**
 * Schema for document metadata in search requests.
 */
export const DocumentMetadataSchema = z.object({
  customData: z.record(z.any()).optional().describe('Custom metadata fields'),
});

/**
 * Schema for document section in search requests.
 */
export const DocumentSectionSchema = z.object({
  title: z.string().optional().describe('Section title'),
  content: z.string().optional().describe('Section content'),
  startIndex: z
    .number()
    .optional()
    .describe('Start index of section in document'),
  endIndex: z.number().optional().describe('End index of section in document'),
  level: z.number().optional().describe('Heading level of the section'),
  type: z.string().optional().describe('Type of section'),
});

/**
 * Schema for document in search requests.
 */
export type DocumentSchemaType = z.ZodObject<{
  id: z.ZodString;
  datasource: z.ZodOptional<z.ZodString>;
  connectorType: z.ZodOptional<
    z.ZodEnum<
      [
        'API_CRAWL',
        'BROWSER_CRAWL',
        'BROWSER_HISTORY',
        'BUILTIN',
        'FEDERATED_SEARCH',
        'PUSH_API',
        'WEB_CRAWL',
        'NATIVE_HISTORY',
      ]
    >
  >;
  docType: z.ZodOptional<z.ZodString>;
  content: z.ZodOptional<typeof DocumentContentSchema>;
  containerDocument: z.ZodOptional<z.ZodLazy<any>>;
  parentDocument: z.ZodOptional<z.ZodLazy<any>>;
  title: z.ZodOptional<z.ZodString>;
  url: z.ZodOptional<z.ZodString>;
  metadata: z.ZodOptional<typeof DocumentMetadataSchema>;
  sections: z.ZodOptional<z.ZodArray<typeof DocumentSectionSchema>>;
}>;

export const DocumentSchema: DocumentSchemaType = z.object({
  id: z.string().describe('The Glean Document ID'),
  datasource: z
    .string()
    .optional()
    .describe(
      'The app or other repository type from which the document was extracted',
    ),
  connectorType: z
    .enum([
      'API_CRAWL',
      'BROWSER_CRAWL',
      'BROWSER_HISTORY',
      'BUILTIN',
      'FEDERATED_SEARCH',
      'PUSH_API',
      'WEB_CRAWL',
      'NATIVE_HISTORY',
    ])
    .optional()
    .describe('The type of connector used to extract the document'),
  docType: z
    .string()
    .optional()
    .describe('The datasource-specific type of the document'),
  content: DocumentContentSchema.optional(),
  containerDocument: z
    .lazy(() => DocumentSchema)
    .optional()
    .describe('The container document'),
  parentDocument: z
    .lazy(() => DocumentSchema)
    .optional()
    .describe('The parent document'),
  title: z.string().optional().describe('The title of the document'),
  url: z.string().optional().describe('A permalink for the document'),
  metadata: DocumentMetadataSchema.optional(),
  sections: z
    .array(DocumentSectionSchema)
    .optional()
    .describe('A list of content sub-sections in the document'),
});

/**
 * Schema for text range in search requests.
 */
export const TextRangeSchema = z.object({
  startIndex: z.number().describe('Inclusive start index of the range'),
  endIndex: z.number().describe('Exclusive end index of the range'),
  type: z
    .enum(['BOLD', 'CITATION', 'LINK'])
    .describe('Type of formatting to apply'),
  url: z.string().optional().describe('URL associated with the range'),
  document: DocumentSchema.optional().describe('Referenced document'),
});

/**
 * Schema for search result snippet in search requests.
 */
export const SearchResultSnippetSchema = z.object({
  snippet: z
    .string()
    .describe('A matching snippet from the document with query term matches'),
  mimeType: z.string().optional().describe('The mime type of the snippets'),
  text: z
    .string()
    .optional()
    .describe('A matching snippet from the document with no highlights'),
  snippetTextOrdering: z
    .number()
    .optional()
    .describe('Used for sorting based off snippet location'),
  ranges: z
    .array(TextRangeSchema)
    .optional()
    .describe('The bolded ranges within text'),
  url: z
    .string()
    .optional()
    .describe('URL that links to the position of the snippet text'),
});

/**
 * Schema for query suggestion in search requests.
 */
export const QuerySuggestionSchema = z.object({
  query: z.string().describe('The suggested query'),
  label: z
    .string()
    .optional()
    .describe('User-facing description of the suggestion'),
  datasource: z
    .string()
    .optional()
    .describe('The datasource associated with the suggestion'),
});

/**
 * Schema for document spec in search requests.
 */
export const DocumentSpecSchema = z.union([
  z.object({
    url: z.string().optional().describe('The URL of the document'),
  }),
  z.object({
    id: z.string().optional().describe('The ID of the document'),
  }),
  z.object({
    ugcType: z
      .enum(['ANNOUNCEMENTS', 'ANSWERS', 'COLLECTIONS', 'SHORTCUTS'])
      .optional()
      .describe('The type of the user generated content'),
    contentId: z
      .number()
      .optional()
      .describe('The id for user generated content'),
    docType: z
      .string()
      .optional()
      .describe('The specific type of the user generated content type'),
  }),
]);
