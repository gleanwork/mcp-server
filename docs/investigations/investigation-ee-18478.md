# Investigation: EE-18478 - Local MCP Response Validation Errors

## Executive Summary

**Issue**: Users running Local MCP v0.8.0 are experiencing response validation errors ~40% of the time due to missing enum values `AUTHOR_PREFIX` and `AUTHOR_SUFFIX`.

**Root Cause**: The published npm package `@gleanwork/local-mcp-server@0.8.0` references `@gleanwork/api-client@0.9.1`, which does not include the required enum values.

**Status**: ✅ **FIXED IN MAIN** - The fix has been merged but not yet published to npm.

**Action Required**: Release a new version (v0.9.0) that includes the fix.

---

## Timeline

- **2025-08-26**: v0.8.0 released with `@gleanwork/api-client@0.9.1`
- **2025-10-13**: PR merged bumping `@gleanwork/api-client` from 0.9.1 to 0.11.2 (faf6b39)
- **2025-11-01**: PR #310 merged bumping `@gleanwork/api-client` from 0.11.2 to 0.13.0 (019672f)
- **2025-11-20**: Customer reports issue in Zendesk ticket #20013
- **2025-11-21**: Issue escalated as EE-18478

---

## Technical Details

### Published Version (v0.8.0)

- **Published**: 2025-08-26
- **api-client version**: 0.9.1 ❌
- **Missing enum values**: `AUTHOR_PREFIX`, `AUTHOR_SUFFIX`
- **npm package**: https://www.npmjs.com/package/@gleanwork/local-mcp-server/v/0.8.0

### Current Main Branch

- **api-client version**: 0.13.0 ✅
- **Includes enum values**: `AUTHOR_PREFIX`, `AUTHOR_SUFFIX`
- **Merged**: 2025-11-01 (commit: 019672f)
- **Status**: NOT YET PUBLISHED

### Verification

```bash
# Confirmed published version has old api-client
npm view @gleanwork/local-mcp-server@0.8.0 dependencies | grep api-client
# Output: '@gleanwork/api-client': '0.9.1'

# Confirmed git tag v0.8.0 has old api-client
git show v0.8.0:packages/local-mcp-server/package.json | grep api-client
# Output: "@gleanwork/api-client": "0.9.1"

# Confirmed current main has new api-client
cat packages/local-mcp-server/package.json | grep api-client
# Output: "@gleanwork/api-client": "0.13.0"

# Confirmed pnpm lockfile has resolved 0.13.0
grep -A 3 '@gleanwork/api-client@0.13.0' pnpm-lock.yaml
```

---

## Customer Impact

### Affected User

- **Customer**: PebblePost (GCP)
- **Contact**: mlyons@pebblepost.com
- **Environment**: VSCode + GitHub Copilot with MCP

### Error Pattern

- **Frequency**: ~40-50% of queries (10/22 failed in testing)
- **Tools Affected**: `company_search`
- **Error Message**:

```
Error: Response validation failed: [
  {
    "received": "AUTHOR_PREFIX",
    "code": "invalid_enum_value",
    "options": ["SIMILAR", "FRESHNESS", "TITLE", "CONTENT", "NONE",
                "THREAD_REPLY", "THREAD_ROOT", "PREFIX", "SUFFIX"],
    "path": ["results", 9, "allClusteredResults", 0, "clusterType"],
    "message": "Invalid enum value. Expected 'SIMILAR' | 'FRESHNESS' | ...
                received 'AUTHOR_PREFIX'"
  }
]
```

### Why ~40% Failure Rate?

The enum values `AUTHOR_PREFIX` and `AUTHOR_SUFFIX` are returned by the Glean API for certain types of search results (likely email/slack thread results where clustering by author makes sense). Not all search results include these cluster types, which explains the intermittent nature of the errors.

---

## Related Resources

### Code Changes

- **PR #310**: https://github.com/gleanwork/mcp-server/pull/310
- **Commit**: 019672f (2025-11-01)
- **PR #299**: https://github.com/gleanwork/mcp-server/pull/299 (0.9.1 → 0.11.2)
- **Commit**: faf6b39 (2025-10-13)

### Support Tickets

- **Zendesk**: #20013 - https://gleanwork.zendesk.com/agent/tickets/20013
- **JIRA**: EE-18478 - https://askscio.atlassian.net/browse/EE-18478
- **Slack**: https://askscio.slack.com/archives/C03F3JNP9HP/p1763745031689369

### API Client Versions

- **v0.9.1** (broken): https://raw.githubusercontent.com/gleanwork/api-client-typescript/v0.9.1/src/models/components/clustertypeenum.ts
- **v0.13.0** (fixed): https://raw.githubusercontent.com/gleanwork/api-client-typescript/v0.13.0/src/models/components/clustertypeenum.ts

---

## Resolution Steps

### Completed Actions

- ✅ Identified root cause: api-client 0.9.1 missing enum values
- ✅ Verified fix in main branch: api-client 0.13.0 includes required enums
- ✅ All tests passing with fix in place
- ✅ PR #310 merged to main on 2025-11-01

### Next Steps

1. Cut v0.9.0 release from main branch
2. Publish to npm registry
3. Notify customer to update

---

## Prevention for Future

Consider:

1. Adding integration tests that use real API responses (not just mocks)
2. Monitoring api-client releases for enum changes
3. Dependabot is already configured and caught this (PR #310) - just needed to be released
4. Document in RELEASE.md to check for pending dependency updates before cutting releases

---

Generated: 2025-11-21  
Investigated by: Chris Freeman  
Related Issues: EE-18478, Zendesk #20013
