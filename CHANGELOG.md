# Changelog

All notable changes to **synology-office-mcp** are documented in this file.

The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

> Pre-1.0 status: minor versions (`0.x.0`) deliver shipping milestones from the [implementation plan](./plans/260426-1222-synology-office-mcp/plan.md). The public surface (CLI, env vars, MCP tools) may still change between minor versions until `1.0.0`.

## [Unreleased]

---

## [0.3.0] - 2026-04-26

### Added — All modules milestone (Phases 02–08)

#### Drive module (Phase 02)
- `DriveClient` wrapping `SYNO.Drive.Files` and `SYNO.Drive.Labels` APIs
- 11 MCP tools: `drive_list_files`, `drive_search_files`, `drive_get_file_info`, `drive_download_file`, `drive_upload_file`, `drive_create_folder`, `drive_move_file`, `drive_delete_file`, `drive_get_sharing_link`, `drive_list_labels`, `drive_add_label`
- Confirm-required guard on `drive_delete_file` and `drive_move_file`
- MSW-mocked unit tests + smoke tests gated by `SMOKE_TEST=1`

#### Spreadsheet module (Phase 03)
- `SpreadsheetClient` wrapping `SYNO.Office.Spreadsheet` APIs
- 8 MCP tools: `spreadsheet_list`, `spreadsheet_get_info`, `spreadsheet_read_sheet`, `spreadsheet_write_cells`, `spreadsheet_append_rows`, `spreadsheet_add_sheet`, `spreadsheet_create`, `spreadsheet_export`
- Confirm-required guard on `spreadsheet_write_cells` and `spreadsheet_append_rows`

#### MailPlus module (Phase 04)
- `MailPlusClient` wrapping `SYNO.MailPlus` APIs
- 6 MCP tools: `mailplus_list_folders`, `mailplus_list_messages`, `mailplus_get_message`, `mailplus_send_message`, `mailplus_move_messages`, `mailplus_mark_messages`
- Confirm-required guard on `mailplus_send_message` and `mailplus_move_messages`

#### Calendar module (Phase 05)
- `CalendarClient` wrapping `SYNO.Cal` APIs
- 7 MCP tools: `calendar_list_calendars`, `calendar_list_events`, `calendar_get_event`, `calendar_create_calendar`, `calendar_create_event`, `calendar_update_event`, `calendar_delete_event`
- Confirm-required guard on `calendar_create_event`, `calendar_update_event`, and `calendar_delete_event`

#### MCP integration (Phase 06)
- Full MCP server bootstrap with stdio and SSE transports
- Tool registry wiring all 32 tools
- Resources: Drive file tree (`drive://files`), MailPlus folder list (`mailplus://folders`), calendar list (`calendar://calendars`)
- Prompts: `summarize_drive_folder`, `draft_email`, `weekly_agenda`
- SSE: origin guard, bearer-auth middleware, loopback-enforcement at startup

#### Hardening (Phase 07)
- Retry with exponential backoff (max 3 attempts) on transient network errors and Synology codes 108/119
- Structured JSON logging via `LOG_LEVEL` env var
- Graceful shutdown: SIGINT/SIGTERM triggers best-effort Synology logout + SSE client drain
- Request timeout enforcement via `AbortSignal.timeout()` and `SYNO_REQUEST_TIMEOUT_MS`

#### Docs & release prep (Phase 08)
- `docs/tool-reference.md` — full 32-tool reference table
- `docs/deployment.md` — Docker, systemd, Synology scheduled task
- `docs/troubleshooting.md` — Synology error codes + fixes
- `docs/security.md` — detailed threat model
- `examples/` — Claude Desktop config, Claude Code add script, GoClaw config, smoke-test script
- `.github/workflows/release.yml` — tag-triggered npm publish with provenance

### Changed
- `src/index.ts` promoted from Phase 01 stub to full MCP server entry point
- `package.json` version bumped to `0.3.0`; added `exports` field
- README updated to reflect v0.3.0 milestone with all modules shipped

### Notes
- 311 unit tests passing; smoke tests against real DSM 7.2.2 pending before v1.0.0
- v1.0.0 target: real-NAS smoke test validation, changelog-driven release cut

