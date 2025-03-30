import { z } from 'zod';
import { getClient } from '../common/client.js';
import {
  DocumentSchema,
  DocumentSpecSchema,
  QuerySuggestionSchema,
  SearchResultSnippetSchema,
  TextRangeSchema,
} from './schemas.js';

/**
 * Schema for agent configuration in chat requests.
 * Defines the agent that will execute the request.
 *
 * @type {z.ZodObject}
 */
export const AgentConfigSchema = z.object({
  agent: z
    .enum(['DEFAULT', 'GPT'])
    .optional()
    .default('DEFAULT')
    .describe('Name of the agent'),
  mode: z
    .enum(['DEFAULT', 'QUICK'])
    .optional()
    .default('DEFAULT')
    .describe('Top level modes to run GleanChat in'),
});

/**
 * Schema for parameter in action requests.
 * Defines the structure for parameters in action requests.
 *
 * @type {z.ZodObject}
 */
export const ParameterSchema = z.object({
  description: z.string().optional().describe('Description of the parameter'),
  displayName: z.string().optional().describe('Display name for the parameter'),
  isRequired: z
    .boolean()
    .optional()
    .describe('Whether the parameter is required'),
  label: z.string().optional().describe('Label for the parameter'),
  type: z
    .enum(['UNKNOWN', 'INTEGER', 'STRING', 'BOOLEAN'])
    .optional()
    .describe('Data type of the parameter'),
  value: z.string().optional().describe('Value of the parameter'),
});

/**
 * Schema for action in chat message fragments.
 * Defines the structure for actions in chat message fragments.
 *
 * @type {z.ZodObject}
 */
export const ActionSchema = z.object({
  parameters: z
    .record(z.string(), ParameterSchema)
    .optional()
    .describe('Map of parameter names to parameter definitions'),
});

/**
 * Schema for chat file references in message fragments.
 * Defines the structure for file references in chat message fragments.
 *
 * @type {z.ZodObject}
 */
export const ChatFileSchema = z.object({
  id: z.string().describe('Unique identifier for the file'),
  name: z.string().describe('Name of the file'),
});

/**
 * Schema for chat message citation.
 * Defines information about the source for a chat message.
 *
 * @type {z.ZodObject}
 */
export const ChatMessageCitationSchema = z.object({
  sourceDocument: z
    .object({
      id: z.string().describe('Document ID'),
      title: z.string().optional().describe('Document title'),
      referenceRanges: z
        .array(
          z.object({
            textRange: TextRangeSchema.describe(
              'A subsection of text with special formatting',
            ),
          }),
        )
        .optional()
        .describe('Ranges within the document that are referenced'),
    })
    .describe('The document that is the source of the citation'),
});

/**
 * Schema for structured results in chat message fragments.
 */
export const StructuredResultSchema = z.object({
  document: DocumentSchema.optional().describe(
    'The document this result represents',
  ),
  snippets: z
    .array(SearchResultSnippetSchema)
    .optional()
    .describe('Any snippets associated to the populated object'),
  trackingToken: z
    .string()
    .optional()
    .describe('An opaque token that represents this particular result'),
});

/**
 * Schema for chat message fragments.
 * Defines parts of a chat message that originate from a single action/tool.
 *
 * @type {z.ZodObject}
 */
export const ChatMessageFragmentSchema = z.object({
  text: z.string().optional().describe('Text content of the fragment'),
  action: ActionSchema.optional().describe(
    'Action information for the fragment',
  ),
  file: ChatFileSchema.optional().describe(
    'File referenced in the message fragment',
  ),
  querySuggestion: QuerySuggestionSchema.optional().describe(
    'Search query suggestion associated with the fragment',
  ),
  structuredResults: z
    .array(StructuredResultSchema)
    .optional()
    .describe('Structured results associated with the fragment'),
});

/**
 * Schema for restriction filters in chat requests.
 * Defines the structure for inclusion/exclusion filters.
 *
 * @type {z.ZodObject}
 */
export const ChatRestrictionFiltersSchema = z.object({
  containerSpecs: z
    .array(DocumentSpecSchema)
    .optional()
    .describe(
      'Specifications for containers that should be used as part of the restriction',
    ),
});

/**
 * Schema for chat messages.
 * Defines a message that is rendered as one coherent unit with one given sender.
 *
 * @type {z.ZodObject}
 */
