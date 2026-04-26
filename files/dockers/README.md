# Docker files

Reusable container assets for **synology-office-mcp**. See [`deployment-guide.md`](../../deployment-guide.md) for full deployment topologies.

| File | Purpose |
|---|---|
| [`Dockerfile`](./Dockerfile) | Multi-stage Node 24 alpine image. Used by both local and NAS topologies. |
| [`docker-compose.local.yml`](./docker-compose.local.yml) | Local workstation deployment, SSE bound to `127.0.0.1:3100`. |
| [`docker-compose.nas.yml`](./docker-compose.nas.yml) | NAS deployment via Container Manager, `network_mode: host` for DSM loopback. |

## Quick start

**Build the image** (run from repo root):

```bash
docker build -t synology-office-mcp:0.2.0 -f files/dockers/Dockerfile .
```

**Local — SSE daemon:**

```bash
cp .env.example .env   # fill in SYNO_HOST, SYNO_USERNAME, SYNO_PASSWORD
docker compose -f files/dockers/docker-compose.local.yml up -d
docker compose -f files/dockers/docker-compose.local.yml logs -f
```

**Local — stdio (for Claude Desktop / Claude Code):**

```jsonc
{
  "mcpServers": {
    "synology": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "--env-file", "/absolute/path/to/.env",
        "synology-office-mcp:0.2.0"
      ]
    }
  }
}
```

**NAS — Container Manager:**

1. Copy `Dockerfile` and `docker-compose.nas.yml` (renamed to `docker-compose.yml`) to `/volume1/docker/synology-office-mcp/`.
2. Place a hardened `.env` (loopback values, see deployment-guide §3.3) next to it.
3. Container Manager → Project → Create → point at the folder. Or via SSH:

```bash
sudo docker compose -f /volume1/docker/synology-office-mcp/docker-compose.yml up -d
```

> [!IMPORTANT]
> If you bind SSE to a non-loopback host, `MCP_AUTH_TOKEN` is **mandatory** — the server refuses to start without it. Generate with `openssl rand -hex 32`.
