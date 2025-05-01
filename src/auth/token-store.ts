import {
  ensureFileExistsWithLimitedPermissions,
  getStateDir,
} from '../xdg/xdg.js';
import path from 'node:path';
import { debug, trace } from '../log/logger.js';
import fs from 'node:fs';
import { TokenResponse } from './types';

export class Tokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;

  constructor({
    accessToken,
    refreshToken,
    expiresAt,
  }: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = expiresAt;
  }

  static buildFromTokenResponse(tokenResponse: TokenResponse): Tokens {
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    } = tokenResponse;

    // Calculate expiresAt by adding expires_in seconds to the current time
    let expiresAt: Date | undefined;
    if (expiresIn !== undefined) {
      expiresAt = new Date();
      // MDN suggests settings seconds > 59 is invalid but the spec is fine with it and it works in v8
      // see <https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.prototype.setseconds>
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
    }

    return new Tokens({
      accessToken,
      refreshToken,
      expiresAt: expiresAt,
    });
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    // Add a 1 minute buffer
    const nowWithBuffer = new Date(Date.now() + 60 * 1000);
    return this.expiresAt <= nowWithBuffer;
  }
}

export function loadTokens(): Tokens | null {
  const tokensFile = buildTokensFilePath();
  if (!fs.existsSync(tokensFile)) {
    debug('No saved tokens found.');
    return null;
  }

  try {
    const tokensFileStr = fs.readFileSync(tokensFile, { encoding: 'utf-8' });
    const tokensJson = JSON.parse(tokensFileStr);
    const { accessToken, refreshToken, expiresAt: expiresAtStr } = tokensJson;
    let expiresAt = undefined;
    if (expiresAtStr !== undefined) {
      expiresAt = new Date(Date.parse(expiresAtStr));
    }

    debug('Loaded tokens');
    return new Tokens({
      accessToken,
      refreshToken,
      expiresAt,
    });
  } catch (e) {
    trace(`error parsing tokens file: '${tokensFile}'`, e);
    return null;
  }
}

export function saveTokens(tokens: Tokens) {
  saveTokensToXDGState(tokens);
}

function buildTokensFilePath() {
  const stateDir = getStateDir('glean');
  const tokensFile = path.join(stateDir, 'tokens.json');
  return tokensFile;
}

function saveTokensToXDGState(tokens: Tokens) {
  const tokensFile = buildTokensFilePath();
  ensureFileExistsWithLimitedPermissions(tokensFile);
  const tokensJson = JSON.stringify(tokens);
  fs.writeFileSync(tokensFile, tokensJson);

  trace('stored tokens');
}
