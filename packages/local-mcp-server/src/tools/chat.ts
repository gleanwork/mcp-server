import { z } from 'zod';
import { getClient } from '../common/client.js';
import {
  ChatRequest,
  ChatRequest$inboundSchema as ChatRequestSchema,
  MessageType,
} from '@gleanwork/api-client/models/components';
import { Author } from '@gleanwork/api-client/models/components';

/**
 * Simplified schema for Glean chat requests designed for LLM interaction
 */
export const ToolChatSchema = z.object({
  message: z
    .string()
    .describe('The user question or message to send to Glean Assistant.'),

  context: z
    .array(z.string())
    .describe(
      'Optional previous messages for context. Will be included in order before the current message.',
    )
    .optional(),
});

export type ToolChatRequest = z.infer<typeof ToolChatSchema>;

/**
 * Maps a simplified chat request to the format expected by the Glean API.
 *
 * @param input Simplified chat request parameters
 * @returns Glean API compatible chat request
 */
function convertToAPIChatRequest(input: ToolChatRequest) {
  const { message, context = [] } = input;

  const messages = [
    ...context.map((text) => ({
      author: Author.User,
      messageType: MessageType.Content,
      fragments: [{ text }],
    })),

    {
      author: Author.User,
      messageType: MessageType.Content,
      fragments: [{ text: message }],
    },
  ];

  const chatRequest: ChatRequest = {
    messages,
  };

  return chatRequest;
}

/**
 * Initiates or continues a chat conversation with Glean's AI.
 *
 * @param params The chat parameters using the simplified schema
 * @returns The chat response
 * @throws If the chat request fails
 */
export async function chat(params: ToolChatRequest) {
  const mappedParams = convertToAPIChatRequest(params);
  const parsedParams = ChatRequestSchema.parse(mappedParams);
  const client = await getClient();

  return await client.chat.create(parsedParams);
}

/**
 * Formats chat responses into a human-readable text format.
 *
 * @param chatResponse The raw chat response from Glean API
 * @returns Formatted chat response as text
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
