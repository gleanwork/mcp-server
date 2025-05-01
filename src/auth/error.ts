/**
 * AuthError is an error that will be shown to the end user (with a message, no
 * stack trace).
 *
 * If AuthError is caught it should be re-thrown directly.
 */
export class AuthError extends Error {
  constructor(message: string, options = {}) {
    super(message, options);
    
    this.name = 'AuthError';
    
    Error.captureStackTrace(this, this.constructor);
  }
}
