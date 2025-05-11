import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockConsole } from 'console-test-helpers';
import { validateFlags } from '../index.js';

describe('validateFlags', () => {
  let resetConsole: () => void;
  let consoleState: any;

  beforeEach(() => {
    ({ resetConsole, consoleState } = mockConsole());
  });

  afterEach(() => {
    resetConsole();
  });

  it('should return false when client is not provided', async () => {
    const result = await validateFlags(
      undefined,
      'token',
      'instance',
      undefined,
      undefined,
    );

    expect(result).toBe(false);
    expect(consoleState.getState('error')).toMatchInlineSnapshot(`
      "Error: --client parameter is required
      Run with --help for usage information"
    `);
  });

  it('should return false when both token/instance and env are provided', async () => {
    const result = await validateFlags(
      'client',
      'token',
      'instance',
      undefined,
      'env-path',
    );

    expect(result).toBe(false);
    expect(consoleState.getState('error')).toMatchInlineSnapshot(`
      "Error: You must provide either --instance OR --env, not both.
      Run with --help for usage information"
    `);
  });

  it('should return false when neither instance nor url is provided', async () => {
    const result = await validateFlags(
      'client',
      undefined,
      undefined,
      undefined,
      undefined,
    );

    expect(result).toBe(false);
    expect(consoleState.getState('error')).toMatchInlineSnapshot(`
      "Error: You must provide either:
        1. --instance for OAuth device flow, or
        2. Both --token and --instance for Glean token auth, or
        3. --env pointing to a .env file containing GLEAN_INSTANCE and optionally GLEAN_API_TOKEN
      Run with --help for usage information"
    `);
  });

  it('should return true but show warning when only token is provided', async () => {
    const result = await validateFlags(
      'client',
      'token',
      undefined,
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toMatchInlineSnapshot(`
      "
      "Warning: Configuring without complete credentials.
      You must provide either:
        1. Both --token and --instance, or
        2. --env pointing to a .env file containing GLEAN_API_TOKEN and GLEAN_INSTANCE

      Continuing with configuration, but you will need to set credentials manually later."
      "
    `);
  });

  it('should return true when only instance is provided (OAuth flow)', async () => {
    const result = await validateFlags(
      'client',
      undefined,
      'instance',
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });

  it('should return true when both token and instance are provided', async () => {
    const result = await validateFlags(
      'client',
      'token',
      'instance',
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });

  it('should return true when env path is provided', async () => {
    const result = await validateFlags(
      'client',
      undefined,
      undefined,
      undefined,
      'env-path',
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });
});
