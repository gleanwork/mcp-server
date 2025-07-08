
## v0.7.12 (2025-07-08)

#### :bug: Bug Fix
* `local-mcp-server`
  * [#221](https://github.com/gleanwork/mcp-server/pull/221) fix: read documents with related docs ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### :memo: Documentation
* `local-mcp-server`
  * [#214](https://github.com/gleanwork/mcp-server/pull/214) Remove support email ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### Committers: 2
- David J. Hamilton ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

## v0.7.11 (2025-06-25)

#### :rocket: Enhancement

- `configure-mcp-server`
  - [#203](https://github.com/gleanwork/mcp-server/pull/203) feat: add Claude Code ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### :house: Internal

- `configure-mcp-server`
  - [#200](https://github.com/gleanwork/mcp-server/pull/200) Refactor goose client config ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### Committers: 1

- David J. Hamilton ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

## v0.7.10 (2025-06-20)

#### :bug: Bug Fix

- `configure-mcp-server`
  - [#199](https://github.com/gleanwork/mcp-server/pull/199) Fix remote token header ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### Committers: 1

- David J. Hamilton ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

## v0.7.9 (2025-06-19)

#### :rocket: Enhancement

- `configure-mcp-server`
  - [#191](https://github.com/gleanwork/mcp-server/pull/191) Add support for Goose as a client ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### :house: Internal

- `configure-mcp-server`, `local-mcp-server`, `mcp-server-utils`, `mcp-test-utils`
  - [#194](https://github.com/gleanwork/mcp-server/pull/194) chore: Fixup prettier configuration and enable format on merge ([@rwjblue-glean](https://github.com/rwjblue-glean))
- `configure-mcp-server`, `local-mcp-server`, `mcp-server-utils`
  - [#193](https://github.com/gleanwork/mcp-server/pull/193) chore: `pnpm -r format` ([@rwjblue-glean](https://github.com/rwjblue-glean))
- Other
  - [#192](https://github.com/gleanwork/mcp-server/pull/192) chore(release): Ensure releaser has ran `pnpm login` ([@rwjblue-glean](https://github.com/rwjblue-glean))

#### Committers: 2

- David J. Hamilton ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- Robert Jackson ([@rwjblue-glean](https://github.com/rwjblue-glean))

## v0.7.8 (2025-06-19)

#### :rocket: Enhancement

- `configure-mcp-server`, `local-mcp-server`, `mcp-server-utils`, `mcp-test-utils`
  - [#188](https://github.com/gleanwork/mcp-server/pull/188) Add functionality to provide warnings based on version ([@rwjblue-glean](https://github.com/rwjblue-glean))

#### :memo: Documentation

- `configure-mcp-server`
  - [#184](https://github.com/gleanwork/mcp-server/pull/184) docs(beta): remove env flag notice ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### :house: Internal

- Other
  - [#190](https://github.com/gleanwork/mcp-server/pull/190) chore(release): Fix publishing ([@rwjblue-glean](https://github.com/rwjblue-glean))
  - [#187](https://github.com/gleanwork/mcp-server/pull/187) fix(ci): Re-roll lockfile ([@rwjblue-glean](https://github.com/rwjblue-glean))
- `configure-mcp-server`, `local-mcp-server`, `mcp-server-utils`, `mcp-test-utils`
  - [#189](https://github.com/gleanwork/mcp-server/pull/189) fix(build): explicitly set rootDir ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
  - [#185](https://github.com/gleanwork/mcp-server/pull/185) fix(release): Fixup the release process ([@rwjblue-glean](https://github.com/rwjblue-glean))

#### Committers: 2

- David J. Hamilton ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- Robert Jackson ([@rwjblue-glean](https://github.com/rwjblue-glean))

## v0.7.7 (2025-06-17)

#### :rocket: Enhancement

- `local-mcp-server`
  - [#163](https://github.com/gleanwork/mcp-server/pull/163) [tool] Add read_documents MCP tool for retrieving documents by ID or URL ([@michael-li-glean](https://github.com/michael-li-glean))

#### Committers: 1

- Michael Li ([@michael-li-glean](https://github.com/michael-li-glean))

## v0.7.6 (2025-06-17)

#### :rocket: Enhancement

- `configure-mcp-server`
  - [#182](https://github.com/gleanwork/mcp-server/pull/182) Enable OAuth by default (without environment variable) ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### :bug: Bug Fix

- `configure-mcp-server`
  - [#177](https://github.com/gleanwork/mcp-server/pull/177) fix: Don't include GLEAN_INSTANCE for remote ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
  - [#180](https://github.com/gleanwork/mcp-server/pull/180) fix: vscode configuration of remote MCP Servers ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
  - [#178](https://github.com/gleanwork/mcp-server/pull/178) Ensure configuring with `remote` resets `glean` server to new remote path ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
  - [#176](https://github.com/gleanwork/mcp-server/pull/176) Fix clients (like Cursor) that do not handle spaces in MCP server arguments ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### :memo: Documentation

- Other
  - [#183](https://github.com/gleanwork/mcp-server/pull/183) docs: Add troubleshooting guide ([@rwjblue-glean](https://github.com/rwjblue-glean))
- `configure-mcp-server`
  - [#181](https://github.com/gleanwork/mcp-server/pull/181) feat: rework success message ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### :house: Internal

- Other
  - [#179](https://github.com/gleanwork/mcp-server/pull/179) docs: Add a basic vitepress site ([@rwjblue-glean](https://github.com/rwjblue-glean))
  - [#175](https://github.com/gleanwork/mcp-server/pull/175) chore(deps): Sync @typescript-eslint/eslint-plugin in root ([@rwjblue-glean](https://github.com/rwjblue-glean))
  - [#174](https://github.com/gleanwork/mcp-server/pull/174) fix(release): Ensure `pnpm-lock.yaml` is updated on release ([@rwjblue-glean](https://github.com/rwjblue-glean))
- `configure-mcp-server`, `local-mcp-server`, `mcp-server-utils`, `mcp-test-utils`
  - [#173](https://github.com/gleanwork/mcp-server/pull/173) fix: add missing import extensions ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### Committers: 2

- David J. Hamilton ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- Robert Jackson ([@rwjblue-glean](https://github.com/rwjblue-glean))

## v0.7.5 (2025-06-16)

#### :bug: Bug Fix

- `mcp-server-utils`
  - [#171](https://github.com/gleanwork/mcp-server/pull/171) fix(auth): keep unexpired refresh tokens ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### :house: Internal

- Other
  - [#172](https://github.com/gleanwork/mcp-server/pull/172) chore(release-it): Correctly disable `npm` integration ([@rwjblue-glean](https://github.com/rwjblue-glean))
- `configure-mcp-server`, `local-mcp-server`, `mcp-server-utils`, `mcp-test-utils`
  - [#170](https://github.com/gleanwork/mcp-server/pull/170) chore: extract common eslint configuration ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- `mcp-server-utils`
  - [#169](https://github.com/gleanwork/mcp-server/pull/169) chore: use upstream types ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### Committers: 2

- David J. Hamilton ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- Robert Jackson ([@rwjblue-glean](https://github.com/rwjblue-glean))

## v0.7.1 (2025-05-29)

#### :bug: Bug Fix

- [#132](https://github.com/gleanwork/mcp-server/pull/132) fix(cli): Fixes .env file and process.env support in configure ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### Committers: 1

- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

## v0.7.0 (2025-05-23)

#### :rocket: Enhancement

- [#126](https://github.com/gleanwork/mcp-server/pull/126) feat: Implements local configuration for vscode (to complement the global one) ([@steve-calvert-glean](https://github.com/steve-calvert-glean))
- [#125](https://github.com/gleanwork/mcp-server/pull/125) feat(configure): add VS Code MCP client support ([@robert-jackson-glean](https://github.com/robert-jackson-glean))

#### Committers: 3

- David J. Hamilton ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- Robert Jackson ([@robert-jackson-glean](https://github.com/robert-jackson-glean))
- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

## v0.6.1 (2025-05-15)

#### :rocket: Enhancement

- [#107](https://github.com/gleanwork/mcp-server/pull/107) fix: Making preflight validation message more clear ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### Committers: 1

- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

## v0.6.0 (2025-05-14)

#### :rocket: Enhancement

- [#105](https://github.com/gleanwork/mcp-server/pull/105) Add `--instance` preflight validation for `npx @gleanwork/mcp-server configure` ([@robert-jackson-glean](https://github.com/robert-jackson-glean))
- [#104](https://github.com/gleanwork/mcp-server/pull/104) Add `--instance` and `--token` options to `npx @gleanwork/mcp-server server` ([@robert-jackson-glean](https://github.com/robert-jackson-glean))
- [#102](https://github.com/gleanwork/mcp-server/pull/102) Add explicit `npx @gleanwork/mcp-server server` command (as the default) ([@robert-jackson-glean](https://github.com/robert-jackson-glean))

#### :bug: Bug Fix

- [#103](https://github.com/gleanwork/mcp-server/pull/103) Fix short flag for `--instance` in `npx @gleanwork/mcp-server server` to be `-i` ([@robert-jackson-glean](https://github.com/robert-jackson-glean))

#### :house: Internal

- [#101](https://github.com/gleanwork/mcp-server/pull/101) build(tooling): migrate from volta to mise ([@robert-jackson-glean](https://github.com/robert-jackson-glean))
- [#99](https://github.com/gleanwork/mcp-server/pull/99) feat(auth-test): readability ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- [#98](https://github.com/gleanwork/mcp-server/pull/98) fix(test): Run auth tests isolated ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### Committers: 2

- David J. Hamilton ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- Robert Jackson ([@robert-jackson-glean](https://github.com/robert-jackson-glean))

## v0.5.0 (2025-05-12)

#### :boom: Breaking Change

- [#97](https://github.com/gleanwork/mcp-server/pull/97) chore: Bumping node, pinning to lowest version, updating ci matrix ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### Committers: 1

- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

## v0.4.0 (2025-05-11)

#### :rocket: Enhancement

- [#89](https://github.com/gleanwork/mcp-server/pull/89) feat: Adds people search tool ([@steve-calvert-glean](https://github.com/steve-calvert-glean))
- [#87](https://github.com/gleanwork/mcp-server/pull/87) task: Renaming tools to adopt more conventional tool names ([@steve-calvert-glean](https://github.com/steve-calvert-glean))
- [#86](https://github.com/gleanwork/mcp-server/pull/86) task: Updates usages of domain/subdomain to instance ([@steve-calvert-glean](https://github.com/steve-calvert-glean))
- [#84](https://github.com/gleanwork/mcp-server/pull/84) task: Simplifies schemas to provide a more consistent tool invocation ([@steve-calvert-glean](https://github.com/steve-calvert-glean))
- [#56](https://github.com/gleanwork/mcp-server/pull/56) chore: Migrates to @gleanwork/api-client ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### :bug: Bug Fix

- [#84](https://github.com/gleanwork/mcp-server/pull/84) task: Simplifies schemas to provide a more consistent tool invocation ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### :house: Internal

- [#90](https://github.com/gleanwork/mcp-server/pull/90) internal: Fixes issue template ([@steve-calvert-glean](https://github.com/steve-calvert-glean))
- [#88](https://github.com/gleanwork/mcp-server/pull/88) task: Adding CODEOWNERS ([@steve-calvert-glean](https://github.com/steve-calvert-glean))
- [#85](https://github.com/gleanwork/mcp-server/pull/85) task: Gate OAuth behind an env var ([@steve-calvert-glean](https://github.com/steve-calvert-glean))
- [#81](https://github.com/gleanwork/mcp-server/pull/81) chore: remove node-fetch dep ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- [#77](https://github.com/gleanwork/mcp-server/pull/77) chore: cursor rules ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- [#47](https://github.com/gleanwork/mcp-server/pull/47) chore(test): normalize version output in CLI tests ([@robert-jackson-glean](https://github.com/robert-jackson-glean))

#### Committers: 3

- David J. Hamilton ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- Robert Jackson ([@robert-jackson-glean](https://github.com/robert-jackson-glean))
- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

## v0.3.0 (2025-04-15)

#### :rocket: Enhancement

- [#38](https://github.com/gleanwork/mcp-server/pull/38) feat: Adds the ability to run an configure command to configure the MCP Server ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### Committers: 1

- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

## v0.2.0 (2025-03-31)

#### :rocket: Enhancement

- [#23](https://github.com/gleanwork/mcp-server/pull/23) Provides better handling of invalid tokens. Also improves test infra. ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### :bug: Bug Fix

- [#23](https://github.com/gleanwork/mcp-server/pull/23) Provides better handling of invalid tokens. Also improves test infra. ([@steve-calvert-glean](https://github.com/steve-calvert-glean))
- [#22](https://github.com/gleanwork/mcp-server/pull/22) Fix schema validation errors ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### :house: Internal

- [#23](https://github.com/gleanwork/mcp-server/pull/23) Provides better handling of invalid tokens. Also improves test infra. ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### Committers: 1

- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

## v0.1.1 (2025-03-22)

#### :bug: Bug Fix

- [#14](https://github.com/gleanwork/mcp-server/pull/14) fix: Updates tool names in request handler to match new names ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### :house: Internal

- [#15](https://github.com/gleanwork/mcp-server/pull/15) internal: Adding issue, pull request, and feature templates for GitHub ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### Committers: 1

- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

## v0.1.0 (2025-03-21)

## v0.1.0-alpha.6 (2025-03-18)

#### :bug: Bug Fix

- [#5](https://github.com/gleanwork/mcp-server/pull/5) fix: Adds defaults for search.pageSize (otherwise no results are returned) ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### Committers: 1

- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

## v0.1.0-alpha.4 (2025-03-17)

## vv0.1.0-alpha.2 (2025-03-14)

## v0.1.0-alpha.1 (2025-03-14)

#### :rocket: Enhancement

- [#1](https://github.com/gleanwork/mcp-server/pull/1) Glean MCP Server implementation ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### :house: Internal

- [#2](https://github.com/gleanwork/mcp-server/pull/2) internal: Adds release-it for package releases ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### Committers: 1

- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

# Changelog
