# Deployment Guide

Three deployment options. Recommended order: **Option A** (separate machine) → **Option B** (Docker on NAS) → **Option C** (NAS scheduled task).

---

## Option A: Separate Machine (Recommended)

Run on any Linux/macOS/Windows machine on the same LAN as the NAS.

```bash
git clone https://github.com/vocweb/synology-mcp-server.git
cd synology-mcp-server
pnpm install
cp .env.example .env
# Edit .env: SYNO_HOST, SYNO_USERNAME, SYNO_PASSWORD

pnpm build
node dist/index.js
```

Or install globally and run as a binary:

```bash
npm install -g synology-office-mcp
synology-mcp   # uses env vars or .env in cwd
```

**When to use:** The NAS is resource-constrained (DS916+), or you want process isolation from DSM.

---

## Option B: Docker on NAS

Requires Docker / Container Manager installed on DSM.

### Build image

```bash
# From the repo root (on the machine where you build):
docker build -t synology-office-mcp:0.3.0 -f files/dockers/Dockerfile .
```

The multi-stage `Dockerfile` at `files/dockers/Dockerfile` produces a minimal `node:22-alpine` image running as a non-root `node` user.

### Run container

```bash
docker run -d \
  --name synology-office-mcp \
  --restart unless-stopped \
  --network host \
  -e SYNO_HOST=192.168.1.100 \
  -e SYNO_USERNAME=your_user \
  -e SYNO_PASSWORD=your_password \
  -e MCP_TRANSPORT=sse \
  -e MCP_SSE_PORT=3100 \
  -e MCP_AUTH_TOKEN="$(openssl rand -hex 32)" \
  synology-office-mcp:0.3.0
```

### Via Synology Container Manager

1. Push the image to a registry or export it: `docker save synology-office-mcp:0.3.0 | gzip > mcp.tar.gz`
2. Import in Container Manager > Image > Add > From file
3. Create container with the environment variables above
4. Enable "Auto-restart"

---

## Option C: Synology Scheduled Task

Run directly on the NAS via DSM Task Scheduler (no Docker required).

**Prerequisites:** Node.js installed on the NAS (via Package Center or `nvm`).

1. Copy the built `dist/` and `package.json` to `/volume1/homes/admin/synology-office-mcp/`
2. In DSM: `Control Panel > Task Scheduler > Create > Triggered Task > User-defined script`

```bash
#!/bin/bash
# Synology Task Scheduler script
cd /volume1/homes/admin/synology-office-mcp

export SYNO_HOST=192.168.1.100
export SYNO_USERNAME=your_user
export SYNO_PASSWORD=your_password
export MCP_TRANSPORT=sse
export MCP_SSE_PORT=3100
export MCP_AUTH_TOKEN=your_token

node dist/index.js &
echo $! > /tmp/synology-office-mcp.pid
```

To stop: `kill $(cat /tmp/synology-office-mcp.pid)`

---

## Option D: systemd (Linux server)

```ini
# /etc/systemd/system/synology-office-mcp.service
[Unit]
Description=Synology Office MCP Server
After=network.target

[Service]
Type=simple
User=synomcp
WorkingDirectory=/opt/synology-office-mcp
EnvironmentFile=/opt/synology-office-mcp/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now synology-office-mcp
sudo journalctl -u synology-office-mcp -f
```

---

## SSE vs stdio mode

| Mode | Use case | Client config |
|---|---|---|
| `stdio` (default) | Claude Desktop, Claude Code — single client, local | `command: node dist/index.js` |
| `sse` | GoClaw, multi-client, remote access | `url: http://host:3100/sse` + Bearer token |

For SSE on a non-loopback address, `MCP_AUTH_TOKEN` is **required** — the server refuses to start without it.

---

## Environment variables quick reference

See [`.env.example`](../.env.example) for the full annotated list. Minimum required:

```bash
SYNO_HOST=192.168.1.100
SYNO_USERNAME=your_user
SYNO_PASSWORD=your_password
```

For self-signed NAS certificates: `SYNO_IGNORE_CERT=true` (LAN only).
