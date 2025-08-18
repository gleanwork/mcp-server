/**
 * @fileoverview Tool for reading documents from Glean
 *
 * This tool allows reading documents from Glean by ID or URL.
 * It provides a simplified interface for LLM interactions.
 *
 * @module tools/read_documents
 */

import {
  GetDocumentsRequest,
  GetDocumentsRequestIncludeField,
} from '@gleanwork/api-client/models/components';
import {
  getConfig,
  isGleanTokenConfig,
} from '@gleanwork/mcp-server-utils/config';
import { z } from 'zod';

/**
 * Schema for Glean read documents requests designed for LLM interaction
 */
export const ToolReadDocumentsSchema = z.object({
  documentSpecs: z
    .array(
      z
        .object({
          id: z.string().describe('Glean Document ID').optional(),
          url: z.string().describe('Document URL').optional(),
        })
        .refine((data) => data.id || data.url, {
          message: 'Either id or url must be provided for each document spec',
          path: ['id', 'url'],
        }),
    )
    .describe('List of document specifications to retrieve')
    .min(1, 'At least one document spec must be provided'),
});

export type ToolReadDocumentsRequest = z.infer<typeof ToolReadDocumentsSchema>;

/**
 * Maps a simplified read documents request to the format expected by the Glean API.
 *
 * @param input Simplified read documents request parameters
 * @returns Glean API compatible read documents request
 */
function convertToAPIReadDocumentsRequest(
  input: ToolReadDocumentsRequest,
): GetDocumentsRequest {
  return {
    documentSpecs: input.documentSpecs.map((spec) => ({
      ...(spec.id && { id: spec.id }),
      ...(spec.url && { url: spec.url }),
    })),
    includeFields: [GetDocumentsRequestIncludeField.DocumentContent],
  };
}

/**
 * Reads documents from Glean using the provided document specifications.
 *
 * @param params The read documents request parameters
 * @returns A formatted string containing the document content
 * @throws If the read documents request fails
 */
export async function readDocuments(params: ToolReadDocumentsRequest) {
  const mappedParams = convertToAPIReadDocumentsRequest(params);

  // There's a bug in the client SDK, so using fetch directly for now
  // See https://github.com/gleanwork/api-client-typescript/issues/45

  const config = await getConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (isGleanTokenConfig(config)) {
    headers['Authorization'] = `Bearer ${config.token}`;

    const { actAs } = config;
    if (actAs) {
      headers['X-Glean-Act-As'] = actAs;
    }
  }
  // If no token config, continue without auth headers - let API reject if needed

  const response = await fetch(`${config.baseUrl}rest/api/v1/getdocuments`, {
    method: 'POST',
    body: JSON.stringify(mappedParams),
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to read documents: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  const data = (await response.json()) as any;

  if (!data.documents || !Array.isArray(data.documents)) {
    throw new Error('Invalid response format from Glean API');
  }

  // Format the response for LLM consumption
  let result = '';

  for (const doc of data.documents) {
    result += `\n--- Document ---\n`;

    if (doc.title) {
      result += `Title: ${doc.title}\n`;
    }

    if (doc.url) {
      result += `URL: ${doc.url}\n`;
    }

    if (doc.id) {
      result += `ID: ${doc.id}\n`;
    }

    // Add metadata if available
    if (doc.metadata) {
      let metadata = '';
      if (doc.metadata.createdAt) {
        metadata += `Created: ${new Date(doc.metadata.createdAt).toLocaleDateString()}\n`;
      }
      if (doc.metadata.updatedAt) {
        metadata += `Updated: ${new Date(doc.metadata.updatedAt).toLocaleDateString()}\n`;
      }
      if (doc.metadata.author?.name) {
        metadata += `Author: ${doc.metadata.author.name}\n`;
      }
      if (doc.metadata.datasource) {
        metadata += `Source: ${doc.metadata.datasource}\n`;
      }
      if (metadata) {
        result += metadata;
      }
    }

    result += '\n';

    // Add document body
    if (doc.body?.mimeType === 'text/plain' && doc.body.textContent) {
      result += `Content:\n${doc.body.textContent}\n`;
    } else if (doc.body?.mimeType === 'text/html' && doc.body.textContent) {
      // For HTML content, we could strip tags or convert to markdown
      // For now, just include as-is with a note
      result += `Content (HTML):\n${doc.body.textContent}\n`;
    } else if (doc.body) {
      result += `Content: [${doc.body.mimeType || 'Unknown format'}]\n`;
    }

    result += '\n';
  }

  return result.trim();
}