export const ChatMessageSchema = z.object({
  agentConfig: AgentConfigSchema.optional().describe(
    'Agent config that generated this message',
  ),
  author: z
    .enum(['USER', 'GLEAN_AI'])
    .optional()
    .default('USER')
    .describe('Author of the message'),
  citations: z
    .array(ChatMessageCitationSchema)
    .optional()
    .describe('Citations used to generate the response'),
  fragments: z
    .array(ChatMessageFragmentSchema)
    .optional()
    .describe('Rich data representing the response or request'),
  messageId: z
    .string()
    .optional()
    .describe('Unique server-side generated ID for the message'),
  messageType: z
    .enum([
      'UPDATE',
      'CONTENT',
      'CONTEXT',
      'DEBUG',
      'DEBUG_EXTERNAL',
      'ERROR',
      'HEADING',
      'WARNING',
    ])
    .optional()
    .default('CONTENT')
    .describe('Type of the message'),
  ts: z.string().optional().describe('Response timestamp of the message'),
  uploadedFileIds: z
    .array(z.string())
    .optional()
    .describe('IDs of files uploaded in the message'),
  hasMoreFragments: z
    .boolean()
    .optional()
    .describe('Whether more fragments will follow in subsequent messages'),
});

/**
 * Schema for chat request parameters.
 * Defines the structure for initiating or continuing a chat conversation with Glean's AI.
 *
 * @type {z.ZodObject}
 */
export const ChatSchema = z.object({
  messages: z
    .array(ChatMessageSchema)
    .describe('List of chat messages, from most recent to least recent'),
  agentConfig: AgentConfigSchema.optional().describe(
    'Describes the agent that will execute the request',
  ),
  chatId: z
    .string()
    .optional()
    .describe('ID of the Chat to retrieve context from and add messages to'),
  saveChat: z
    .boolean()
    .optional()
    .describe('Save the interaction as a Chat for the user to access later'),
  stream: z
    .boolean()
    .optional()
    .describe(
      'If true, response lines will be streamed one-by-one as they become available',
    ),
  timeoutMillis: z
    .number()
    .optional()
    .describe('Request timeout in milliseconds'),
  applicationId: z
    .string()
    .optional()
    .describe('ID of the application this request originates from'),
  timezoneOffset: z
    .number()
    .optional()
    .describe('Offset of client timezone in minutes from UTC'),
  inclusions: ChatRestrictionFiltersSchema.optional().describe(
    'Filters that only allow chat to access certain content',
  ),
  exclusions: ChatRestrictionFiltersSchema.optional().describe(
    'Filters that disallow chat from accessing certain content',
  ),
});

/**
 * Initiates or continues a chat conversation with Glean's AI.
 *
 * @param {z.infer<typeof ChatSchema>} params - The chat parameters
 * @param {Array<{role: string, content: string}>} params.messages - The conversation history
 * @param {string} [params.conversationId] - ID of an existing conversation to continue
 * @param {Array<{type: string, parameters: object}>} [params.actions] - Actions to perform during chat
 * @param {string} [params.context] - Additional context for the conversation
 * @returns {Promise<object>} The chat response
 * @throws {Error} If the chat request fails
 */
export async function chat(params: z.infer<typeof ChatSchema>) {
  const parsedParams = ChatSchema.parse(params);
  const client = getClient();

  return await client.chat(parsedParams);
}

/**
 * Formats chat responses into a human-readable text format.
 *
 * @param {any} chatResponse - The raw chat response from Glean API
 * @returns {string} Formatted chat response as text
 */
export function formatResponse(chatResponse: any): string {
  if (
    !chatResponse ||
    !chatResponse.messages ||
    !Array.isArray(chatResponse.messages) ||
    chatResponse.messages.length === 0
  ) {
    return 'No response received.';
  }

  const formattedMessages = chatResponse.messages
    .map((message: any) => {
      const author = message.author || 'Unknown';

      let messageText = '';

      if (message.fragments && Array.isArray(message.fragments)) {
        messageText = message.fragments
          .map((fragment: any) => {
            if (fragment.text) {
              return fragment.text;
            } else if (fragment.querySuggestion) {
              return `Query: ${fragment.querySuggestion.query}`;
            } else if (
              fragment.structuredResults &&
              Array.isArray(fragment.structuredResults)
            ) {
              return fragment.structuredResults
                .map((result: any) => {
                  if (result.document) {
                    const doc = result.document;

                    return `Document: ${doc.title || 'Untitled'} (${
                      doc.url || 'No URL'
                    })`;
                  }

                  return '';
                })
                .filter(Boolean)
                .join('\n');
            }

            return '';
          })
          .filter(Boolean)
          .join('\n');
      }

      let citationsText = '';
      if (
        message.citations &&
        Array.isArray(message.citations) &&
        message.citations.length > 0
      ) {
        citationsText =
          '\n\nSources:\n' +
          message.citations
            .map((citation: any, index: number) => {
              const sourceDoc = citation.sourceDocument || {};
              const title = sourceDoc.title || 'Unknown source';
              const url = sourceDoc.url || '';
              return `[${index + 1}] ${title} - ${url}`;
            })
            .join('\n');
      }

      const messageType = message.messageType
        ? ` (${message.messageType})`
        : '';
      const stepId = message.stepId ? ` [Step: ${message.stepId}]` : '';

      return `${author}${messageType}${stepId}: ${messageText}${citationsText}`;
    })
    .join('\n\n');

  return formattedMessages;
}
