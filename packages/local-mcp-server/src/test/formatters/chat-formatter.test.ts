import { describe, it, expect } from 'vitest';
import { formatResponse } from '../../tools/chat';

describe('Chat Formatter', () => {
  it('should format chat responses correctly', () => {
    const mockChatResponse = {
      messages: [
        {
          author: 'USER',
          fragments: [
            {
              text: 'What is Glean?',
            },
          ],
          messageId: 'user-msg-1',
        },
        {
          author: 'GLEAN_AI',
          fragments: [
            {
              text: 'Glean is an AI platform for work that helps organizations find and understand information. It provides enterprise search, AI assistants, and agent capabilities.',
            },
          ],
          citations: [
            {
              sourceDocument: {
                title: 'Glean Website',
                url: 'https://www.glean.com/',
              },
            },
            {
              sourceDocument: {
                title: 'Glean Documentation',
                url: 'https://docs.glean.com/',
              },
            },
          ],
          messageId: 'assistant-msg-1',
          messageType: 'UPDATE',
          stepId: 'RESPOND',
        },
      ],
      conversationId: 'mock-conversation-id',
    };

    const formattedChat = formatResponse(mockChatResponse);

    expect(formattedChat).toContain('USER: What is Glean?');
    expect(formattedChat).toContain(
      'GLEAN_AI (UPDATE) [Step: RESPOND]: Glean is an AI platform for work',
    );
    expect(formattedChat).toContain('Sources:');
    expect(formattedChat).toContain(
      '[1] Glean Website - https://www.glean.com/',
    );
    expect(formattedChat).toContain(
      '[2] Glean Documentation - https://docs.glean.com/',
    );
  });

  it('should handle query suggestion fragments', () => {
    const mockChatResponse = {
      messages: [
        {
          author: 'GLEAN_AI',
          fragments: [
            {
              querySuggestion: {
                query: 'What can glean assistant do',
                datasource: 'all',
              },
            },
          ],
          messageId: 'query-msg-1',
          messageType: 'UPDATE',
          stepId: 'SEARCH',
        },
      ],
    };

    const formattedChat = formatResponse(mockChatResponse);
    expect(formattedChat).toContain('GLEAN_AI (UPDATE) [Step: SEARCH]');
    expect(formattedChat).toContain('Query: What can glean assistant do');
  });

  it('should handle structured results fragments', () => {
    const mockChatResponse = {
      messages: [
        {
          author: 'GLEAN_AI',
          fragments: [
            {
              structuredResults: [
                {
                  document: {
                    title: 'Glean Assistant Documentation',
                    url: 'https://docs.glean.com/assistant',
                  },
                },
                {
                  document: {
                    title: 'Glean FAQs',
                    url: 'https://help.glean.com/faqs',
                  },
                },
              ],
            },
          ],
          messageId: 'results-msg-1',
          messageType: 'UPDATE',
          stepId: 'SEARCH',
        },
      ],
    };

    const formattedChat = formatResponse(mockChatResponse);
    expect(formattedChat).toContain('GLEAN_AI (UPDATE) [Step: SEARCH]');
    expect(formattedChat).toContain(
      'Document: Glean Assistant Documentation (https://docs.glean.com/assistant)',
    );
    expect(formattedChat).toContain(
      'Document: Glean FAQs (https://help.glean.com/faqs)',
    );
  });

  it('should handle empty messages', () => {
    const emptyMessages = {
      messages: [],
      conversationId: 'empty-conversation',
    };

    const formattedChat = formatResponse(emptyMessages);
    expect(formattedChat).toBe('No response received.');
  });

  it('should handle missing messages', () => {
    const noMessages = {};
    const formattedChat = formatResponse(noMessages);
    expect(formattedChat).toBe('No response received.');
  });

  it('should handle messages without fragments', () => {
    const messagesWithoutFragments = {
      messages: [
        {
          author: 'USER',
        },
        {
          author: 'GLEAN_AI',
          citations: [
            {
              sourceDocument: {
                title: 'Test Source',
                url: 'https://example.com',
              },
            },
          ],
          messageType: 'CONTENT',
        },
      ],
    };

    const formattedChat = formatResponse(messagesWithoutFragments);
    expect(formattedChat).toContain('USER:');
    expect(formattedChat).toContain('GLEAN_AI (CONTENT):');
    expect(formattedChat).toContain('[1] Test Source - https://example.com');
  });

  it('should handle messages without citations', () => {
    const messagesWithoutCitations = {
      messages: [
        {
          author: 'USER',
          fragments: [
            {
              text: 'Hello',
            },
          ],
        },
        {
          author: 'GLEAN_AI',
          fragments: [
            {
              text: 'Hi there! How can I help you today?',
            },
          ],
          messageType: 'CONTENT',
        },
      ],
    };

    const formattedChat = formatResponse(messagesWithoutCitations);
    expect(formattedChat).toContain('USER: Hello');
    expect(formattedChat).toContain(
      'GLEAN_AI (CONTENT): Hi there! How can I help you today?',
    );
    expect(formattedChat).not.toContain('Sources:');
  });

  it('should handle mixed fragment types in a single message', () => {
    const mixedFragmentsMessage = {
      messages: [
        {
          author: 'GLEAN_AI',
          fragments: [
            {
              text: 'Searching for:',
            },
            {
              querySuggestion: {
                query: 'Glean assistant capabilities',
                datasource: 'all',
              },
            },
            {
              text: 'Here are the results:',
            },
            {
              structuredResults: [
                {
                  document: {
                    title: 'Glean Assistant Features',
                    url: 'https://docs.glean.com/features',
                  },
                },
              ],
            },
          ],
          messageId: 'mixed-msg-1',
          messageType: 'UPDATE',
          stepId: 'SEARCH',
        },
      ],
    };

    const formattedChat = formatResponse(mixedFragmentsMessage);
    expect(formattedChat).toContain('GLEAN_AI (UPDATE) [Step: SEARCH]');
    expect(formattedChat).toContain('Searching for:');
    expect(formattedChat).toContain('Query: Glean assistant capabilities');
    expect(formattedChat).toContain('Here are the results:');
    expect(formattedChat).toContain(
      'Document: Glean Assistant Features (https://docs.glean.com/features)',
    );
  });
});
