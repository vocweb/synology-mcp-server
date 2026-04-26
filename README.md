# synology-office-mcp

[![CI](https://github.com/vocweb/synology-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/vocweb/synology-mcp-server/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/synology-office-mcp.svg)](https://badge.fury.io/js/synology-office-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/node-24%2B-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

> A self-hosted [Model Context Protocol](https://modelcontextprotocol.io) server that exposes **Synology Drive, Spreadsheet, MailPlus, and Calendar** as structured tools for AI agents (Claude Code, Claude Desktop, GoClaw, or any MCP-compatible client).

Wraps the official [Synology Office Suite REST API](https://office-suite-api.synology.com) (released 2025-02-18). LAN-only by default — no data leaves your network unless you explicitly opt in.

> [!WARNING]
> **Pre-1.0 status (`v0.2.0`)** — Foundation milestone. Authentication, HTTP base client, and security primitives are implemented and tested. Module clients (Drive / Spreadsheet / MailPlus / Calendar) and MCP server bootstrap land in upcoming `0.x` releases. See the [CHANGELOG](./CHANGELOG.md) and [Roadmap](#roadmap) for what is shipping next.

---

## Table of Contents

- [Features](#features)
- [Roadmap](#roadmap)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Connecting an MCP Client](#connecting-an-mcp-client)
- [Architecture](#architecture)
- [Security Model](#security-model)
- [Development](#development)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Module | Status | Capabilities (planned) |
|---|---|---|
| **Foundation** | ✅ Shipped (`0.2.0`) | Config, session auth, token cache, base HTTP client, error mapping, security guards |
| **Drive** | 🚧 Planned (`0.3.0`) | List / search / read / write / move / delete / share files |
| **Spreadsheet** | 🚧 Planned (`0.4.0`) | Get cells, set cells, list sheets, formula evaluation |
| **MailPlus** | 🚧 Planned (`0.5.0`) | List / read / send / search messages, attachments |
| **Calendar** | 🚧 Planned (`0.6.0`) | List / create / update / delete events, free-busy |
| **MCP Integration** | 🚧 Planned (`0.7.0`) | Tool registry, resources, prompts, stdio + SSE transports |
| **Hardening & Release** | 🎯 `1.0.0` | End-to-end smoke tests on real DSM, retry/backoff, structured logging, npm publish |

Modules **not** included (no public API yet): Synology Docs, Synology Slides.

### Design principles

- **Self-hosted, LAN-only by default** — secure-by-default TLS verification, SSE bound to `127.0.0.1` unless an `MCP_AUTH_TOKEN` is set
- **No third-party MCP middlemen** — every Synology call goes through the official REST API
- **Read-heavy, safe writes** — destructive operations (`delete`, `overwrite`, `send`) require an explicit `confirm: true` parameter
- **Stateless tool calls** — each MCP invocation is independent; session/token lifecycle is internal
- **Single binary** — compiled ESM TypeScript, deployable as `node dist/index.js`

---

## Roadmap

| Phase | Milestone | Target |
|---|---|---|
| 01 | Foundation (auth, base client, security utils) | ✅ `0.2.0` |
| 02 | Drive module (10 tools) | `0.3.0` |
| 03 | Spreadsheet module (7 tools) | `0.4.0` |
| 04 | MailPlus module (6 tools) | `0.5.0` |
| 05 | Calendar module (6 tools) | `0.6.0` |
| 06 | MCP integration (registry, transports) | `0.7.0` |
| 07 | Hardening (retry, logging, shutdown) | `0.9.0` |
| 08 | Docs, examples, npm release | `1.0.0` |

Detailed plan: [`plans/260426-1222-synology-office-mcp/plan.md`](./plans/260426-1222-synology-office-mcp/plan.md)

---

## Requirements

| Component | Version |
|---|---|
| Node.js | `>= 24.0.0` (ESM-only) |
| pnpm | `>= 9.0.0` |
| Synology DSM | `7.2.2 nano3+` |
| Synology Drive | `3.5.2+` |
| Synology Office | `3.6.0+` (for Spreadsheet) |
| Synology MailPlus | `3.3.1+` |
| Synology Calendar | `2.5.3+` |

Tested on DS916+ / DSM 7.2.2.

---

## Quick Start

```bash
git clone https://github.com/vocweb/synology-mcp-server.git
cd synology-office-mcp

pnpm install
cp .env.example .env
# edit .env — at minimum: SYNO_HOST, SYNO_USERNAME, SYNO_PASSWORD

pnpm build
node dist/index.js
```

> Until `0.7.0` lands, the entry point validates configuration and prints a startup banner — full MCP server bootstrap (stdio + SSE) is wired in Phase 06.

---

## Configuration

All configuration is via environment variables, validated by [Zod](https://zod.dev) at startup. See [`.env.example`](./.env.example) for the full list with inline documentation.

### Required

| Variable | Description |
|---|---|
| `SYNO_HOST` | NAS hostname or IP (e.g. `192.168.1.100`) |
| `SYNO_USERNAME` | DSM account username |
| `SYNO_PASSWORD` | DSM account password (use an app-specific password if 2FA is enabled) |

### Common optional

| Variable | Default | Description |
|---|---|---|
| `SYNO_PORT` | `5001` | DSM port (`5000` HTTP, `5001` HTTPS) |
| `SYNO_HTTPS` | `true` | Use HTTPS |
| `SYNO_IGNORE_CERT` | `false` | Accept self-signed cert (set `true` only for trusted home NAS) |
| `SYNO_OTP_CODE` | — | 2FA code (prefer app-specific passwords) |
| `MCP_TRANSPORT` | `stdio` | `stdio` or `sse` |
| `MCP_SSE_HOST` | `127.0.0.1` | Bind address for SSE |
| `MCP_SSE_PORT` | `3100` | Port for SSE |
| `MCP_AUTH_TOKEN` | — | **Required** when `MCP_SSE_HOST` is non-loopback |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

> [!IMPORTANT]
> Setting `SYNO_IGNORE_CERT=true` disables MITM protection on the NAS connection. Only use it on trusted home networks with self-signed certs you control.

---

## Connecting an MCP Client

> ⚠️ MCP server bootstrap lands in `0.7.0`. The snippets below describe the **planned** integration once Phase 06 ships.

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
        "SYNO_PASSWORD": "your_pass"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add synology -- node /path/to/synology-office-mcp/dist/index.js
```

### SSE mode (remote clients)

```bash
MCP_TRANSPORT=sse \
MCP_SSE_HOST=0.0.0.0 \
MCP_SSE_PORT=3100 \
MCP_AUTH_TOKEN="$(openssl rand -hex 32)" \
node dist/index.js
```

Clients then connect to `http://<host>:3100/sse` with `Authorization: Bearer <token>`.

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

Full design: [`docs/system-architecture.md`](./docs/system-architecture.md) · spec: [`docs/project/synology-office-mcp-spec.md`](./docs/project/synology-office-mcp-spec.md).

---

## Security Model

- **TLS verification on by default.** `SYNO_IGNORE_CERT=true` is opt-in and logged at startup.
- **Credentials never appear in URLs.** Login uses `POST` with form body; session id (`sid`) is forwarded via `Cookie: id=…`, not query string.
- **SSE binds loopback by default.** Server refuses to start when SSE is bound to a non-loopback host without `MCP_AUTH_TOKEN`.
- **Sensitive values are redacted in logs** via [`src/utils/redact.ts`](./src/utils/redact.ts).
- **Path traversal is blocked** at tool boundary by [`src/utils/path-guard.ts`](./src/utils/path-guard.ts).
- **Origin checks** for SSE requests via [`src/utils/origin-guard.ts`](./src/utils/origin-guard.ts).
- **Bearer-token auth** for SSE via [`src/utils/bearer-auth.ts`](./src/utils/bearer-auth.ts).

Vulnerability disclosure: [SECURITY.md](./SECURITY.md).

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

### Coding conventions

- Strict TypeScript: `exactOptionalPropertyTypes`, no `any`
- File size **≤ 200 LOC** — split into focused modules when exceeded
- Kebab-case filenames, descriptive (`auth-manager.ts`, `drive-client.ts`)
- TSDoc on every exported symbol; English only
- All HTTP through `BaseClient` — tool handlers never call `fetch` directly
- Destructive operations: `confirm: true` is the **first** check in the handler
- Never log credentials or `sid` — use `redactSensitive()`

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full contributor workflow.

---

## Testing

| Layer | Tooling | Notes |
|---|---|---|
| Unit | [Vitest](https://vitest.dev) | All modules in `tests/` |
| HTTP mocking | [MSW](https://mswjs.io) | No real NAS required for unit tests |
| Smoke | Vitest, gated by `SMOKE_TEST=1` | Hits a real NAS — disabled in CI |

```bash
pnpm test               # unit only
SMOKE_TEST=1 pnpm test  # include smoke tests (requires .env with real NAS)
```

CI runs `typecheck`, `lint`, `test`, and `build` on Node 24 against every PR.

---

## Project Structure

```
synology-office-mcp/
├── src/
│   ├── auth/              # AuthManager + TokenCache
│   ├── clients/           # BaseClient (module clients land in 0.3+)
│   ├── types/             # AppConfig, SynologyResponse, MCP tool types
│   ├── utils/             # redact, path-guard, origin-guard, bearer-auth, error-map
│   ├── config.ts          # Zod-validated env loader
│   ├── errors.ts          # SynologyMcpError hierarchy
│   └── index.ts           # Entry point
├── tests/                 # Vitest unit tests (mirrors src/)
├── docs/                  # Specs, architecture, code standards
├── plans/                 # Phase-based implementation plans
└── .env.example           # All configuration documented inline
```

---

## Documentation

| Document | Purpose |
|---|---|
| [docs/project/synology-office-mcp-spec.md](./docs/project/synology-office-mcp-spec.md) | Full implementation specification (source of truth) |
| [deployment-guide.md](./deployment-guide.md) | Step-by-step deployment for 4 topologies (local/NAS × Docker/bare-metal) |
| [docs/system-architecture.md](./docs/system-architecture.md) | Component diagram, data flow, lifecycle |
| [docs/codebase-summary.md](./docs/codebase-summary.md) | Snapshot of current modules and responsibilities |
| [docs/code-standards.md](./docs/code-standards.md) | TypeScript, naming, testing conventions |
| [CHANGELOG.md](./CHANGELOG.md) | Versioned release notes (Keep a Changelog) |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contributor workflow |
| [SECURITY.md](./SECURITY.md) | Vulnerability disclosure |
| [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) | Contributor Covenant 2.1 |

---

## Contributing

PRs and issues are warmly welcomed — see [CONTRIBUTING.md](./CONTRIBUTING.md). For non-trivial changes, please open an issue first to discuss the approach.

This project follows [Conventional Commits](https://www.conventionalcommits.org) and [Semantic Versioning](https://semver.org).

---

## License

[MIT](./LICENSE) © 2026 Tien Chu — `<chutien@gmail.com>`

> Synology, Synology Drive, Synology Office, MailPlus, and Synology Calendar are trademarks of Synology Inc. This project is an independent open-source client and is not affiliated with or endorsed by Synology Inc.
