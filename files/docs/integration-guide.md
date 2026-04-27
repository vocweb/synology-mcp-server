# Integration Guide

How to wire **synology-office-mcp** into MCP-aware AI agents and clients. This guide assumes the server is already deployed (see [`deployment-guide.md`](../deployment-guide.md)) and reachable via either:

- **stdio transport** — the client spawns `node dist/index.js` (or `docker run … -i`) as a subprocess, default mode.
- **SSE transport** — the server runs as a long-lived HTTP daemon at `http://<host>:3100/sse`, optionally fronted by HTTPS reverse proxy and protected by `MCP_AUTH_TOKEN`.

> [!NOTE]
> **Pre-1.0 status (`v0.2.0`).** Until `0.7.0` lands, the binary validates configuration and prints a startup banner. Tool serving over stdio + SSE wires up in Phase 06. Configure clients now; the wiring below continues to work after `0.7.0`.

---

## Compatibility matrix

| Client | Native MCP support | Transport | Notes |
|---|---|---|---|
| [Claude Code (CLI)](#claude-code-cli) | ✅ | stdio, SSE | First-class. `claude mcp add`. |
| [Claude Desktop](#claude-desktop) | ✅ | stdio | Edit `claude_desktop_config.json`. |
| [Cursor](#cursor) | ✅ | stdio, SSE | Settings → MCP. |
| [Continue.dev](#continuedev) | ✅ | stdio, SSE | `~/.continue/config.json`. |
| [Windsurf / Codeium](#windsurf--codeium) | ✅ | stdio | `mcp_config.json`. |
| [OpenAI Codex CLI](#openai-codex-cli) | ✅ (>=0.20) | stdio | `~/.codex/config.toml`. |
| [Google Antigravity](#google-antigravity) | ✅ | stdio, SSE | Workspace MCP settings. |
| [ChatGPT (custom GPT / Desktop)](#chatgpt) | ⚠️ Bridge | HTTPS + bridge | OpenAI Desktop MCP beta or HTTP-shim. |
| [BabyAGI / AutoGPT-style frameworks](#babyagi--autogpt-style-frameworks) | ⚠️ SDK | stdio, SSE | Use `@modelcontextprotocol/sdk`. |
| [LangChain / LangGraph](#langchain--langgraph) | ⚠️ Adapter | stdio, SSE | `langchain-mcp-adapters`. |
| [LlamaIndex](#llamaindex) | ⚠️ Adapter | stdio, SSE | `llama-index-tools-mcp`. |
| [Generic MCP SDK clients](#generic-mcp-sdk-clients) | ✅ | stdio, SSE | `@modelcontextprotocol/sdk` (TS) / `mcp` (Python). |

Legend: ✅ first-class, ⚠️ via adapter or shim.

---

## Common configuration values

The examples reuse these placeholders — substitute with your own paths and secrets:

| Placeholder | Meaning |
|---|---|
| `${MCP_DIR}` | Absolute path to the cloned repo (e.g. `/Users/you/synology-office-mcp`). |
| `${ENV_FILE}` | Absolute path to your populated `.env`. |
| `${MCP_URL}` | SSE endpoint, e.g. `https://mcp.your-nas.local:3443/sse`. |
| `${MCP_TOKEN}` | Value of `MCP_AUTH_TOKEN` (required for non-loopback SSE). |

stdio launchers always set the working directory to `${MCP_DIR}` so the server can resolve relative paths.

---

## Claude Code (CLI)

Claude Code is Anthropic's official CLI and has native MCP support.

**stdio (recommended):**

```bash
claude mcp add synology -- node ${MCP_DIR}/dist/index.js
```

Claude Code reads the host's environment, so `SYNO_*` vars from your shell pass through. To inject from `.env`:

```bash
claude mcp add synology --env-file ${ENV_FILE} -- node ${MCP_DIR}/dist/index.js
```

**SSE:**

```bash
claude mcp add --transport sse synology ${MCP_URL} \
  --header "Authorization: Bearer ${MCP_TOKEN}"
```

Verify: `claude mcp list` should show `synology: connected`.

---

## Claude Desktop

Edit `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```jsonc
{
  "mcpServers": {
    "synology": {
      "command": "node",
      "args": ["${MCP_DIR}/dist/index.js"],
      "env": {
        "SYNO_HOST": "192.168.1.100",
        "SYNO_USERNAME": "your_user",
        "SYNO_PASSWORD": "your_pass"
      }
    }
  }
}
```

Docker variant — useful if you don't want Node on the host:

```jsonc
{
  "mcpServers": {
    "synology": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "--env-file", "${ENV_FILE}",
        "synology-office-mcp:0.2.0"
      ]
    }
  }
}
```

Restart Claude Desktop. The hammer icon should list Synology tools once `0.7.0` is shipped.

---

## Cursor

**Settings → Cursor Settings → MCP → Add new MCP server.** Or edit `~/.cursor/mcp.json`:

```jsonc
{
  "mcpServers": {
    "synology": {
      "command": "node",
      "args": ["${MCP_DIR}/dist/index.js"],
      "env": { "SYNO_HOST": "...", "SYNO_USERNAME": "...", "SYNO_PASSWORD": "..." }
    }
  }
}
```

For SSE:

```jsonc
{
  "mcpServers": {
    "synology": {
      "url": "${MCP_URL}",
      "headers": { "Authorization": "Bearer ${MCP_TOKEN}" }
    }
  }
}
```

---

## Continue.dev

Add to `~/.continue/config.json` under `experimental.modelContextProtocolServers`:

```jsonc
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "node",
          "args": ["${MCP_DIR}/dist/index.js"]
        }
      }
    ]
  }
}
```

For SSE, swap `transport.type` to `"sse"` and provide `url` + `headers`.

---

## Windsurf / Codeium

Edit `~/.codeium/windsurf/mcp_config.json`:

```jsonc
{
  "mcpServers": {
    "synology": {
      "command": "node",
      "args": ["${MCP_DIR}/dist/index.js"],
      "env": { "SYNO_HOST": "...", "SYNO_USERNAME": "...", "SYNO_PASSWORD": "..." }
    }
  }
}
```

Toggle the server on under **Cascade → MCP servers**.

---

## OpenAI Codex CLI

Codex CLI 0.20+ supports MCP via `~/.codex/config.toml`:

```toml
[mcp_servers.synology]
command = "node"
args = ["${MCP_DIR}/dist/index.js"]

[mcp_servers.synology.env]
SYNO_HOST = "192.168.1.100"
SYNO_USERNAME = "your_user"
SYNO_PASSWORD = "your_pass"
```

Run `codex` and the tools appear under the Synology server. SSE is not yet supported in Codex CLI — tunnel via stdio or wrap with [`mcp-remote`](https://github.com/geelen/mcp-remote):

```toml
[mcp_servers.synology]
command = "npx"
args = ["mcp-remote", "${MCP_URL}", "--header", "Authorization: Bearer ${MCP_TOKEN}"]
```

---

## Google Antigravity

Antigravity (Google's agentic IDE) reads MCP servers from **Workspace Settings → MCP**. Programmatic equivalent in `~/.antigravity/mcp.json`:

```jsonc
{
  "mcpServers": {
    "synology": {
      "command": "node",
      "args": ["${MCP_DIR}/dist/index.js"],
      "env": { "SYNO_HOST": "...", "SYNO_USERNAME": "...", "SYNO_PASSWORD": "..." }
    }
  }
}
```

For remote SSE setups, use the same `url` + `headers` shape as Cursor.

---

## ChatGPT

ChatGPT does **not** speak MCP natively yet. Two routes:

### A. ChatGPT Desktop — MCP beta (macOS/Windows)

If you have the MCP beta enabled (Settings → Beta features → "Use MCP servers"), add the server through the same JSON format as Claude Desktop. The beta only supports stdio launchers as of writing.

### B. Custom GPT via HTTPS bridge

For Custom GPTs (or web ChatGPT) you must expose a small REST shim that forwards Actions calls to the MCP server. Recommended bridge: [`mcp-openapi-proxy`](https://github.com/punkpeye/mcp-openapi-proxy) or [`mcphost`](https://github.com/mark3labs/mcphost) `--mode openapi`.

1. Run the bridge in front of `${MCP_URL}` to publish an OpenAPI spec.
2. In ChatGPT → **Configure → Actions → Import from URL**, point at `https://your-bridge/openapi.json`.
3. Auth: choose **API Key**, paste `${MCP_TOKEN}`, header name `Authorization`, prefix `Bearer`.

> [!WARNING]
> The bridge must terminate TLS with a public certificate. ChatGPT will not call self-signed endpoints. Use Cloudflare Tunnel or Tailscale Funnel for home labs.

---

## BabyAGI / AutoGPT-style frameworks

These frameworks don't ship MCP support out of the box, but the official TypeScript / Python SDKs make it a 30-line client.

**Python (recommended):**

```python
# pip install mcp
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

params = StdioServerParameters(
    command="node",
    args=["/abs/path/to/synology-office-mcp/dist/index.js"],
    env={"SYNO_HOST": "...", "SYNO_USERNAME": "...", "SYNO_PASSWORD": "..."},
)

async def list_tools():
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            for t in tools.tools:
                print(t.name, "—", t.description)

asyncio.run(list_tools())
```

Wire `session.call_tool(name, arguments)` into your BabyAGI task executor: each MCP tool becomes one "skill" the planner can dispatch.

**SSE variant:** swap `stdio_client` for `mcp.client.sse.sse_client(url, headers={...})`.

---

## LangChain / LangGraph

```bash
pip install langchain-mcp-adapters
```

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({
    "synology": {
        "command": "node",
        "args": ["/abs/path/to/synology-office-mcp/dist/index.js"],
        "transport": "stdio",
    }
})

tools = await client.get_tools()        # LangChain Tool objects
agent = create_react_agent(llm, tools)  # langgraph.prebuilt
```

For SSE, replace the entry with `{"transport": "sse", "url": "${MCP_URL}", "headers": {...}}`.

---

## LlamaIndex

```bash
pip install llama-index-tools-mcp
```

```python
from llama_index.tools.mcp import BasicMCPClient, McpToolSpec

client = BasicMCPClient(
    "node", args=["/abs/path/to/synology-office-mcp/dist/index.js"]
)
spec = McpToolSpec(client=client)
agent = FunctionAgent(tools=await spec.to_tool_list_async(), llm=llm)
```

---

## Generic MCP SDK clients

For any other agent framework, both official SDKs work:

- **TypeScript:** [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) — `Client` + `StdioClientTransport` / `SSEClientTransport`.
- **Python:** [`mcp`](https://github.com/modelcontextprotocol/python-sdk) — see BabyAGI snippet above.
- **Go:** [`mark3labs/mcp-go`](https://github.com/mark3labs/mcp-go).
- **Rust:** [`modelcontextprotocol/rust-sdk`](https://github.com/modelcontextprotocol/rust-sdk).

Tool discovery flow is identical across SDKs:

1. Connect transport.
2. `initialize()` — exchange protocol version + capabilities.
3. `list_tools()` — pull tool schemas; feed them to the LLM as function declarations.
4. `call_tool(name, args)` — invoke; return the result to the model.

---

## Securing remote integrations

| Threat | Mitigation |
|---|---|
| Token leakage | Never commit `${MCP_TOKEN}` to client config repos; load from OS keychain or env. |
| Replay over HTTP | Always front SSE with HTTPS (DSM Reverse Proxy, Cloudflare Tunnel, Tailscale). |
| Over-privileged DSM user | Create a **dedicated DSM service account** with only the modules/folders the agent needs. |
| Auto-block triggers | Whitelist the MCP host's IP in DSM → Security → Auto Block. |
| Stolen `.env` on shared workstation | `chmod 600 .env`; prefer Docker `--env-file` only when the file is user-owned. |
| 2FA accounts | Use a DSM **app-specific password**; do not embed `SYNO_OTP_CODE` in long-lived configs. |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Client says "MCP server failed to start" | Wrong absolute path or missing build | `pnpm build` then re-check `command`/`args`. |
| Tools list is empty | Pre-`0.7.0` banner-only stub | Wait for Phase 06 release, or test against `dev` branch once tools land. |
| `401 Unauthorized` on SSE | Missing/incorrect `MCP_AUTH_TOKEN` header | Verify the `Authorization: Bearer …` header reaches the server (DSM Reverse Proxy may strip it — add a custom header rule). |
| Client connects but tool calls hang | NAS unreachable from server host | `curl -k https://${SYNO_HOST}:${SYNO_PORT}` from where the MCP server runs. |
| Self-signed cert errors | NAS uses default DSM cert | `SYNO_IGNORE_CERT=true` (trusted networks only). |
| Works locally, fails in agent | Different working directory | Set `cwd` to `${MCP_DIR}` in the client config, or use absolute `args`. |

---

## Related documentation

- [`deployment-guide.md`](../deployment-guide.md) — install topologies (local / NAS, Docker / bare-metal).
- [`docs/system-architecture.md`](./system-architecture.md) — components, transports, data flow.
- [`SECURITY.md`](../SECURITY.md) — vulnerability disclosure & threat model.
- [`README.md`](../README.md) — feature overview, supported Synology modules.
