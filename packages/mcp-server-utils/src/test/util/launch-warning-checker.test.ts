import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { server } from '@gleanwork/mcp-test-utils/mocks/setup';
import {
  getVersionString,
  buildLaunchWarningUrl,
  checkUrlExists,
  openInBrowser,
  checkAndOpenLaunchWarning,
} from '../../util/launch-warning-checker.js';

vi.mock('open', () => ({
  default: vi.fn(),
}));

describe('launch-warning-checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('getVersionString', () => {
    it('should return major version for versions > 1.0.0', () => {
      expect(getVersionString('1.2.3')).toBe('v1');
      expect(getVersionString('2.0.0')).toBe('v2');
      expect(getVersionString('10.5.2')).toBe('v10');
    });

    it('should return major.minor for versions 0.x.x', () => {
      expect(getVersionString('0.6.3')).toBe('v0.6');
      expect(getVersionString('0.1.0')).toBe('v0.1');
      expect(getVersionString('0.15.7')).toBe('v0.15');
    });
  });

  describe('buildLaunchWarningUrl', () => {
    it('should use hardcoded base URL', () => {
      const url = buildLaunchWarningUrl('1.2.3');
      expect(url).toMatchInlineSnapshot(
        `"https://gleanwork.github.io/mcp-server/warnings/launch/v1.md"`,
      );
    });

    it('should handle 0.x versions correctly', () => {
      const url = buildLaunchWarningUrl('0.6.3');
      expect(url).toMatchInlineSnapshot(
        `"https://gleanwork.github.io/mcp-server/warnings/launch/v0.6.md"`,
      );
    });

    it('should handle pre-release versions', () => {
      const url = buildLaunchWarningUrl('1.2.3-alpha.1');
      expect(url).toMatchInlineSnapshot(
        `"https://gleanwork.github.io/mcp-server/warnings/launch/v1.md"`,
      );
    });

    it('should handle build metadata', () => {
      const url = buildLaunchWarningUrl('2.1.0+build.1');
      expect(url).toMatchInlineSnapshot(
        `"https://gleanwork.github.io/mcp-server/warnings/launch/v2.md"`,
      );
    });
  });

  describe('checkUrlExists', () => {
    it('should return true when URL exists (200)', async () => {
      const exists = await checkUrlExists(
        'https://gleanwork.github.io/mcp-server/warnings/launch/v1.md',
      );
      expect(exists).toBe(true);
    });

    it('should return false when URL returns 404', async () => {
      const exists = await checkUrlExists(
        'https://gleanwork.github.io/mcp-server/warnings/launch/v404.md',
      );
      expect(exists).toBe(false);
    });

    it('should return false when URL returns server error', async () => {
      const exists = await checkUrlExists(
        'https://gleanwork.github.io/mcp-server/warnings/launch/server-error.md',
      );
      expect(exists).toBe(false);
    });
  });

  describe('openInBrowser', () => {
    it('should call open with the provided URL', async () => {
      const open = (await import('open')).default;
      const mockOpen = vi.mocked(open);

      await openInBrowser('https://example.com/test');

      expect(mockOpen).toHaveBeenCalledWith('https://example.com/test');
      expect(mockOpen).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from open', async () => {
      const open = (await import('open')).default;
      const mockOpen = vi.mocked(open);
      const testError = new Error('Failed to open browser');
      mockOpen.mockRejectedValueOnce(testError);

      await expect(openInBrowser('https://example.com/test')).rejects.toThrow(
        'Failed to open browser',
      );
    });
  });

  describe('checkAndOpenLaunchWarning', () => {
    it('should open browser when launch warning exists', async () => {
      const open = (await import('open')).default;
      const mockOpen = vi.mocked(open);

      const result = await checkAndOpenLaunchWarning('1.2.3');

      expect(result).toMatchInlineSnapshot(`
        {
          "opened": true,
          "url": "https://gleanwork.github.io/mcp-server/warnings/launch/v1.md",
        }
      `);
      expect(mockOpen).toHaveBeenCalledWith(
        'https://gleanwork.github.io/mcp-server/warnings/launch/v1.md',
      );
    });

    it('should not open browser when launch warning does not exist', async () => {
      const open = (await import('open')).default;
      const mockOpen = vi.mocked(open);

      const result = await checkAndOpenLaunchWarning('99.99.99');

      expect(result).toMatchInlineSnapshot(`
        {
          "opened": false,
          "url": "https://gleanwork.github.io/mcp-server/warnings/launch/v99.md",
        }
      `);
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it('should handle 0.x versions correctly', async () => {
      const open = (await import('open')).default;
      const mockOpen = vi.mocked(open);

      const result = await checkAndOpenLaunchWarning('0.6.3');

      expect(result).toMatchInlineSnapshot(`
        {
          "opened": true,
          "url": "https://gleanwork.github.io/mcp-server/warnings/launch/v0.6.md",
        }
      `);
      expect(result.opened).toBe(true);
      expect(result.url).toBe(
        'https://gleanwork.github.io/mcp-server/warnings/launch/v0.6.md',
      );
      expect(result.error).toBeUndefined();
      expect(mockOpen).toHaveBeenCalledWith(
        'https://gleanwork.github.io/mcp-server/warnings/launch/v0.6.md',
      );
    });

    it('should handle network errors gracefully', async () => {
      const networkErrorResult = await checkAndOpenLaunchWarning('999.0.0');

      expect(networkErrorResult.opened).toBe(false);
      expect(networkErrorResult.url).toBe(
        'https://gleanwork.github.io/mcp-server/warnings/launch/v999.md',
      );
      expect(networkErrorResult.error).toBeUndefined(); // Network errors are handled gracefully in checkUrlExists
    });
  });
});
