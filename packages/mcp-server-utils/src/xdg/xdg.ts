import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

export function getStateDir(name: string) {
  const platform = os.platform();
  const homeDir = os.homedir();

  // Check for XDG_STATE_HOME first
  const xdgStateHome = process.env.XDG_STATE_HOME;
  if (xdgStateHome) {
    return path.join(xdgStateHome, name);
  }

  // Platform-specific defaults
  if (platform === 'win32') {
    // Windows: %LOCALAPPDATA%\state\{name}
    const localAppData =
      process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
    return path.join(localAppData, 'state', name);
  }

  // Unix-like (Linux, macOS, etc): ~/.local/state/{name}
  return path.join(homeDir, '.local', 'state', name);
}

export function ensureFileExistsWithLimitedPermissions(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', { encoding: 'utf8' });
  }

  fs.chmodSync(filePath, 0o600);
}
