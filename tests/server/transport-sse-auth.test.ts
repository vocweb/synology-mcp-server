/**
 * Tests for SSE transport Bearer auth and Origin guard.
 * Starts a real http.Server on an ephemeral port; makes direct HTTP requests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as http from 'node:http';
import { createTestContext } from '../mocks/test-client-factory.js';
import { createServer } from '../../src/server/create-server.js';
import { startSseTransport } from '../../src/server/transport-sse.js';
import { aggregateTools } from '../../src/tools/index.js';

const FEATURES = { drive: false, spreadsheet: false, mailplus: false, calendar: false };
const TEST_TOKEN = 'test-secret-token-xyz';

/** Make a GET request; returns status code. Destroys socket immediately after status is received. */
function get(port: number, path: string, headers: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: 'GET', headers },
      (res) => {
        const status = res.statusCode ?? 0;
        if (!settled) {
          settled = true;
          resolve(status);
        }
        // Destroy the socket so the long-lived SSE stream is closed immediately.
        res.destroy();
        req.destroy();
      },
    );
    req.on('error', (err) => {
      // ECONNRESET / ECONNABORTED is expected when we destroy the socket ourselves
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ECONNRESET' || code === 'ECONNABORTED') return;
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    req.end();
  });
}

let closeFn: (() => Promise<void>) | undefined;
let port: number;

beforeEach((ctx) => {
  // derive a stable ephemeral port from test name hash to avoid collisions
  // vitest runs tests sequentially within a file by default
  void ctx;
});

afterEach(async () => {
  if (closeFn !== undefined) {
    await closeFn();
    closeFn = undefined;
  }
});

function startServer(authToken?: string, allowedOrigins?: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const tools = aggregateTools(FEATURES);
    const ctx = createTestContext();
    const mcpServer = createServer(tools, ctx);

    const opts = {
      host: '127.0.0.1',
      port: 0, // OS assigns ephemeral port
      ...(authToken !== undefined ? { authToken } : {}),
      allowedOrigins: allowedOrigins ?? [],
    };

    const { httpServer, close } = startSseTransport(mcpServer, opts);
    closeFn = close;

    httpServer.on('error', reject);
    httpServer.once('listening', () => {
      const addr = httpServer.address();
      if (addr !== null && typeof addr === 'object') {
        resolve(addr.port);
      } else {
        reject(new Error('Could not get server port'));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// No auth token configured — all requests pass auth check
// ---------------------------------------------------------------------------

describe('SSE transport — no auth token', () => {
  it('allows GET /sse without Authorization header (loopback)', async () => {
    port = await startServer(undefined);
    // GET /sse opens an SSE stream — we only check the status is NOT 401/403
    // The connection will be 200 (SSE) or possibly hang; we abort after status
    const status = await get(port, '/sse');
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Auth token configured — requests without token are rejected
// ---------------------------------------------------------------------------

describe('SSE transport — Bearer auth required', () => {
  it('rejects GET /sse with no Authorization header → 401', async () => {
    port = await startServer(TEST_TOKEN);
    const status = await get(port, '/sse');
    expect(status).toBe(401);
  });

  it('rejects GET /sse with wrong token → 401', async () => {
    port = await startServer(TEST_TOKEN);
    const status = await get(port, '/sse', { Authorization: 'Bearer wrong-token' });
    expect(status).toBe(401);
  });

  it('accepts GET /sse with correct token', async () => {
    port = await startServer(TEST_TOKEN);
    const status = await get(port, '/sse', { Authorization: `Bearer ${TEST_TOKEN}` });
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);
  });

  it('rejects POST /messages without token → 401', async () => {
    port = await startServer(TEST_TOKEN);
    const status = await new Promise<number>((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port, path: '/messages?sessionId=abc', method: 'POST' },
        (res) => resolve(res.statusCode ?? 0),
      );
      req.on('error', reject);
      req.end();
    });
    expect(status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Origin guard
// ---------------------------------------------------------------------------

describe('SSE transport — Origin guard', () => {
  it('rejects request with disallowed Origin header → 403', async () => {
    // Start with an empty allowedOrigins list; loopback-only mode.
    // Sending an Origin header (even loopback) fails when allowedOrigins is empty
    // because isOriginAllowed() requires exact match when Origin is present.
    port = await startServer(undefined, []);
    const status = await get(port, '/sse', { Origin: 'http://evil.example.com' });
    expect(status).toBe(403);
  });

  it('allows request with matching Origin', async () => {
    port = await startServer(undefined, ['http://127.0.0.1']);
    const status = await get(port, '/sse', { Origin: 'http://127.0.0.1' });
    expect(status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 404 for unknown routes
// ---------------------------------------------------------------------------

describe('SSE transport — routing', () => {
  it('returns 404 for unknown route', async () => {
    port = await startServer(undefined);
    const status = await get(port, '/unknown');
    expect(status).toBe(404);
  });
});
