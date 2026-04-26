/**
 * Entry point for synology-office-mcp.
 * Phase 01 stub: validates config and prints startup banner.
 * Full MCP server bootstrap is wired in Phase 06.
 */

import { loadConfig } from './config.js';

// Announce startup so process managers (pm2, systemd) can detect it
process.stderr.write('synology-office-mcp starting...\n');

try {
  const config = loadConfig();
  process.stderr.write(
    `Config loaded — transport: ${config.mcp.transport}, NAS: ${config.synology.host}:${config.synology.port}\n`,
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal: ${message}\n`);
  process.exit(1);
}
