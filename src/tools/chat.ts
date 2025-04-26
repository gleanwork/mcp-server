import { z } from 'zod';
import { getClient } from '../common/client.js';
import { ChatRequest$inboundSchema as ChatRequestSchema } from '@gleanwork/api-client/models/components';

export const ChatSchema = ChatRequestSchema;
/**
 * Initiates or continues a chat conversation with Glean's AI.
 *
 * @param params The chat parameters
 * @returns The chat response
 * @throws If the chat request fails
 */
export async function chat(params: z.infer<typeof ChatRequestSchema>) {
  const parsedParams = ChatRequestSchema.parse(params);
  const client = getClient();

  return await client.chat.start(parsedParams);
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
