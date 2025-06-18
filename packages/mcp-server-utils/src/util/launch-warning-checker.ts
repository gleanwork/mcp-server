import open from 'open';
import { trace } from '../log/logger.js';

/**
 * Result of checking for launch warnings
 */
export interface LaunchWarningResult {
  /** Whether a warning URL was found and opened */
  opened: boolean;
  /** The URL that was checked */
  url: string;
  /** Any error that occurred during the process */
  error?: Error;
}

const BASE_URL = 'https://gleanwork.github.io/mcp-server/warnings/launch/';

const TIMEOUT_MS = 1000;

/**
 * Determines the version string to use in the URL based on semantic versioning rules
 * - If major version > 0: Use only the major version (e.g., "1.2.3" → "v1")
 * - If major version = 0: Use major.minor (e.g., "0.6.3" → "v0.6")
 */
export function getVersionString(version: string): string {
  const versionMatch = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!versionMatch) {
    throw new Error(`Invalid version format: ${version}`);
  }

  const [, major, minor] = versionMatch;
  const majorNum = parseInt(major, 10);

  if (majorNum > 0) {
    return `v${major}`;
  } else {
    return `v${major}.${minor}`;
  }
}

/**
 * Builds the launch warning URL based on the version
 */
export function buildLaunchWarningUrl(version: string): string {
  const versionString = getVersionString(version);
  return `${BASE_URL}${versionString}.md`;
}

/**
 * Checks if a URL exists by making a HEAD request
 * Returns true if the URL exists (status 200-299), false otherwise
 */
export async function checkUrlExists(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

/**
 * Opens a URL in the default browser
 */
export async function openInBrowser(url: string): Promise<void> {
  await open(url);
}

/**
  Checks for known version-specific launch warnings and automatically opens
  them in the browser.
  
  This function is the main entry point for the launch warning system. It
  takes a package version, constructs a URL to check for known issues
  documentation, verifies the URL exists remotely, and if found, opens the
  warning page in the user's default browser.
  
  @param version - The semantic version string of the package (e.g., "1.2.3", "0.6.1")
  
  @returns Promise resolving to LaunchWarningResult containing:
    - `opened`: true if a warning was found and browser was opened, false otherwise
    - `url`: the warning URL that was constructed and checked
    - `error`: any error that occurred during URL building, network checking, or browser opening
  
  @example
  ```typescript
  const result = await checkAndOpenLaunchWarning("1.2.3");
  if (result.opened) {
    console.log(`Opened warning page: ${result.url}`);
  } else if (result.error) {
    console.error(`Failed to check warnings: ${result.error.message}`);
  } else {
    console.log(`No warnings found for version 1.2.3`);
  }
  ```
  
  @throws Never throws directly - all errors are caught and returned in the result object
 */
export async function checkAndOpenLaunchWarning(
  version: string,
): Promise<LaunchWarningResult> {
  let url: string;

  try {
    url = buildLaunchWarningUrl(version);
  } catch (error) {
    trace('launch-warning-checker', 'Error building URL:', error);
    return {
      opened: false,
      url: '',
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  let versionWarningExists: boolean | null = null;

  try {
    versionWarningExists = await checkUrlExists(url);
  } catch (error) {
    trace('launch-warning-checker', 'Error checking remote URL', url, error);

    return {
      opened: false,
      url,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  try {
    if (versionWarningExists) {
      await openInBrowser(url);

      return { opened: true, url };
    }

    return { opened: false, url };
  } catch (error) {
    trace('launch-warning-checker', 'Error launching the browser', error);
    return {
      opened: false,
      url,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
