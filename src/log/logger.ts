import fs from 'fs';
import path from 'path';
import {
  ensureFileExistsWithLimitedPermissions,
  getStateDir as getXDGStateDir,
} from '../xdg/xdg.js';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}

/**
 * A simple logger that exposes functions for standard log levels (`trace,
 * `debug`, &c.) for a singleton logger.
 *
 * Logs are written to `$HOME/.local/state/glean/mcp.log` by default (or the
 * XDG equivalent for windows, or if XDG env vars are set).
 *
 * Logs are intended to be provided by users to help with troubleshooting.
 */
export class Logger {
  private static instance?: Logger;
  private logFilePath: string;
  private logLevel: LogLevel;

  constructor(appName = 'glean') {
    const logDir = getXDGStateDir(appName);

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logFilePath = path.join(logDir, 'mcp.log');
    ensureFileExistsWithLimitedPermissions(this.logFilePath);
    this.logLevel = LogLevel.TRACE; // Default to most verbose logging
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public static reset() {
    Logger.instance = undefined;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private log(level: LogLevel, ...args: any[]): void {
    if (level < this.logLevel) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    let message = '';
    const dataObjects: Record<string, unknown>[] = [];

    // Helper to format errors with causes
    function formatErrorWithCauses(err: Error, indent = 0): string {
      const pad = '  '.repeat(indent);
      let out = `${pad}[${err.name}: ${err.message}]`;
      if (err.stack) {
        // Only include stack for the top-level error
        if (indent === 0) {
          out += `\n${pad}${err.stack.replace(/\n/g, `\n${pad}`)}`;
        }
      }
      // Handle error cause (ES2022 standard, but may be polyfilled)
      const cause = (err as any).cause;
      if (cause instanceof Error) {
        out += `\n${pad}Caused by: ` + formatErrorWithCauses(cause, indent + 1);
      } else if (cause !== undefined) {
        out += `\n${pad}Caused by: ${JSON.stringify(cause)}`;
      }
      return out;
    }

    // Process each argument
    args.forEach((arg) => {
      if (typeof arg === 'string') {
        message += (message ? ' ' : '') + arg;
      } else if (arg instanceof Error) {
        message += (message ? ' ' : '') + formatErrorWithCauses(arg);
      } else if (arg !== null && typeof arg === 'object') {
        dataObjects.push(arg);
      } else if (arg !== undefined) {
        // Convert primitives to string
        message += (message ? ' ' : '') + String(arg);
      }
    });

    let logMessage = `[${timestamp}] [${levelName}] ${message}`;

    // Add data objects if any
    if (dataObjects.length > 0) {
      dataObjects.forEach((data) => {
        logMessage += ` ${JSON.stringify(data)}`;
      });
    }

    logMessage += '\n';

    // Append to log file
    fs.appendFileSync(this.logFilePath, logMessage);
  }

  public trace(...args: any[]): void {
    this.log(LogLevel.TRACE, ...args);
  }

  public debug(...args: any[]): void {
    this.log(LogLevel.DEBUG, ...args);
  }

  public info(...args: any[]): void {
    this.log(LogLevel.INFO, ...args);
  }

  public warn(...args: any[]): void {
    this.log(LogLevel.WARN, ...args);
  }

  public error(...args: any[]): void {
    this.log(LogLevel.ERROR, ...args);
  }
}

// Exported functions
export function trace(...args: any[]): void {
  Logger.getInstance().trace(...args);
}

export function debug(...args: any[]): void {
  Logger.getInstance().debug(...args);
}

export function info(...args: any[]): void {
  Logger.getInstance().info(...args);
}

export function warn(...args: any[]): void {
  Logger.getInstance().warn(...args);
}

export function error(...args: any[]): void {
  Logger.getInstance().error(...args);
}
