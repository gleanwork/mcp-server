/**
 * @fileoverview Chat response buffer for handling large responses that exceed token limits.
 *
 * This module provides intelligent chunking of chat responses to stay within token limits
 * while maintaining readability by splitting at natural boundaries.
 *
 * @module tools/chat-response-buffer
 */

import { randomUUID } from 'crypto';

export interface ChatChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  responseId: string;
  hasMore: boolean;
}

export interface ChunkedResponse {
  content: string;
  metadata?: ChatChunkMetadata;
}

/**
 * Manages chunking of large chat responses to avoid token limit errors.
 */
export class ChatResponseBuffer {
  private static readonly MAX_TOKENS = 20000; // Safe limit below 25k
  private static readonly CHARS_PER_TOKEN = 4; // Rough estimation
  private responses = new Map<string, string[]>();

  /**
   * Process a chat response, chunking it if necessary.
   *
   * @param response The full response text
   * @param responseId Optional ID for continuation support
   * @returns The first chunk and metadata if chunked
   */
  async processResponse(
    response: string,
    responseId?: string,
  ): Promise<ChunkedResponse> {
    // If response is small enough, return as-is
    if (this.estimateTokens(response) <= ChatResponseBuffer.MAX_TOKENS) {
      return { content: response };
    }

    // Generate responseId if not provided
    const id = responseId || randomUUID();

    // Split response intelligently
    const chunks = this.splitResponse(response);
    this.responses.set(id, chunks);

    return {
      content: chunks[0],
      metadata: {
        chunkIndex: 0,
        totalChunks: chunks.length,
        responseId: id,
        hasMore: chunks.length > 1,
      },
    };
  }

  /**
   * Get a specific chunk from a previously chunked response.
   *
   * @param responseId The response ID
   * @param chunkIndex The chunk index to retrieve
   * @returns The requested chunk and metadata
   */
  getChunk(responseId: string, chunkIndex: number): ChunkedResponse | null {
    const chunks = this.responses.get(responseId);
    if (!chunks || chunkIndex >= chunks.length || chunkIndex < 0) {
      return null;
    }

    return {
      content: chunks[chunkIndex],
      metadata: {
        chunkIndex,
        totalChunks: chunks.length,
        responseId,
        hasMore: chunkIndex < chunks.length - 1,
      },
    };
  }

  /**
   * Split a response into chunks at natural boundaries.
   *
   * @param response The full response text
   * @returns Array of chunks
   */
  private splitResponse(response: string): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    let currentTokens = 0;

    // First try to split by double newlines (paragraphs)
    const paragraphs = response.split('\n\n');

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokens(paragraph);

      if (currentTokens + paragraphTokens > ChatResponseBuffer.MAX_TOKENS) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = paragraph;
          currentTokens = paragraphTokens;
        } else {
          // Single paragraph exceeds limit, split by sentences
          chunks.push(...this.splitLargeParagraph(paragraph));
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        currentTokens += paragraphTokens;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Split a large paragraph by sentences.
   *
   * @param paragraph The paragraph to split
   * @returns Array of chunks
   */
  private splitLargeParagraph(paragraph: string): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    let currentTokens = 0;

    // Split by sentence endings (. ! ?)
    const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);

      if (currentTokens + sentenceTokens > ChatResponseBuffer.MAX_TOKENS) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
          currentTokens = sentenceTokens;
        } else {
          // Single sentence exceeds limit, force split
          chunks.push(...this.forceSplit(sentence));
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentTokens += sentenceTokens;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Force split text that can't be split naturally.
   *
   * @param text The text to force split
   * @returns Array of chunks
   */
  private forceSplit(text: string): string[] {
    const maxChars = ChatResponseBuffer.MAX_TOKENS * ChatResponseBuffer.CHARS_PER_TOKEN;
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += maxChars) {
      chunks.push(text.slice(i, i + maxChars));
    }

    return chunks;
  }

  /**
   * Estimate the number of tokens in a text.
   *
   * @param text The text to estimate
   * @returns Estimated token count
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / ChatResponseBuffer.CHARS_PER_TOKEN);
  }

  /**
   * Clean up stored chunks after a certain time.
   *
   * @param responseId The response ID to clean up
   */
  cleanup(responseId: string): void {
    this.responses.delete(responseId);
  }
}

// Export singleton instance
export const chatResponseBuffer = new ChatResponseBuffer();