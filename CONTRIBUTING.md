# Contributing to synology-office-mcp

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository and clone it locally.
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` and fill in your NAS credentials.
4. Run tests: `pnpm test`

## Development Workflow

- Branch from `main` with a descriptive name: `feat/drive-labels`, `fix/token-ttl`
- Keep commits focused; use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`
- Run `pnpm typecheck && pnpm lint && pnpm test` before opening a PR
- All public symbols must have TSDoc comments
- File size ≤ 200 LOC; split into focused modules if exceeded

## Pull Request Process

1. Open a PR against `main` with a clear description of the change and motivation.
2. Link any related issues.
3. Ensure CI passes (typecheck, lint, test, build).
4. A maintainer will review within a few business days.
5. Squash-merge is the default strategy.

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml).

## Requesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml).

## Code of Conduct

This project follows the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md).
All contributors are expected to uphold it.
