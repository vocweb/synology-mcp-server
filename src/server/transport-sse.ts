/**
 * SSE transport bootstrap for the MCP server.
 * Boots an HTTP server with /sse (GET) and /messages (POST) endpoints.
 * Enforces Bearer auth and Origin guard per MCP security spec.
 */

import * as http from 'node:http';
import type { Socket } from 'node:net';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { verifyBearer } from '../utils/bearer-auth.js';
import { isOriginAllowed } from '../utils/origin-guard.js';

/** Active SSE transports keyed by session ID. */
const activeTransports = new Map<string, SSEServerTransport>();

/** Options for starting the SSE transport. */
export interface SseTransportOptions {
  host: string;
  port: number;
  authToken?: string;
  /** Allowed Origin values; if empty, only loopback no-Origin requests pass. */
  allowedOrigins?: string[];
}

/**
 * Starts an HTTP server hosting the MCP SSE transport.
 * Returns a cleanup function that closes the HTTP server.
 *
 * @param server - Configured MCP Server instance.
 * @param opts - Bind host/port, optional auth token and origin allowlist.
 * @returns Object with `httpServer` and `close()` for graceful shutdown.
 */
export function startSseTransport(
  server: Server,
  opts: SseTransportOptions,
): { httpServer: http.Server; close: () => Promise<void> } {
  const allowedOrigins = opts.allowedOrigins ?? [];

  const httpServer = http.createServer((req, res) => {
    const url = req.url ?? '';
    // http.IncomingHttpHeaders types 'origin'/'authorization' as string | undefined.
    const origin = req.headers['origin'];
    const auth = req.headers['authorization'];

    // ------------------------------------------------------------------
    // Security checks common to all routes
    // ------------------------------------------------------------------
    if (!isOriginAllowed(origin, allowedOrigins, opts.host)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: Origin not allowed' }));
      return;
    }

    if (!verifyBearer(auth, opts.authToken)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: missing or invalid Bearer token' }));
      return;
    }

    // ------------------------------------------------------------------
    // GET /sse — open SSE stream
    // ------------------------------------------------------------------
    if (req.method === 'GET' && url === '/sse') {
      const transport = new SSEServerTransport('/messages', res);
      const sessionId = transport.sessionId;
      activeTransports.set(sessionId, transport);

      transport.onclose = () => {
        activeTransports.delete(sessionId);
      };

      server.connect(transport).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`SSE transport connect error: ${msg}\n`);
        activeTransports.delete(sessionId);
      });

      return;
    }

    // ------------------------------------------------------------------
    // POST /messages — route message to the correct session transport
    // ------------------------------------------------------------------
    if (req.method === 'POST' && url.startsWith('/messages')) {
      // Session ID is passed as a query param by the SDK client: /messages?sessionId=xxx
      const sessionId = new URL(url, `http://${opts.host}`).searchParams.get('sessionId') ?? '';
      const transport = activeTransports.get(sessionId);

      if (transport === undefined) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Session not found: ${sessionId}` }));
        return;
      }

      transport.handlePostMessage(req, res).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`SSE handlePostMessage error: ${msg}\n`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });

      return;
    }

    // ------------------------------------------------------------------
    // 404 for all other routes
    // ------------------------------------------------------------------
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  httpServer.listen(opts.port, opts.host);

  /** Track open sockets so close() can force-destroy them (avoids keep-alive hangs). */
  const sockets = new Set<Socket>();
  httpServer.on('connection', (sock) => {
    sockets.add(sock);
    sock.on('close', () => sockets.delete(sock));
  });

  const close = (): Promise<void> =>
    new Promise((resolve, reject) => {
      // Destroy all open sockets first so httpServer.close() doesn't wait for them
      for (const sock of sockets) {
        sock.destroy();
      }
      sockets.clear();
      httpServer.close((err) => {
        if (err !== undefined) reject(err);
        else resolve();
      });
    });

  return { httpServer, close };
}
