import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getStateDir,
  ensureFileExistsWithLimitedPermissions,
} from '../../xdg/xdg.js';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('node:os');
vi.mock('node:fs');

describe('XDG Functions', () => {
  const originalEnv = process.env;
  const mockHomeDir = '/mock/home';
  const testAppName = 'testapp';

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetAllMocks();

    // Mock os functions
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getStateDir', () => {
    it('should use XDG_STATE_HOME when set', () => {
      const xdgStateHome = '/custom/state/home';
      process.env.XDG_STATE_HOME = xdgStateHome;

      const result = getStateDir(testAppName);
      expect(result).toBe(path.join(xdgStateHome, testAppName));
    });

    it('should use default Unix-like path when XDG_STATE_HOME is not set on Unix', () => {
      vi.mocked(os.platform).mockReturnValue('darwin');
      delete process.env.XDG_STATE_HOME;

      const result = getStateDir(testAppName);
      expect(result).toBe(
        path.join(mockHomeDir, '.local', 'state', testAppName),
      );
    });

    it('should use LOCALAPPDATA on Windows when available', () => {
      vi.mocked(os.platform).mockReturnValue('win32');
      const mockLocalAppData = 'C:\\Users\\Test\\AppData\\Local';
      process.env.LOCALAPPDATA = mockLocalAppData;

      const result = getStateDir(testAppName);
      expect(result).toBe(path.join(mockLocalAppData, 'state', testAppName));
    });

    it('should fallback to AppData\\Local on Windows when LOCALAPPDATA is not set', () => {
      vi.mocked(os.platform).mockReturnValue('win32');
      delete process.env.LOCALAPPDATA;

      const result = getStateDir(testAppName);
      expect(result).toBe(
        path.join(mockHomeDir, 'AppData', 'Local', 'state', testAppName),
      );
    });
  });

  describe('ensureFileExistsWithLimitedPermissions', () => {
    const testFilePath = '/test/path/file.txt';

    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
      vi.mocked(fs.chmodSync).mockImplementation(() => undefined);
    });

    it('should create directory if it does not exist', () => {
      ensureFileExistsWithLimitedPermissions(testFilePath);

      expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(testFilePath), {
        recursive: true,
      });
    });

    it('should create file if it does not exist', () => {
      ensureFileExistsWithLimitedPermissions(testFilePath);

      expect(fs.writeFileSync).toHaveBeenCalledWith(testFilePath, '', {
        encoding: 'utf8',
      });
    });

    it('should not create file if it already exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      ensureFileExistsWithLimitedPermissions(testFilePath);

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should set file permissions to 0o600', () => {
      ensureFileExistsWithLimitedPermissions(testFilePath);

      expect(fs.chmodSync).toHaveBeenCalledWith(testFilePath, 0o600);
    });
  });
});
