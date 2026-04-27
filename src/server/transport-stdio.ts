/**
 * Stdio transport bootstrap for the MCP server.
 * Used for Claude Code and local CLI integrations (default transport).
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Connects the MCP server to stdin/stdout using the stdio transport.
 * Blocks until the transport is closed (process exit or pipe close).
 *
 * @param server - Configured MCP Server instance.
 */
export async function startStdioTransport(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
