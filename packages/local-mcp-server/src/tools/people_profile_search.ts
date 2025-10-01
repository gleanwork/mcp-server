import { z } from 'zod';
import { getClient } from '../common/client.js';
import {
  ListEntitiesRequest,
  ListEntitiesRequestEntityType,
  ListEntitiesRequest$inboundSchema as ListEntitiesRequestSchema,
} from '@gleanwork/api-client/models/components';

// Allowed facet names for filtering people searches.
export const PEOPLE_FACETS_VALUES = [
  'email',
  'first_name',
  'last_name',
  'manager_email',
  'department',
  'title',
  'location',
  'city',
  'country',
  'state',
  'region',
  'business_unit',
  'team',
  'team_id',
  'nickname',
  'preferred_name',
  'roletype',
  'reportsto',
  'startafter',
  'startbefore',
  'industry',
  'has',
  'from',
] as const;

/**
 * Simplified schema for people profile search requests designed for LLM interaction
 */
export const ToolPeopleProfileSearchSchema = z
  .object({
    query: z
      .string()
      .describe('Free-text query to search people by name, title, etc.')
      .optional(),

    filters: z
      .record(z.string(), z.string())
      .refine(
        (val) => Object.keys(val).every(key => PEOPLE_FACETS_VALUES.includes(key as any)),
        { message: 'Invalid filter key. Must be one of: ' + PEOPLE_FACETS_VALUES.join(', ') }
      )
      .describe(
        'Allowed facet fields: email, first_name, last_name, manager_email, department, title, location, city, country, state, region, business_unit, team, team_id, nickname, preferred_name, roletype, reportsto, startafter, startbefore, industry, has, from. Provide as { "facet": "value" }.',
      )
      .optional(),

    pageSize: z
      .number()
      .int()
      .min(1)
      .max(100)
      .describe(
        'Hint to the server for how many people to return (1-100, default 10).',
      )
      .optional(),
  })
  .refine(
    (val) => val.query || (val.filters && Object.keys(val.filters).length > 0),
    {
      message: 'At least one of "query" or "filters" must be provided.',
      path: [],
    },
  );

export type ToolPeopleProfileSearchRequest = z.infer<
  typeof ToolPeopleProfileSearchSchema
>;

/**
 * Converts a simplified request to a Glean API ListEntitiesRequest.
 *
 * @param input The simplified request parameters
 * @returns The Glean API compatible request
 */
function convertToAPIEntitiesRequest(input: ToolPeopleProfileSearchRequest) {
  const { query, filters = {}, pageSize } = input;

  const request: ListEntitiesRequest = {
    entityType: ListEntitiesRequestEntityType.People,
    pageSize: pageSize || 10,
  };

  if (query) {
    request.query = query;
  }

  const filterKeys = Object.keys(filters) as Array<keyof typeof filters>;
  if (filterKeys.length > 0) {
    request.filter = filterKeys.map((fieldName) => {
      const value = filters[fieldName];
      return {
        fieldName: String(fieldName),
        values: [
          {
            relationType: 'EQUALS',
            value: value as string,
          },
        ],
      };
    });
  }

  return request;
}

/**
 * Executes a people profile search using the Glean API.
 *
 * @param params The search parameters using the simplified schema
 * @returns The search results
 */
export async function peopleProfileSearch(
  params: ToolPeopleProfileSearchRequest,
) {
  const mappedParams = convertToAPIEntitiesRequest(params);
  const parsedParams = ListEntitiesRequestSchema.parse(mappedParams) as ListEntitiesRequest;
  const client = await getClient();

  return await client.entities.list(parsedParams);
}

/**
 * Formats the search results for human consumption.
 *
 * @param searchResults The raw search results from Glean API
 * @returns Formatted search results as text
 */
export function formatResponse(searchResults: any): string {
  if (
    !searchResults ||
    !Array.isArray(searchResults.results) ||
    searchResults.results.length === 0
  ) {
    return 'No matching people found.';
  }

  const formatted = searchResults.results
    .map((person: any, index: number) => {
      const metadata = person.metadata ?? {};

      const displayName = metadata.preferredName || person.name || 'Unnamed';

      const title = metadata.title || 'Unknown title';

      const department = metadata.department || 'Unknown department';

      const location =
        metadata.location ||
        metadata.structuredLocation?.city ||
        metadata.structuredLocation?.country ||
        'Unknown location';

      const email =
        metadata.email || metadata.aliasEmails?.[0] || 'Unknown email';

      // Show first team affiliation if present for additional context
      const primaryTeam =
        Array.isArray(metadata.teams) && metadata.teams.length > 0
          ? metadata.teams[0].name
          : undefined;

      const teamSuffix = primaryTeam ? ` [${primaryTeam}]` : '';

      return `${index + 1}. ${displayName} – ${title}${teamSuffix}, ${department} (${location}) • ${email}`;
    })
    .join('\n');

  const total =
    typeof searchResults.totalCount === 'number'
      ? searchResults.totalCount
      : searchResults.results.length;

  return `Found ${total} people:\n\n${formatted}`;
}
