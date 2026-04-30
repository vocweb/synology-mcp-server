# Troubleshooting

## Synology Error Codes

When a Synology API call fails, the error includes a numeric `synoCode`. Common codes and fixes:

| Code | Meaning | Fix |
|---|---|---|
| `101` | Invalid parameter | Check the tool input — a required field is missing or has wrong type |
| `102` | Requested API does not exist | DSM package not installed or wrong API version; see [package checks](#package-checks) |
| `103` | Method does not exist | API version mismatch; ensure DSM and package versions meet requirements |
| `105` | Session does not exist | Token expired mid-request; the server retries automatically once — if persistent, restart |
| `106` | Session not found | Authentication lost; check `SYNO_USERNAME` / `SYNO_PASSWORD` are correct |
| `108` | Unknown error | Usually a transient DSM issue; retried automatically with backoff |
| `119` | SID not found | Session expired; auto-retried — if recurring, reduce `SYNO_REQUEST_TIMEOUT_MS` |
| `400` | Invalid credentials | Wrong username or password |
| `401` | Guest account disabled | Enable the account in DSM Control Panel > User |
| `403` | Permission denied | User lacks permission for this operation; check DSM user privileges |
| `404` | File not found | Path does not exist in Drive; verify with `drive_list_files` |
| `406` | OTP code required | 2FA is enabled; set `SYNO_OTP_CODE`, or create a dedicated service account without 2FA (DSM has no "Application Password" feature) |

---

## MailPlus Not Detected

**Symptom:** `mailplus_list_folders` returns error code `102` ("API does not exist").

**Cause:** MailPlus requires the **MailPlus Server** package, which is separate from the MailPlus client app.

**Fix:**
1. In DSM, go to `Package Center`
2. Search for **MailPlus Server** and install it (free)
3. Open MailPlus Server and complete initial setup (domain, admin mailbox)
4. Retry the tool call

---

## DSM Version Check

The server requires DSM 7.2.2 build **72806** or later.

**Check your build number:**

```
DSM Control Panel > Info Center > General tab > DSM Version
```

Or via SSH:

```bash
cat /etc.defaults/VERSION
# Look for: buildnumber="72806" (or higher)
```

If your build is lower, run `Control Panel > Update & Restore > DSM Update` to update.

---

## Self-Signed Certificate Errors

**Symptom:** Server starts but every API call fails with a TLS/certificate error.

**Fix:** Set `SYNO_IGNORE_CERT=true` in your environment.

```bash
SYNO_IGNORE_CERT=true node dist/index.js
```

This disables TLS verification for the NAS connection. Only safe on a trusted LAN with certificates you control.

---

## SSE Server Won't Start

**Symptom:** `Error: MCP_AUTH_TOKEN is required when MCP_SSE_HOST is not loopback`

**Fix:** When binding SSE to `0.0.0.0` or any non-loopback address, set `MCP_AUTH_TOKEN`:

```bash
MCP_TRANSPORT=sse \
MCP_SSE_HOST=0.0.0.0 \
MCP_SSE_PORT=3100 \
MCP_AUTH_TOKEN="$(openssl rand -hex 32)" \
node dist/index.js
```

---

## Path Traversal Blocked

**Symptom:** Tool returns `ValidationError: path traversal detected`

**Cause:** The path input contains `..` sequences or absolute escapes.

**Fix:** Use absolute Drive paths starting with `/mydrive` or `/team-folders/NAME`. Do not use `..` or paths that escape the Drive root.

---

## Authentication Loop / Repeated Login Failures

1. Verify credentials manually: open `https://YOUR_NAS:5001` in a browser and log in
2. If 2FA is active, prefer a dedicated DSM service account **without 2FA enabled** — DSM does NOT offer "Application Passwords" despite what some third-party docs imply, and `SYNO_OTP_CODE` only handles the initial login (and not at all for the Spreadsheet container, which rejects OTP)
3. Check `LOG_LEVEL=debug` output for the exact error code returned by `SYNO.API.Auth`

---

## Spreadsheet `/spreadsheets/authorize` Returns 401

**Symptom:** Calling the Spreadsheet container's authorize endpoint (directly via curl, or indirectly through `spreadsheet_*` tools) returns `401 Unauthorized` even though the same credentials log into DSM successfully.

**Cause:** The Spreadsheet container makes its OWN back-call to DSM to validate the credentials. That back-call — not the MCP→DSM connection — is what fails. Most common reason in homelab setups: the container ships without DSM's self-signed CA, so HTTPS verify fails.

**Diagnose:**

```bash
# 1. Confirm credentials work against DSM directly:
curl -k "https://DSM_HOST:DSM_HTTPS_PORT/webapi/entry.cgi?api=SYNO.API.Auth&version=6&method=login&account=USER&passwd=PASS"
# Expect: {"data":{...},"success":true}

# 2. Confirm container can reach DSM:
docker exec <ss-container> sh -c "curl -kv 'https://DSM_HOST:DSM_HTTPS_PORT/webapi/entry.cgi?api=SYNO.API.Auth&version=6&method=login&account=USER&passwd=PASS'"

# 3. Test the authorize endpoint with HTTP back-channel:
curl -X POST "http://SS_HOST:3000/spreadsheets/authorize" \
  -H "content-type: application/json" \
  -d '{"username":"USER","password":"PASS","host":"DSM_HOST:DSM_HTTP_PORT","protocol":"http"}'
# If THIS succeeds while https + DSM HTTPS port fails → confirms TLS-verify issue.
```

**Fix:** Point the container's back-call at DSM's HTTP port:

```env
SYNO_SS_DSM_HTTPS=false
SYNO_SS_DSM_PORT=5000   # or your DSM HTTP port
```

These settings only affect the container's back-call; `SYNO_HTTPS` / `SYNO_PORT` (MCP→DSM) stay HTTPS as usual.

**Other 401 causes (in order):**
1. Docker bridge subnet cannot reach DSM (firewall) — check DSM Control Panel → Security → Firewall, allow `172.17.0.0/16`
2. DSM auto-block hit the container IP — Control Panel → Security → Account → Block List, unblock + whitelist Docker subnet
3. User lacks Synology Office privilege — Control Panel → Application Privileges → Synology Office
4. 2FA-enabled account — endpoint does not accept OTP; use a dedicated non-2FA service account

---

## Package Checks

Verify required packages are installed and running in DSM `Package Center`:

| Capability | Required Package |
|---|---|
| Drive tools | Synology Drive Server ≥ 3.5.2 |
| Spreadsheet tools | Synology Office ≥ 3.6.0 |
| MailPlus tools | MailPlus Server (any recent version) |
| Calendar tools | Synology Calendar ≥ 2.5.3 |

---

## Enabling Debug Logs

```bash
LOG_LEVEL=debug node dist/index.js 2>&1 | tee /tmp/mcp-debug.log
```

Debug logs include: API endpoint called, HTTP status, Synology response code, retry attempts. Credentials and `sid` values are redacted automatically.
