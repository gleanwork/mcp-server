import { getStateDir } from '../xdg/xdg.js';
import path from 'node:path';
import fs from 'node:fs';
import { GleanOAuthConfig } from '../config/config.js';
import { trace, error } from '../log/logger.js';

export function saveOAuthMetadata(config: GleanOAuthConfig) {
  const filePath = ensureOAuthMetadataCacheFilePath();
  const payload = {
    ...config,
    timestamp: new Date(),
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

export function loadOAuthMetadata() {
  const oauthMetadataCacheFile = buildOAuthMetadataCacheFilePath();
  if (!fs.existsSync(oauthMetadataCacheFile)) {
    trace('No saved OAuth information');
    return null;
  }

  try {
    const oauthMetadata = JSON.parse(
      fs.readFileSync(oauthMetadataCacheFile).toString(),
    );
    if (
      ![
        'baseUrl',
        'issuer',
        'clientId',
        'authorizationEndpoint',
        'tokenEndpoint',
        'timestamp',
      ].every((k) => k in oauthMetadata)
    ) {
      error('Incomplete OAuth metadata file', oauthMetadata);
      return null;
    }
    const {
      baseUrl,
      issuer,
      clientId,
      authorizationEndpoint,
      tokenEndpoint,
      timestamp: timestampStr,
    } = oauthMetadata;

    const timestamp = new Date(Date.parse(timestampStr));
    if (!isCacheFresh(timestamp)) {
      return null;
    }

    const oauthConfig: GleanOAuthConfig = {
      baseUrl,
      issuer,
      clientId,
      authorizationEndpoint,
      tokenEndpoint,
      authType: 'oauth',
    };
    return oauthConfig;
  } catch (e) {
    // log & give up if the file has errors, e.g.
    //  - not json
    //  - missing fields
    trace('Error parsing oauth cache file', e);
    return null;
  }
}

function isCacheFresh(timestamp: Date) {
  // TODO: set a very short TTL; this is just a hack for now because of the way
  // the client & the rest of the system do getConfig(); can clean this up once
  // the sdk lands
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const now = Date.now();
  const timestampMs = timestamp.getTime();

  return now - timestampMs < SIX_HOURS_MS;
}

function buildOAuthMetadataCacheFilePath() {
  const stateDir = getStateDir('glean');
  const tokensFile = path.join(stateDir, 'oauth.json');
  return tokensFile;
}

function ensureOAuthMetadataCacheFilePath() {
  const filePath = buildOAuthMetadataCacheFilePath();

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  return filePath;
}
