/**
 * @fileoverview Read documents tool implementation for the Glean MCP server.
 *
 * This module provides an interface to read documents from Glean through the MCP protocol.
 * It defines the schema for read documents parameters and implements the functionality using
 * the Glean client SDK.
 *
 * @module tools/read-documents
 */

import {
  GetDocumentsRequest,
  GetDocumentsRequestIncludeField,
} from '@gleanwork/api-client/models/components';
import {
  AuthError,
  AuthErrorCode,
  ensureAuthTokenPresence,
  loadTokens,
} from '@gleanwork/mcp-server-utils/auth';
import {
  getConfig,
  isGleanTokenConfig,
  isOAuthConfig,
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

  // There's a bug in the client SDK, so using fetch directly for now
  // See https://github.com/gleanwork/api-client-typescript/issues/45

  const config = await getConfig({ discoverOAuth: true });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (isOAuthConfig(config)) {
    if (!(await ensureAuthTokenPresence())) {
      throw new AuthError(
        'No OAuth tokens found. Please run `npx @gleanwork/configure-mcp-server auth` to authenticate.',
        { code: AuthErrorCode.InvalidConfig },
      );
    }

    const tokens = loadTokens();
    if (tokens === null) {
      throw new AuthError(
        'No OAuth tokens found. Please run `npx @gleanwork/configure-mcp-server auth` to authenticate.',
        { code: AuthErrorCode.InvalidConfig },
      );
    }
    headers['X-Glean-Auth-Type'] = 'OAUTH';
    headers['Authorization'] = `Bearer ${tokens?.accessToken}`;
  } else if (isGleanTokenConfig(config)) {
    headers['Authorization'] = `Bearer ${config.token}`;

    const { actAs } = config;
    if (actAs) {
      headers['X-Glean-ActAs'] = actAs;
    }
  } else {
    throw new AuthError(
      'Missing or invalid Glean configuration. Please check that your environment variables are set correctly (e.g. GLEAN_INSTANCE or GLEAN_SUBDOMAIN).',
      { code: AuthErrorCode.InvalidConfig },
    );
  }

  const response = await fetch(`${config.baseUrl}rest/api/v1/getdocuments`, {
    method: 'POST',
    body: JSON.stringify(mappedParams),
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API request failed with status ${response.status}: ${errorText}`,
    );
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const responseText = await response.text();
    throw new Error(
      `Expected JSON response but got ${contentType}: ${responseText}`,
    );
  }

  return response.json();
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
      if (
        doc.content &&
        doc.content.fullTextList &&
        Array.isArray(doc.content.fullTextList)
      ) {
        content = doc.content.fullTextList.join('\n');
      } else if (doc.content && typeof doc.content === 'string') {
        content = doc.content;
      } else {
        content = 'No content available';
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
