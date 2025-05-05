import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, debug, trace, error, LogLevel } from '../../log/logger.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Helper to sanitize timestamps and stack traces in log output for snapshotting
function sanitizeLogOutput(log: string): string {
  // Replace ISO timestamps in brackets with [<TIMESTAMP>]
  let sanitized = log.replace(
    /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/g,
    '[<TIMESTAMP>]',
  );
  // Replace stack traces (Error: ... and following indented lines) with <STACK_TRACE>
  sanitized = sanitized.replace(
    /(Error: [^\n]+\n)([ ]+at [^\n]+\n?)+/g,
    'Error: <STACK_TRACE>\n',
  );
  return sanitized;
}

// Helper to get the log file path in the temp XDG state dir
function getLogFilePath(tmpDir: string, appName = 'glean') {
  return path.join(tmpDir, appName, 'mcp.log');
}

describe('Logger (file output, XDG, fixturify)', () => {
  let tmpDir: string;
  let originalXdgStateHome: string | undefined;

  beforeEach(() => {
    // Create a temp directory and set XDG_STATE_HOME
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
    originalXdgStateHome = process.env.XDG_STATE_HOME;
    process.env.XDG_STATE_HOME = tmpDir;
    Logger.reset();
  });

  afterEach(() => {
    // Restore XDG_STATE_HOME and clean up temp dir
    if (originalXdgStateHome) {
      process.env.XDG_STATE_HOME = originalXdgStateHome;
    } else {
      delete process.env.XDG_STATE_HOME;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes debug, trace, and error messages to the log file at TRACE level', () => {
    const logger = Logger.getInstance();
    logger.setLogLevel(LogLevel.TRACE);
    debug('debug message');
    trace('trace message');
    error('error message');

    const logFilePath = getLogFilePath(tmpDir);
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(sanitizeLogOutput(logContent)).toMatchInlineSnapshot(`
      "[<TIMESTAMP>] [DEBUG] debug message
      [<TIMESTAMP>] [TRACE] trace message
      [<TIMESTAMP>] [ERROR] error message
      "
    `);
  });

  it('does not write debug or trace at ERROR level, but writes error', () => {
    const logger = Logger.getInstance();
    logger.setLogLevel(LogLevel.ERROR);
    debug('debug message');
    trace('trace message');
    error('error message');

    const logFilePath = getLogFilePath(tmpDir);
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(sanitizeLogOutput(logContent)).toMatchInlineSnapshot(`
      "[<TIMESTAMP>] [ERROR] error message
      "
    `);
  });

  it('writes debug but not trace at DEBUG level', () => {
    const logger = Logger.getInstance();
    logger.setLogLevel(LogLevel.DEBUG);
    debug('debug message');
    trace('trace message');
    error('error message');

    const logFilePath = getLogFilePath(tmpDir);
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(sanitizeLogOutput(logContent)).toMatchInlineSnapshot(`
      "[<TIMESTAMP>] [DEBUG] debug message
      [<TIMESTAMP>] [ERROR] error message
      "
    `);
  });

  it('writes only error at ERROR level', () => {
    const logger = Logger.getInstance();
    logger.setLogLevel(LogLevel.ERROR);
    debug('debug message');
    trace('trace message');
    error('error message');

    const logFilePath = getLogFilePath(tmpDir);
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(sanitizeLogOutput(logContent)).toMatchInlineSnapshot(`
      "[<TIMESTAMP>] [ERROR] error message
      "
    `);
  });

  it('logs Error objects with name, message, and stack trace', () => {
    const logger = Logger.getInstance();
    logger.setLogLevel(LogLevel.TRACE);
    const err = new Error('something went wrong');
    error('an error occurred', err);

    const logFilePath = getLogFilePath(tmpDir);
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(sanitizeLogOutput(logContent)).toMatchInlineSnapshot(`
      "[<TIMESTAMP>] [ERROR] an error occurred [Error: something went wrong]
      Error: <STACK_TRACE>
      "
    `);
  });

  it('logs non-Error objects as JSON', () => {
    const logger = Logger.getInstance();
    logger.setLogLevel(LogLevel.TRACE);
    debug('object log', { foo: 'bar', baz: 42 });

    const logFilePath = getLogFilePath(tmpDir);
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(sanitizeLogOutput(logContent)).toMatchInlineSnapshot(`
      "[<TIMESTAMP>] [DEBUG] object log {"foo":"bar","baz":42}
      "
    `);
  });

  it('logs Error objects with nested causes', () => {
    const logger = Logger.getInstance();
    logger.setLogLevel(LogLevel.TRACE);
    const root = new Error('root cause');
    const mid = new Error('mid cause');
    (mid as any).cause = root;
    const top = new Error('top level');
    (top as any).cause = mid;
    error('error with causes', top);

    const logFilePath = getLogFilePath(tmpDir);
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(sanitizeLogOutput(logContent)).toMatchInlineSnapshot(`
      "[<TIMESTAMP>] [ERROR] error with causes [Error: top level]
      Error: <STACK_TRACE>
      Caused by:   [Error: mid cause]
        Caused by:     [Error: root cause]
      "
    `);
  });
});
