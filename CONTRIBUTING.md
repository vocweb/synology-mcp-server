# Contributing to synology-office-mcp

Thank you for your interest in contributing!

## Getting Started

```bash
git clone https://github.com/vocweb/synology-mcp-server.git
cd synology-mcp-server
pnpm install
cp .env.example .env
# Edit .env — at minimum: SYNO_HOST, SYNO_USERNAME, SYNO_PASSWORD
```

## Development Workflow

```bash
pnpm typecheck          # tsc --noEmit — run first
pnpm lint               # eslint src --max-warnings 0
pnpm test               # vitest run (unit only, no real NAS)
pnpm build              # tsup → dist/
pnpm dev                # build + watch mode
```

- Branch from `main`: `feat/drive-labels`, `fix/token-ttl`, `docs/tool-reference`
- Keep commits focused; one logical change per commit
- Pre-commit hooks (Husky + lint-staged) auto-run typecheck, lint, and Prettier on staged files

## Running Smoke Tests

Smoke tests hit a real NAS and are **never run in CI**. Gate them with `SMOKE_TEST=1`:

```bash
SMOKE_TEST=1 \
  SYNO_HOST=192.168.1.100 \
  SYNO_USERNAME=your_user \
  SYNO_PASSWORD=your_password \
  pnpm test
```

Alternatively, use the standalone script:

```bash
SMOKE_TEST=1 \
  SYNO_HOST=192.168.1.100 \
  SYNO_USERNAME=your_user \
  SYNO_PASSWORD=your_password \
  npx tsx examples/smoke-test.ts
```

> Use a dedicated DSM account with **read-only permissions** for smoke testing. Never run against production data.

## Commit Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org):

| Type | When to use |
|---|---|
| `feat:` | New tool, module, or user-visible capability |
| `fix:` | Bug fix |
| `test:` | Adding or updating tests |
| `refactor:` | Code restructure without behavior change |
| `docs:` | Documentation only |
| `chore:` | Build, deps, CI changes |

**Rules:**
- English only, imperative mood: `feat: add drive_upload_file tool`
- No AI references in commit messages
- No `.env`, credentials, or secrets in commits — ever

## Coding Conventions

- Strict TypeScript: `exactOptionalPropertyTypes`, no `any`
- File size **≤ 200 LOC** — split when exceeded
- Kebab-case filenames (`drive-client.ts`, `auth-manager.ts`)
- TSDoc on every exported symbol
- All HTTP through `BaseClient` — tool handlers never call `fetch` directly
- Destructive tools: `confirm: true` is the **first** check in the handler
- Never log credentials or `sid` — use `redactSensitive()`

## Adding a New Tool

1. Create `src/tools/{module}/your-tool.ts` following the pattern of an existing tool
2. Export from `src/tools/{module}/index.ts`
3. Register in `src/index.ts` tool registry
4. Add tests in `tests/tools/{module}/your-tool.test.ts` with MSW mocks
5. Update `docs/tool-reference.md`

## Pull Request Process

Before opening a PR:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes (zero warnings)
- [ ] `pnpm test` passes (all unit tests green)
- [ ] `pnpm build` succeeds
- [ ] New code has unit tests covering happy path and key failure cases
- [ ] `docs/tool-reference.md` updated if tools were added/changed
- [ ] No `.env`, secrets, or credentials committed

PR checklist:
1. Open against `main` with a clear description of change and motivation
2. Link related issues (`Closes #123`)
3. Ensure CI passes
4. A maintainer will review within a few business days
5. Squash-merge is the default strategy

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml).

## Requesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml).

## Code of Conduct

This project follows the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md). All contributors are expected to uphold it.

## Security Vulnerabilities

See [SECURITY.md](./SECURITY.md) for the private disclosure process. Do not open public issues for security vulnerabilities.
