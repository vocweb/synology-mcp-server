# synology-office-mcp

[![CI](https://github.com/vocweb/synology-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/vocweb/synology-mcp-server/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/synology-office-mcp.svg)](https://badge.fury.io/js/synology-office-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 22+](https://img.shields.io/badge/node-22%2B-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

> A self-hosted [Model Context Protocol](https://modelcontextprotocol.io) server that exposes **Synology Drive, Spreadsheet, MailPlus, and Calendar** as structured tools for AI agents (Claude Code, Claude Desktop, GoClaw, or any MCP-compatible client).

Wraps the official [Synology Office Suite REST API](https://office-suite-api.synology.com). LAN-only by default — no data leaves your network unless you explicitly opt in.

> **v0.3.0 milestone** — All four modules (Drive, Spreadsheet, MailPlus, Calendar) implemented and unit-tested with MSW mocks. Smoke tests against a real DSM 7.2.2 NAS are needed before declaring v1.0.0 production-ready. See [CHANGELOG](./CHANGELOG.md) for details.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Install](#install)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Tool Reference](#tool-reference)
- [Connecting an MCP Client](#connecting-an-mcp-client)
- [Transport Modes](#transport-modes)
- [Architecture](#architecture)
- [Security Model](#security-model)
- [Development](#development)
- [Testing](#testing)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Module | Tools | Key Capabilities |
|---|---|---|
| **Drive** | 11 | List / search / get info / download / upload / create folder / move / delete / share / labels |
| **Spreadsheet** | 13 | List / register-by-name / get info / read sheet / get styles / write cells / append rows / batch update / add-rename-delete sheet / create / export |
| **MailPlus** | 6 | List folders / list messages / get message / send / move / mark read-unread |
| **Calendar** | 7 | List calendars / list events / get event / create calendar / create event / update event / delete event |
| **MCP Layer** | — | Resources (file tree, mail folders, calendar list), prompts, stdio + SSE transports |
| **Security** | — | TLS verify, path-guard, origin-guard, bearer-auth, log redaction, confirm-required writes |

Modules **not** included (no public API yet): Synology Docs, Synology Slides.

### Design principles

- **Self-hosted, LAN-only by default** — TLS verification on, SSE bound to `127.0.0.1` unless `MCP_AUTH_TOKEN` is set
- **No third-party MCP middlemen** — every Synology call goes through the official REST API
- **Read-heavy, safe writes** — destructive operations require an explicit `confirm: true` parameter
- **Stateless tool calls** — each MCP invocation is independent; session/token lifecycle is internal
- **Single binary** — compiled ESM TypeScript, deployable as `node dist/index.js`

---

## Requirements

| Component | Version |
|---|---|
| Node.js | `>= 22.0.0` (ESM-only) |
| pnpm | `>= 9.0.0` (dev only) |
| Synology DSM | `7.2.2 build 72806+` |
| Synology Drive | `3.5.2+` |
| Synology Office | `3.6.0+` (for Spreadsheet) |
| Synology MailPlus | `3.3.1+` (requires MailPlus Server package) |
| Synology Calendar | `2.5.3+` |

> Verify your DSM build: `Control Panel > Info Center > DSM Version`. Must be ≥ 72806.

---

## Install

**Global CLI (npm/pnpm):**

```bash
npm install -g synology-office-mcp
# or
pnpm add -g synology-office-mcp
```

**From source:**

```bash
git clone https://github.com/vocweb/synology-mcp-server.git
cd synology-mcp-server
pnpm install && pnpm build
```

---

## Quick Start

```bash
# 1. Set required env vars (or copy .env.example to .env and edit)
export SYNO_HOST=192.168.1.100
export SYNO_USERNAME=your_user
export SYNO_PASSWORD=your_password

# 2. Run (stdio mode — default for Claude Desktop / Claude Code)
node dist/index.js

# 3. Or run via npx after global install
synology-mcp
```

The server prints a startup banner and waits for MCP JSON-RPC messages on stdin/stdout.

---

## Configuration

All configuration is via environment variables, validated by [Zod](https://zod.dev) at startup. See [`.env.example`](./.env.example) for the full list with inline documentation.

### Required

| Variable | Description |
|---|---|
| `SYNO_HOST` | NAS hostname or IP (`192.168.1.100` or `nas.local`) |
| `SYNO_USERNAME` | DSM account username |
| `SYNO_PASSWORD` | DSM account password (use an app-specific password if 2FA is enabled) |

### Common optional

| Variable | Default | Description |
|---|---|---|
| `SYNO_PORT` | `5001` | DSM port (`5000` HTTP, `5001` HTTPS) |
| `SYNO_HTTPS` | `true` | Use HTTPS |
| `SYNO_IGNORE_CERT` | `false` | Accept self-signed cert (trusted home NAS only) |
| `SYNO_OTP_CODE` | — | 2FA TOTP code (prefer app-specific passwords instead) |
| `MCP_TRANSPORT` | `stdio` | `stdio` or `sse` |
| `MCP_SSE_HOST` | `127.0.0.1` | Bind address for SSE |
| `MCP_SSE_PORT` | `3100` | Port for SSE |
| `MCP_AUTH_TOKEN` | — | **Required** when `MCP_SSE_HOST` is non-loopback |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

> **Warning:** `SYNO_IGNORE_CERT=true` disables MITM protection. Only use it on trusted home networks with self-signed certs you control.

---

## Tool Reference

Full table of all 37 tools with input schemas: [`tool-reference.md`](./tool-reference.md).

Quick summary by module:

- **Drive (11):** `drive_list_files`, `drive_search_files`, `drive_get_file_info`, `drive_download_file`, `drive_upload_file`, `drive_create_folder`, `drive_move_file`, `drive_delete_file`, `drive_get_sharing_link`, `drive_list_labels`, `drive_add_label`
- **Spreadsheet (13):** `spreadsheet_list`, `spreadsheet_register`, `spreadsheet_get_info`, `spreadsheet_read_sheet`, `spreadsheet_get_styles`, `spreadsheet_write_cells`, `spreadsheet_append_rows`, `spreadsheet_batch_update`, `spreadsheet_add_sheet`, `spreadsheet_rename_sheet`, `spreadsheet_delete_sheet`, `spreadsheet_create`, `spreadsheet_export`
- **MailPlus (6):** `mailplus_list_folders`, `mailplus_list_messages`, `mailplus_get_message`, `mailplus_send_message`, `mailplus_move_messages`, `mailplus_mark_messages`
- **Calendar (7):** `calendar_list_calendars`, `calendar_list_events`, `calendar_get_event`, `calendar_create_calendar`, `calendar_create_event`, `calendar_update_event`, `calendar_delete_event`

---

## Connecting an MCP Client

### Claude Desktop (`claude_desktop_config.json`)

```jsonc
{
  "mcpServers": {
    "synology": {
      "command": "node",
      "args": ["/absolute/path/to/synology-office-mcp/dist/index.js"],
      "env": {
        "SYNO_HOST": "192.168.1.100",
        "SYNO_USERNAME": "your_user",
        "SYNO_PASSWORD": "your_password"
      }
    }
  }
}
```

See [`examples/claude-desktop-config.json`](./examples/claude-desktop-config.json) for the complete snippet.

### Claude Code

```bash
claude mcp add synology-office -- node /path/to/synology-office-mcp/dist/index.js
```

See [`examples/claude-code-add.sh`](./examples/claude-code-add.sh) for the full command with env vars.

### GoClaw

See [`examples/goclaw-mcp.json`](./examples/goclaw-mcp.json). Start the server in SSE mode first (see [Transport Modes](#transport-modes)).

---

## Transport Modes

### stdio (default)

The default mode. The process communicates via stdin/stdout — used by Claude Desktop and Claude Code.

```bash
node dist/index.js
# or: MCP_TRANSPORT=stdio node dist/index.js
```

### SSE (Server-Sent Events)

Used for multi-client setups and GoClaw integration.

```bash
MCP_TRANSPORT=sse \
MCP_SSE_HOST=127.0.0.1 \
MCP_SSE_PORT=3100 \
MCP_AUTH_TOKEN="$(openssl rand -hex 32)" \
node dist/index.js
```

Clients connect to `http://<host>:3100/sse` with `Authorization: Bearer <token>`.

> **Security:** The server refuses to start when SSE is bound to a non-loopback address without `MCP_AUTH_TOKEN`. See [`security-model.md`](./security-model.md).

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│        MCP Client (Claude / GoClaw / …)          │
└──────────────────────┬──────────────────────────┘
                       │ MCP (JSON-RPC 2.0, stdio | SSE)
┌──────────────────────▼──────────────────────────┐
│            synology-office-mcp                   │
│                                                  │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │  MCP Layer  │  │  Synology API Client      │  │
│  │  Tools      │  │  AuthManager + TokenCache │  │
│  │  Resources  │  │  BaseClient (HTTP)        │  │
│  │  Prompts    │  │  Drive / Sheet / Mail / … │  │
│  └──────┬──────┘  └────────────┬─────────────┘  │
└─────────┼────────────────────────┼──────────────┘
          │                        │ HTTPS
┌─────────▼────────────────────────▼──────────────┐
│       Synology NAS (DSM 7.2.2 + Office Suite)   │
└─────────────────────────────────────────────────┘
```

See [`integration-guide.md`](./integration-guide.md) for client wiring across MCP-compatible agents.

---

## Security Model

- **TLS verification on by default.** `SYNO_IGNORE_CERT=true` is opt-in and logged at startup.
- **Credentials never appear in URLs.** Login uses `POST` with form body; session id (`sid`) forwarded via `Cookie: id=…`.
- **SSE binds loopback by default.** Server refuses to start when SSE is bound to non-loopback without `MCP_AUTH_TOKEN`.
- **Sensitive values are redacted in logs** via `src/utils/redact.ts`.
- **Path traversal is blocked** at tool boundary by `src/utils/path-guard.ts`.
- **Destructive operations require `confirm: true`** in the tool input.

Detailed threat model: [`security-model.md`](./security-model.md). Vulnerability disclosure: [SECURITY.md](./SECURITY.md).

---

## Development

```bash
pnpm install            # install deps
pnpm dev                # build + watch
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint src --max-warnings 0
pnpm format             # prettier --write
pnpm test               # vitest run
pnpm test:coverage      # vitest run --coverage
pnpm build              # tsup → dist/
```

Pre-commit hooks (Husky + lint-staged) run typecheck, lint, and Prettier on staged files.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full contributor workflow.

---

## Testing

| Layer | Tooling | Notes |
|---|---|---|
| Unit | [Vitest](https://vitest.dev) | All modules in `tests/` — 311 tests |
| HTTP mocking | [MSW](https://mswjs.io) | No real NAS required for unit tests |
| Smoke | Vitest, gated by `SMOKE_TEST=1` | Hits a real NAS — disabled in CI |

```bash
pnpm test               # unit only
SMOKE_TEST=1 \
  SYNO_HOST=192.168.1.100 \
  SYNO_USERNAME=user \
  SYNO_PASSWORD=pass \
  pnpm test             # include smoke tests (requires real NAS)
```

See [`examples/smoke-test.ts`](./examples/smoke-test.ts) for a standalone runnable smoke script.

---

## Documentation

| Document | Purpose |
|---|---|
| [tool-reference.md](./tool-reference.md) | All 37 tools: name, module, confirm-required, summary |
| [usage-guide.md](./usage-guide.md) | Sample prompts for invoking each tool from an MCP-aware agent |
| [deployment-guide.md](./deployment-guide.md) | Docker, systemd unit, Synology scheduled task |
| [integration-guide.md](./integration-guide.md) | Client wiring (Claude, Cursor, Codex, LangChain, …) |
| [troubleshooting.md](./troubleshooting.md) | Common Synology error codes + fixes |
| [security-model.md](./security-model.md) | Detailed threat model |
| [CHANGELOG.md](./CHANGELOG.md) | Versioned release notes |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contributor workflow |
| [SECURITY.md](./SECURITY.md) | Vulnerability disclosure |

---

## Contributing

PRs and issues are warmly welcomed — see [CONTRIBUTING.md](./CONTRIBUTING.md). For non-trivial changes, please open an issue first to discuss the approach.

This project follows [Conventional Commits](https://www.conventionalcommits.org) and [Semantic Versioning](https://semver.org).

---

## License

[MIT](./LICENSE) © 2026 Tien Chu — `<chutien@gmail.com>`

> Synology, Synology Drive, Synology Office, MailPlus, and Synology Calendar are trademarks of Synology Inc. This project is an independent open-source client and is not affiliated with or endorsed by Synology Inc.
