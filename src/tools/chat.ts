import { z } from 'zod';
import { getClient } from '../common/client.js';

/**
 * Schema for agent configuration in chat requests.
 * Defines the agent that will execute the request.
 *
 * @type {z.ZodObject}
 */
const AgentConfigSchema = z.object({
  agent: z.enum(['DEFAULT', 'GPT']).optional().describe('Name of the agent'),
  mode: z
    .enum(['DEFAULT', 'QUICK'])
    .optional()
    .describe('Top level modes to run GleanChat in'),
});

/**
 * Schema for parameter in action requests.
 * Defines the structure for parameters in action requests.
 *
 * @type {z.ZodObject}
 */
const ParameterSchema = z.object({
  description: z.string().optional().describe('Description of the parameter'),
  displayName: z.string().optional().describe('Display name for the parameter'),
  isRequired: z.boolean().optional().describe('Whether the parameter is required'),
  label: z.string().optional().describe('Label for the parameter'),
  type: z.enum(['UNKNOWN', 'INTEGER', 'STRING', 'BOOLEAN']).optional().describe('Data type of the parameter'),
  value: z.string().optional().describe('Value of the parameter'),
});

/**
 * Schema for action in chat message fragments.
 * Defines the structure for actions in chat message fragments.
 *
 * @type {z.ZodObject}
 */
const ActionSchema = z.object({
  parameters: z.record(z.string(), ParameterSchema).optional().describe('Map of parameter names to parameter definitions'),
});

/**
 * Schema for chat file references in message fragments.
 * Defines the structure for file references in chat message fragments.
 *
 * @type {z.ZodObject}
 */
const ChatFileSchema = z.object({
  id: z.string().describe('Unique identifier for the file'),
  name: z.string().describe('Name of the file'),
});

/**
 * Schema for chat message citation.
 * Defines information about the source for a chat message.
 *
 * @type {z.ZodObject}
 */
const ChatMessageCitationSchema = z.object({
  sourceDocument: z.object({
    id: z.string().describe('Document ID'),
    title: z.string().optional().describe('Document title'),
    referenceRanges: z.array(
      z.object({
        textRange: z.object({
          startIndex: z.number().describe('Inclusive start index of the range'),
          endIndex: z.number().describe('Exclusive end index of the range'),
          type: z.enum(['BOLD', 'CITATION', 'LINK']).describe('Type of formatting to apply')
        }).describe('A subsection of text with special formatting')
      })
    ).optional().describe('Ranges within the document that are referenced')
  }).describe('The document that is the source of the citation')
});

/**
 * Schema for chat message fragments.
 * Defines parts of a chat message that originate from a single action/tool.
 *
 * @type {z.ZodObject}
 */
const ChatMessageFragmentSchema = z.object({
  text: z.string().optional().describe('Text content of the fragment'),
  action: ActionSchema.optional().describe('Action information for the fragment'),
  file: ChatFileSchema.optional().describe('File referenced in the message fragment'),
  querySuggestion: z.any().optional().describe('Search query suggestion associated with the fragment'),
  structuredResults: z.array(z.any()).optional().describe('Structured results associated with the fragment'),
});

/**
 * Schema for restriction filters in chat requests.
 * Defines the structure for inclusion/exclusion filters.
 *
 * @type {z.ZodObject}
 */
const ChatRestrictionFiltersSchema = z.object({
  datasources: z.array(z.string()).optional().describe('List of datasources to include/exclude'),
});

/**
 * Schema for chat messages.
 * Defines a message that is rendered as one coherent unit with one given sender.
 *
 * @type {z.ZodObject}
 */
const ChatMessageSchema = z.object({
  agentConfig: AgentConfigSchema.optional().describe('Agent config that generated this message'),
  author: z.enum(['USER', 'GLEAN_AI']).optional().default('USER').describe('Author of the message'),
  citations: z.array(ChatMessageCitationSchema).optional().describe('Citations used to generate the response'),
  fragments: z.array(ChatMessageFragmentSchema).optional().describe('Rich data representing the response or request'),
  messageId: z.string().optional().describe('Unique server-side generated ID for the message'),
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
    .describe('Type of the message'),
  ts: z.string().optional().describe('Response timestamp of the message'),
  uploadedFileIds: z.array(z.string()).optional().describe('IDs of files uploaded in the message'),
  hasMoreFragments: z.boolean().optional().describe('Whether more fragments will follow in subsequent messages'),
});

/**
 * Schema for chat request parameters.
 * Defines the structure for initiating or continuing a chat conversation with Glean's AI.
 *
 * @type {z.ZodObject}
 */
export const ChatSchema = z.object({
  messages: z.array(ChatMessageSchema).describe('List of chat messages, from most recent to least recent'),
  agentConfig: AgentConfigSchema.optional().describe('Describes the agent that will execute the request'),
  chatId: z.string().optional().describe('ID of the Chat to retrieve context from and add messages to'),
  saveChat: z.boolean().optional().describe('Save the interaction as a Chat for the user to access later'),
  stream: z.boolean().optional().describe('If true, response lines will be streamed one-by-one as they become available'),
  timeoutMillis: z.number().optional().describe('Request timeout in milliseconds'),
  applicationId: z.string().optional().describe('ID of the application this request originates from'),
  timezoneOffset: z.number().optional().describe('Offset of client timezone in minutes from UTC'),
  inclusions: ChatRestrictionFiltersSchema.optional().describe('Filters that only allow chat to access certain content'),
  exclusions: ChatRestrictionFiltersSchema.optional().describe('Filters that disallow chat from accessing certain content'),
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
  const client = getClient();
  return await client.chat(params);
}
