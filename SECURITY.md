# Security Policy

## Supported Versions

During the pre-1.0 phase only the latest minor version receives security fixes.

| Version | Status | Security Fixes |
|---|---|---|
| `0.2.x` | ✅ Current | Yes |
| `< 0.2.0` | ❌ Superseded | No — please upgrade |

Once `1.0.0` ships, the previous minor will receive critical fixes for 90 days.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately via one of:

1. **GitHub Security Advisories** (preferred) — [Report a vulnerability](https://github.com/vocweb/synology-mcp-server/security/advisories/new)
2. **Email** — `chutien@gmail.com` with subject `[SECURITY] synology-office-mcp: <summary>`

Please include, where possible:

- Affected version (`pnpm list synology-office-mcp` or `git rev-parse HEAD`)
- Reproduction steps or proof-of-concept
- Impact assessment (data disclosure, RCE, auth bypass, …)
- Suggested mitigation if you have one
- Whether you wish to be credited in the advisory

### Response targets

| Stage | Target |
|---|---|
| Acknowledgement | within **3 business days** |
| Triage & severity assessment | within **7 business days** |
| Fix released (critical / high) | within **30 days** of confirmation |
| Public disclosure | coordinated, after fix is published on npm |

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure) — please give us a reasonable window before publishing details.

## Scope

In-scope:

- Authentication / session handling (`src/auth/**`, `src/utils/bearer-auth.ts`)
- Path traversal and origin validation (`src/utils/path-guard.ts`, `src/utils/origin-guard.ts`)
- Credential leakage in logs or errors (`src/utils/redact.ts`)
- TLS / network handling (`src/clients/base-client.ts`, `src/auth/auth-manager.ts`)
- MCP tool input validation
- Configuration parsing (`src/config.ts`)

Out-of-scope:

- Vulnerabilities in third-party dependencies — please report to the upstream project; we will track and update via Dependabot
- Misconfiguration on the operator's NAS or network (unless caused by misleading defaults in this project)
- Issues requiring physical access to the NAS or the host running the MCP server
- Self-XSS or social-engineering reports

## Security Posture

The project is designed **secure-by-default**:

- TLS verification is **on** unless `SYNO_IGNORE_CERT=true` is explicitly set
- SSE binds to `127.0.0.1` unless explicitly changed; non-loopback bind requires `MCP_AUTH_TOKEN`
- Credentials never appear in URLs (`POST` form body for login, `Cookie` header for sid)
- All sensitive values pass through `redactSensitive()` before logging
- Path traversal is blocked at the tool boundary

## Recognition

We are happy to credit reporters in the published security advisory and `CHANGELOG.md`. Let us know your preferred name / handle when reporting.
