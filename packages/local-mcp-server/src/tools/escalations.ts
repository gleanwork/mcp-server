import {
  getConfig,
  isGleanTokenConfig,
} from '@gleanwork/mcp-server-utils/config';
import { z } from 'zod';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export const ToolEscalationsGetSchema = z.object({
  query: z
    .string()
    .describe('Optional search query to filter escalations.')
    .optional(),

  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .describe(
      `Maximum number of escalations to return (1-${MAX_LIMIT}, default ${DEFAULT_LIMIT}).`,
    )
    .optional(),

  offset: z
    .number()
    .int()
    .min(0)
    .describe('Number of results to skip for pagination (default 0).')
    .optional(),
});

export type ToolEscalationsGetRequest = z.infer<
  typeof ToolEscalationsGetSchema
>;

interface EscalationsAPIRequest {
  query?: string;
  pageSize: number;
  cursor?: string;
}

function convertToAPIRequest(input: ToolEscalationsGetRequest) {
  const request: EscalationsAPIRequest = {
    pageSize: input.limit ?? DEFAULT_LIMIT,
  };

  if (input.query) {
    request.query = input.query;
  }

  if (input.offset !== undefined && input.offset > 0) {
    request.cursor = String(input.offset);
  }

  return request;
}

export async function escalationsGet(params: ToolEscalationsGetRequest) {
  const apiRequest = convertToAPIRequest(params);

  const config = await getConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (isGleanTokenConfig(config)) {
    headers['Authorization'] = `Bearer ${config.token}`;

    const { actAs } = config;
    if (actAs) {
      headers['X-Glean-ActAs'] = actAs;
    }
  }

  const response = await fetch(
    `${config.baseUrl}rest/api/v1/escalations`,
    {
      method: 'POST',
      body: JSON.stringify(apiRequest),
      headers,
    },
  );

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

export function formatResponse(escalationsResponse: any): string {
  if (
    !escalationsResponse ||
    !Array.isArray(escalationsResponse.results) ||
    escalationsResponse.results.length === 0
  ) {
    return 'No escalations found.';
  }

  const { results } = escalationsResponse;

  const formatted = results
    .map((esc: any, index: number) => {
      const title = esc.title || 'Untitled escalation';
      const status = esc.status || 'Unknown';
      const priority = esc.priority || 'Unknown';
      const createdAt = esc.createdAt
        ? new Date(esc.createdAt).toLocaleDateString()
        : 'Unknown date';
      const assignee = esc.assignee?.name || esc.assignee?.email || 'Unassigned';
      const description = esc.description
        ? esc.description.slice(0, 200) +
          (esc.description.length > 200 ? '...' : '')
        : 'No description';
      const url = esc.url || '';

      return `[${index + 1}] ${title}
  Status: ${status} | Priority: ${priority}
  Assignee: ${assignee} | Created: ${createdAt}
  ${description}${url ? `\n  URL: ${url}` : ''}`;
    })
    .join('\n\n');

  const total =
    typeof escalationsResponse.totalCount === 'number'
      ? escalationsResponse.totalCount
      : results.length;
  const hasMore = escalationsResponse.hasMoreResults === true;

  let summary = `Found ${total} escalation${total === 1 ? '' : 's'}`;
  if (hasMore) {
    summary += ' (more results available — increase offset to paginate)';
  }

  return `${summary}:\n\n${formatted}`;
}
