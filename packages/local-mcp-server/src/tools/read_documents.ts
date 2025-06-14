/**
 * @fileoverview Read documents tool implementation for the Glean MCP server.
 *
 * This module provides an interface to read documents from Glean through the MCP protocol.
 * It defines the schema for read documents parameters and implements the functionality using
 * the Glean client SDK.
 *
 * @module tools/read-documents
 */

import { z } from 'zod';
import { getClient } from '../common/client.js';
import { GetDocumentsRequest, GetDocumentsRequestIncludeField } from '@gleanwork/api-client/models/components';

/**
 * Schema for Glean read documents requests designed for LLM interaction
 */
export const ToolReadDocumentsSchema = z.object({
  documentSpecs: z
    .array(
      z.object({
        id: z.string().describe('Glean Document ID').optional(),
        url: z.string().describe('Document URL').optional(),
      }).refine(
        (data) => data.id || data.url,
        {
          message: "Either id or url must be provided for each document spec",
          path: ["id", "url"],
        }
      )
    )
    .describe('List of document specifications to retrieve')
    .min(1, "At least one document spec must be provided"),
});

export type ToolReadDocumentsRequest = z.infer<typeof ToolReadDocumentsSchema>;

/**
 * Maps a simplified read documents request to the format expected by the Glean API.
 *
 * @param input Simplified read documents request parameters
 * @returns Glean API compatible read documents request
 */
function convertToAPIReadDocumentsRequest(input: ToolReadDocumentsRequest): GetDocumentsRequest {
  return {
    documentSpecs: input.documentSpecs,
    includeFields: [GetDocumentsRequestIncludeField.DocumentContent],
  };
}

/**
 * Reads documents from Glean.
 *
 * @param params The read documents parameters using the simplified schema
 * @returns The documents
 * @throws If the read documents request fails
 */
export async function readDocuments(params: ToolReadDocumentsRequest) {
  const mappedParams = convertToAPIReadDocumentsRequest(params);
  const client = await getClient();

  return await client.documents.retrieve(mappedParams);
}

/**
 * Formats read documents results into a human-readable text format.
 *
 * @param documentsResponse The raw documents response from Glean API
 * @returns Formatted documents as text
 */
export function formatResponse(documentsResponse: any): string {
  if (
    !documentsResponse ||
    !documentsResponse.documents ||
    typeof documentsResponse.documents !== 'object'
  ) {
    return 'No documents found.';
  }

  const documents = Object.values(documentsResponse.documents) as any[];
  
  if (documents.length === 0) {
    return 'No documents found.';
  }

  const formattedDocuments = documents
    .map((doc: any, index: number) => {
      const title = doc.title || 'No title';
      const url = doc.url || '';
      const docType = doc.docType || 'Document';
      const datasource = doc.datasource || 'Unknown source';
      
      let content = '';
      if (doc.content && doc.content.fullTextList && Array.isArray(doc.content.fullTextList)) {
        content = doc.content.fullTextList.join('\n');
      } else if (doc.content && typeof doc.content === 'string') {
        content = doc.content;
      } else {
        content = 'No content available';
      }

      if (content.length > 2000) {
        content = content.substring(0, 2000) + '...';
      }

      let metadata = '';
      if (doc.metadata?.author?.name) {
        metadata += `Author: ${doc.metadata.author.name}\n`;
      }
      if (doc.metadata?.createTime) {
        metadata += `Created: ${new Date(doc.metadata.createTime).toLocaleDateString()}\n`;
      }
      if (doc.metadata?.updateTime) {
        metadata += `Updated: ${new Date(doc.metadata.updateTime).toLocaleDateString()}\n`;
      }

      return `[${index + 1}] ${title}
        Type: ${docType}
        Source: ${datasource}
        ${metadata}URL: ${url}

        Content:
        ${content}`;
    })
    .join('\n\n---\n\n');

  const totalDocuments = documents.length;

  return `Retrieved ${totalDocuments} document${totalDocuments === 1 ? '' : 's'}:\n\n${formattedDocuments}`;
} 