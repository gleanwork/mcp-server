import crypto from 'node:crypto';

/**
 * A PKCE pair: codeVerifier and codeChallenge.
 */
export type PkcePair = {
  codeVerifier: string;
  codeChallenge: string;
};

/**
 * Generates a random PKCE code verifier (43-128 characters).
 * @returns {string} The code verifier.
 */
export function generateCodeVerifier(length = 128): string {
  // Allowed chars: ALPHA / DIGIT / '-' / '.' / '_' / '~'
  // We'll use base64url encoding of random bytes, then trim to length
  const bytes = crypto.randomBytes(length);
  return base64UrlEncode(bytes).slice(0, length);
}

/**
 * Generates a PKCE code challenge from a code verifier.
 * @param {string} codeVerifier - The code verifier.
 * @returns {Promise<string>} The code challenge (base64url-encoded SHA256 hash).
 */
export async function generateCodeChallenge(
  codeVerifier: string,
): Promise<string> {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return base64UrlEncode(hash);
}

/**
 * Helper to generate both code verifier and code challenge.
 * @returns {Promise<PkcePair>}
 */
export async function generatePkcePair(): Promise<PkcePair> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  return { codeVerifier, codeChallenge };
}

/**
 * Base64-url encodes a buffer (RFC 4648 §5).
 * @param {Buffer} buffer
 * @returns {string}
 */
export function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
