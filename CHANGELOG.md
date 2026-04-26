# Changelog

All notable changes to **synology-office-mcp** are documented in this file.

The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

> Pre-1.0 status: minor versions (`0.x.0`) deliver shipping milestones from the [implementation plan](./plans/260426-1222-synology-office-mcp/plan.md). The public surface (CLI, env vars, MCP tools) may still change between minor versions until `1.0.0`.

## [Unreleased]

### Planned (`0.3.0` — Drive module)
- `DriveClient` wrapping `SYNO.Drive.Files`
- 10 MCP Drive tools: `drive_list`, `drive_search`, `drive_get_metadata`, `drive_read_file`, `drive_write_file`, `drive_create_folder`, `drive_move`, `drive_copy`, `drive_delete`, `drive_share`
- MSW-mocked unit tests + smoke tests gated by `SMOKE_TEST=1`

---

## [0.2.0] — 2026-04-26

### Added — Foundation milestone (Phase 01)

#### Project hygiene
- MIT-licensed open-source repository scaffold (`LICENSE`, `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`)
- GitHub issue templates (bug report, feature request) under `.github/ISSUE_TEMPLATE/`
- GitHub Actions CI workflow (`typecheck`, `lint`, `test`, `build` on Node 24)
- pnpm workspace with strict `engines` requirement (Node `>=24.0.0`, pnpm `>=9.0.0`)
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

[Unreleased]: https://github.com/vocweb/synology-mcp-server/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/vocweb/synology-mcp-server/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/vocweb/synology-mcp-server/releases/tag/v0.1.0
