




## v0.7.1 (2025-05-29)

#### :bug: Bug Fix
* [#132](https://github.com/gleanwork/mcp-server/pull/132) fix(cli): Fixes .env file and process.env support in configure ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### Committers: 1
- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))


## v0.7.0 (2025-05-23)

#### :rocket: Enhancement
* [#126](https://github.com/gleanwork/mcp-server/pull/126) feat: Implements local configuration for vscode (to complement the global one) ([@steve-calvert-glean](https://github.com/steve-calvert-glean))
* [#125](https://github.com/gleanwork/mcp-server/pull/125) feat(configure): add VS Code MCP client support ([@robert-jackson-glean](https://github.com/robert-jackson-glean))

#### Committers: 3
- David J. Hamilton ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- Robert Jackson ([@robert-jackson-glean](https://github.com/robert-jackson-glean))
- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))


## v0.6.1 (2025-05-15)

#### :rocket: Enhancement
* [#107](https://github.com/gleanwork/mcp-server/pull/107) fix: Making preflight validation message more clear ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

#### Committers: 1
- Steve Calvert ([@steve-calvert-glean](https://github.com/steve-calvert-glean))


## v0.6.0 (2025-05-14)

#### :rocket: Enhancement
* [#105](https://github.com/gleanwork/mcp-server/pull/105) Add `--instance` preflight validation for `npx @gleanwork/mcp-server configure` ([@robert-jackson-glean](https://github.com/robert-jackson-glean))
* [#104](https://github.com/gleanwork/mcp-server/pull/104) Add `--instance` and `--token` options to `npx @gleanwork/mcp-server server` ([@robert-jackson-glean](https://github.com/robert-jackson-glean))
* [#102](https://github.com/gleanwork/mcp-server/pull/102) Add explicit `npx @gleanwork/mcp-server server` command (as the default) ([@robert-jackson-glean](https://github.com/robert-jackson-glean))

#### :bug: Bug Fix
* [#103](https://github.com/gleanwork/mcp-server/pull/103) Fix short flag for `--instance` in `npx @gleanwork/mcp-server server` to be `-i` ([@robert-jackson-glean](https://github.com/robert-jackson-glean))

#### :house: Internal
* [#101](https://github.com/gleanwork/mcp-server/pull/101) build(tooling): migrate from volta to mise ([@robert-jackson-glean](https://github.com/robert-jackson-glean))
* [#99](https://github.com/gleanwork/mcp-server/pull/99) feat(auth-test): readability ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
* [#98](https://github.com/gleanwork/mcp-server/pull/98) fix(test): Run auth tests isolated ([@david-hamilton-glean](https://github.com/david-hamilton-glean))

#### Committers: 2
- David J. Hamilton ([@david-hamilton-glean](https://github.com/david-hamilton-glean))
- Robert Jackson ([@robert-jackson-glean](https://github.com/robert-jackson-glean))


## v0.5.0 (2025-05-12)

#### :boom: Breaking Change
* [#97](https://github.com/gleanwork/mcp-server/pull/97) chore: Bumping node, pinning to lowest version, updating ci matrix ([@steve-calvert-glean](https://github.com/steve-calvert-glean))

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