---

## [0.2.0] — 2026-04-26

### Added — Foundation milestone (Phase 01)

#### Project hygiene
- MIT-licensed open-source repository scaffold (`LICENSE`, `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`)
- GitHub issue templates (bug report, feature request) under `.github/ISSUE_TEMPLATE/`
- GitHub Actions CI workflow (`typecheck`, `lint`, `test`, `build` on Node 22)
- pnpm workspace with strict `engines` requirement (Node `>=22.0.0`, pnpm `>=9.0.0`)
- `tsup` build pipeline emitting ESM-only `dist/`
- Husky + lint-staged pre-commit hooks (typecheck, ESLint, Prettier on staged files)
- Prettier + ESLint flat config + `typescript-eslint` strict ruleset

#### Configuration
- `loadConfig()` with Zod schema validation (`src/config.ts`)
- Coercion helpers for boolean / int env vars with defaults
- SSE auth-required guard: rejects startup when `MCP_TRANSPORT=sse` is bound to a non-loopback host without `MCP_AUTH_TOKEN`
- Fully documented `.env.example` covering NAS connection, feature flags, transport, security, logging, and performance

#### Authentication & HTTP
- `AuthManager` (`src/auth/auth-manager.ts`)
  - Login via `SYNO.API.Auth` v6 with `format=sid`
  - Credentials sent via `POST` form body — never in URL
  - `undici.Agent` opt-in for self-signed cert bypass (`SYNO_IGNORE_CERT=true`)
  - Best-effort `logout()` on shutdown
- `TokenCache` (`src/auth/token-cache.ts`) — in-memory TTL cache with explicit invalidation
- `BaseClient` (`src/clients/base-client.ts`) — abstract HTTP base
  - `_sid` forwarded via `Cookie: id=<sid>` header (kept out of URL/access logs)
  - Single retry on Synology codes `108` / `119` (session expired) and HTTP 401
  - `AbortSignal.timeout()` enforcement using `SYNO_REQUEST_TIMEOUT_MS`
  - Response envelope unwrapping with typed errors

#### Error model
- `SynologyMcpError` base class with `code`, `synoCode`, and `retryable`
- Specialised: `AuthError`, `NotFoundError`, `PermissionError`, `ValidationError`, `NetworkError`
- `mapSynologyError()` translates Synology numeric codes to typed exceptions

#### Security utilities
- `redactSensitive()` — strips `passwd`, `_sid`, `otp_code`, bearer tokens from log payloads
- `pathGuard()` — blocks path traversal (`..`, absolute escapes) at tool boundary
- `originGuard()` — Origin / Host validation for SSE transport
- `bearerAuth()` — constant-time bearer-token comparison for SSE

#### Types
- `AppConfig`, `SynologyConfig`, `McpConfig` interfaces
- `SynologyResponse<T>` envelope with discriminated `success` flag
- MCP tool / resource / prompt type stubs ready for Phase 06

#### Tests
- Vitest configuration with v8 coverage reporter
- MSW-based HTTP mocking helpers in `tests/setup.ts`
- Unit suites: `config`, `token-cache`, `bearer-auth`, `origin-guard`, `path-guard`, `redact`

### Notes
- `src/index.ts` is intentionally a Phase 01 stub — full MCP server bootstrap (stdio + SSE transports, tool registry) ships in `0.7.0` per the [phased plan](./plans/260426-1222-synology-office-mcp/plan.md).
- No module clients (`Drive`, `Spreadsheet`, `MailPlus`, `Calendar`) are wired yet — see Roadmap in [README](./README.md#roadmap).

---

## [0.1.0] — 2026-04-25

### Added
- Initial repository scaffold and project specification
- `docs/project/synology-office-mcp-spec.md` — full implementation specification (2 281 lines covering architecture, tools, resources, prompts, security, deployment)
- Phase-based implementation plan under `plans/260426-1222-synology-office-mcp/` (8 phases)

---

[Unreleased]: https://github.com/vocweb/synology-mcp-server/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/vocweb/synology-mcp-server/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/vocweb/synology-mcp-server/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/vocweb/synology-mcp-server/releases/tag/v0.1.0
