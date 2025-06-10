/**
 * @fileoverview Error handling utilities for the Glean MCP server.
 *
 * This module provides custom error types and type guards for handling
 * Glean-specific errors in a consistent way across the codebase.
 *
 * @module common/errors
 */

/**
 * Custom error class for Glean-specific errors.
 * Includes additional context about the error such as HTTP status and response data.
 *
 * @extends {Error}
 */
export class GleanError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response: unknown,
  ) {
    super(message);
    this.name = 'GleanError';
  }
}

/**
 * Error class for invalid request errors (HTTP 400).
 *
 * @extends {GleanError}
 */
export class GleanInvalidRequestError extends GleanError {
  constructor(
    message = 'Invalid request',
    response: unknown = { message: 'Invalid request' },
  ) {
    super(message, 400, response);
    this.name = 'GleanInvalidRequestError';
  }
}

/**
 * Error class for authentication errors (HTTP 401).
 *
 * @extends {GleanError}
 */
export class GleanAuthenticationError extends GleanError {
  constructor(
    message = 'Authentication failed',
    response: unknown = { message: 'Authentication failed' },
  ) {
    super(message, 401, response);
    this.name = 'GleanAuthenticationError';
  }
}

/**
 * Error class for permission errors (HTTP 403).
 *
 * @extends {GleanError}
 */
export class GleanPermissionError extends GleanError {
  constructor(
    message = 'Forbidden',
    response: unknown = { message: 'Forbidden' },
  ) {
    super(message, 403, response);
    this.name = 'GleanPermissionError';
  }
}

/**
 * Error class for request timeout errors (HTTP 408).
 *
 * @extends {GleanError}
 */
export class GleanRequestTimeoutError extends GleanError {
  constructor(
    message = 'Request timeout',
    response: unknown = { message: 'Request timeout' },
  ) {
    super(message, 408, response);
    this.name = 'GleanRequestTimeoutError';
  }
}

/**
 * Error class for validation errors (HTTP 422).
 *
 * @extends {GleanError}
 */
export class GleanValidationError extends GleanError {
  constructor(
    message = 'Invalid query',
    response: unknown = { message: 'Invalid query' },
  ) {
    super(message, 422, response);
    this.name = 'GleanValidationError';
  }
}

/**
 * Error class for rate limit errors (HTTP 429).
 *
 * @extends {GleanError}
 */
export class GleanRateLimitError extends GleanError {
  constructor(
    message = 'Too many requests',
    public readonly resetAt: Date = new Date(Date.now() + 60000),
    response: unknown = {
      message: 'Too many requests',
      reset_at: new Date(Date.now() + 60000).toISOString(),
    },
  ) {
    super(message, 429, response);
    this.name = 'GleanRateLimitError';
  }
}

/**
 * Type guard to check if an error is a GleanError.
 *
 * @param {unknown} error - The error to check
 * @returns {boolean} True if the error is a GleanError
 */
export function isGleanError(error: unknown): error is GleanError {
  return error instanceof GleanError;
}

/**
 * Creates a specific GleanError subclass based on the HTTP status code.
 *
 * @param {number} status - The HTTP status code
 * @param {any} response - The response data
 * @returns {GleanError} The appropriate GleanError subclass
 */
export function createGleanError(status: number, response: any): GleanError {
  switch (status) {
    case 400:
      return new GleanInvalidRequestError(response?.message, response);
    case 401:
      return new GleanAuthenticationError(response?.message, response);
    case 403:
      return new GleanPermissionError(response?.message, response);
    case 408:
      return new GleanRequestTimeoutError(response?.message, response);
    case 422:
      return new GleanValidationError(response?.message, response);
    case 429:
      return new GleanRateLimitError(
        response?.message,
        new Date(response?.reset_at || Date.now() + 60000),
        response,
      );
    default:
      return new GleanError(
        response?.message || 'Glean API error',
        status,
        response,
      );
  }
}

/**
 * Formats a GleanError into a human-readable error message.
 * This function provides detailed error messages based on the specific error type.
 *
 * @param {GleanError} error - The error to format
 * @returns {string} A formatted error message
 */
export function formatGleanError(error: GleanError): string {
  let message = `Glean API Error: ${error.message}`;

  if (error instanceof GleanInvalidRequestError) {
    message = `Invalid Request: ${error.message}`;
    if (error.response) {
      message += `\nDetails: ${JSON.stringify(error.response)}`;
    }
  } else if (error instanceof GleanAuthenticationError) {
    message = `Authentication Failed: ${error.message}`;
  } else if (error instanceof GleanPermissionError) {
    message = `Permission Denied: ${error.message}`;
  } else if (error instanceof GleanRequestTimeoutError) {
    message = `Request Timeout: ${error.message}`;
  } else if (error instanceof GleanValidationError) {
    message = `Invalid Query: ${error.message}`;
    if (error.response) {
      message += `\nDetails: ${JSON.stringify(error.response)}`;
    }
  } else if (error instanceof GleanRateLimitError) {
    message = `Rate Limit Exceeded: ${error.message}`;
    message += `\nResets at: ${error.resetAt.toISOString()}`;
  }

  return message;
}
