/**
 * Bootstrap entry point for synology-office-mcp.
 * Parses CLI args, loads config, builds clients, wires MCP server, starts transport.
 * Handles graceful shutdown on SIGTERM/SIGINT.
 */

import { loadConfig } from './config.js';
import { AuthManager } from './auth/auth-manager.js';
import { SpreadsheetAuthManager } from './auth/spreadsheet-auth-manager.js';
import { DriveClient } from './clients/drive-client.js';
import { SpreadsheetClient } from './clients/spreadsheet-client.js';
import { MailPlusClient } from './clients/mailplus-client.js';
import { CalendarClient } from './clients/calendar-client.js';
import { SpreadsheetIdCache } from './cache/spreadsheet-id-cache.js';
import { aggregateTools } from './tools/index.js';
import { createServer } from './server/create-server.js';
import { startStdioTransport } from './server/transport-stdio.js';
import { startSseTransport } from './server/transport-sse.js';
import type { ToolContext } from './tools/types.js';

// ---------------------------------------------------------------------------
// CLI argument parsing (minimal: --transport, --port, --host)
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { transport?: string; port?: number; host?: string } {
  const result: { transport?: string; port?: number; host?: string } = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i] ?? '';
    if (arg === '--transport' && argv[i + 1] !== undefined) {
      const val = argv[++i];
      if (val !== undefined) result.transport = val;
    } else if (arg === '--port' && argv[i + 1] !== undefined) {
      const n = parseInt(argv[++i] ?? '', 10);
      if (!Number.isNaN(n)) result.port = n;
    } else if (arg === '--host' && argv[i + 1] !== undefined) {
      const val = argv[++i];
      if (val !== undefined) result.host = val;
    } else if (arg.startsWith('--transport=')) {
      result.transport = arg.slice('--transport='.length);
    } else if (arg.startsWith('--port=')) {
      const n = parseInt(arg.slice('--port='.length), 10);
      if (!Number.isNaN(n)) result.port = n;
    } else if (arg.startsWith('--host=')) {
      result.host = arg.slice('--host='.length);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv);

  // Override env vars from CLI before loadConfig reads process.env
  if (cliArgs.transport !== undefined && cliArgs.transport !== '') {
    process.env['MCP_TRANSPORT'] = cliArgs.transport;
  }
  if (cliArgs.port !== undefined) {
    process.env['MCP_SSE_PORT'] = String(cliArgs.port);
  }
  if (cliArgs.host !== undefined && cliArgs.host !== '') {
    process.env['MCP_SSE_HOST'] = cliArgs.host;
  }

  let config;
  try {
    config = loadConfig();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Fatal: ${message}\n`);
    process.exit(1);
  }

  // Log startup info — redact auth token if present
  const transportInfo =
    config.mcp.transport === 'sse' ? `sse on ${config.mcp.sseHost}:${config.mcp.ssePort}` : 'stdio';
  const authInfo = config.mcp.authToken !== undefined ? ' [auth=enabled]' : '';
  process.stderr.write(
    `synology-office-mcp starting — transport: ${transportInfo}${authInfo}, NAS: ${config.synology.host}:${config.synology.port}\n`,
  );

  // Build auth managers and clients
  const authManager = new AuthManager(config.synology);
  const spreadsheetAuthManager = new SpreadsheetAuthManager(config.synology);
  const driveClient = new DriveClient(config.synology, authManager);
  const spreadsheetClient = new SpreadsheetClient(config.synology, spreadsheetAuthManager);
  const mailplusClient = new MailPlusClient(config.synology, authManager);
  const calendarClient = new CalendarClient(config.synology, authManager);
  const spreadsheetIdCache = new SpreadsheetIdCache();

  const ctx: ToolContext = {
    driveClient,
    spreadsheetClient,
    mailplusClient,
    calendarClient,
    spreadsheetIdCache,
  };

  const tools = aggregateTools(config.features);
  const server = createServer(tools, ctx);

  // -------------------------------------------------------------------------
  // Graceful shutdown
  // -------------------------------------------------------------------------
  let sseClose: (() => Promise<void>) | undefined;

  async function shutdown(signal: string): Promise<void> {
    process.stderr.write(`Received ${signal}, shutting down...\n`);
    try {
      if (sseClose !== undefined) {
        await sseClose();
      }
      // 5s timeout on logout so a hung session never blocks exit
      await Promise.race([
        authManager.logout(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('logout timed out')), 5_000),
        ),
      ]);
    } catch {
      // Best-effort shutdown; errors are silenced
    }
    process.exit(0);
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // -------------------------------------------------------------------------
  // Start transport
  // -------------------------------------------------------------------------
  if (config.mcp.transport === 'sse') {
    const { close } = startSseTransport(server, {
      host: config.mcp.sseHost,
      port: config.mcp.ssePort,
      ...(config.mcp.authToken !== undefined ? { authToken: config.mcp.authToken } : {}),
    });
    sseClose = close;
    process.stderr.write(
      `SSE transport listening on http://${config.mcp.sseHost}:${config.mcp.ssePort}/sse\n`,
    );
  } else {
    await startStdioTransport(server);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal: ${message}\n`);
  process.exit(1);
});
