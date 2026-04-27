/**
 * smoke-test.ts — standalone end-to-end smoke test against a real Synology NAS.
 *
 * Runs ~6 read-only tool calls and exits 0 on success, 1 on any failure.
 *
 * Usage:
 *   SMOKE_TEST=1 \
 *   SYNO_HOST=192.168.1.100 \
 *   SYNO_USERNAME=your_user \
 *   SYNO_PASSWORD=your_password \
 *   npx tsx examples/smoke-test.ts
 *
 * Never run against production data with write operations.
 * All calls in this script are read-only.
 */

import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Gate: refuse to run without explicit opt-in
if (process.env['SMOKE_TEST'] !== '1') {
  console.error('ERROR: Set SMOKE_TEST=1 to run smoke tests against a real NAS.');
  console.error('       This script makes real API calls to your Synology NAS.');
  process.exit(1);
}

const required = ['SYNO_HOST', 'SYNO_USERNAME', 'SYNO_PASSWORD'] as const;
for (const key of required) {
  if (!process.env[key]) {
    console.error(`ERROR: Missing required env var: ${key}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// MCP JSON-RPC client over stdio
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, '../dist/index.js');

async function runSmokeTests(): Promise<void> {
  console.log('Starting synology-office-mcp smoke tests...');
  console.log(`Server: ${serverPath}`);
  console.log(`NAS:    ${process.env['SYNO_HOST']}`);
  console.log('');

  // Spawn the MCP server process
  const server = spawn('node', [serverPath], {
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stderr = '';
  server.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  let pendingId = 1;
  const pending = new Map<number, { resolve: (r: JsonRpcResponse) => void; reject: (e: Error) => void }>();
  let buffer = '';

  server.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line) as JsonRpcResponse;
        const handler = pending.get(msg.id);
        if (handler) {
          pending.delete(msg.id);
          handler.resolve(msg);
        }
      } catch {
        // ignore non-JSON lines (startup banner etc.)
      }
    }
  });

  function sendRequest(method: string, params: unknown): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      const id = pendingId++;
      const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };
      pending.set(id, { resolve, reject });
      server.stdin.write(JSON.stringify(request) + '\n');
      // Timeout per call: 30s
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`Timeout waiting for response to ${method} (id=${id})`));
        }
      }, 30_000);
    });
  }

  async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const response = await sendRequest('tools/call', { name, arguments: args });
    if (response.error) {
      throw new Error(`Tool ${name} failed: ${response.error.message} (code ${response.error.code})`);
    }
    return response.result;
  }

  // Wait for server to be ready (initialize handshake)
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'smoke-test', version: '0.3.0' },
  });
  await sendRequest('notifications/initialized', {});

  const results: Array<{ name: string; ok: boolean; detail: string }> = [];

  async function test(label: string, fn: () => Promise<string>): Promise<void> {
    try {
      const detail = await fn();
      results.push({ name: label, ok: true, detail });
      console.log(`  PASS  ${label}: ${detail}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ name: label, ok: false, detail: msg });
      console.error(`  FAIL  ${label}: ${msg}`);
    }
  }

  console.log('Running read-only tool calls...\n');

  await test('drive_list_files /mydrive', async () => {
    const result = callTool('drive_list_files', { folder_path: '/mydrive', limit: 10 }) as Promise<{ total?: number; files?: unknown[] }>;
    const r = await result;
    const count = (r as { total?: number }).total ?? (r as { files?: unknown[] }).files?.length ?? '?';
    return `${count} items`;
  });

  await test('drive_list_labels', async () => {
    const r = await callTool('drive_list_labels', {}) as { labels?: unknown[] };
    return `${r.labels?.length ?? 0} labels`;
  });

  await test('spreadsheet_list', async () => {
    const r = await callTool('spreadsheet_list', { limit: 10 }) as { total?: number; files?: unknown[] };
    const count = r.total ?? r.files?.length ?? '?';
    return `${count} spreadsheets`;
  });

  await test('calendar_list_calendars', async () => {
    const r = await callTool('calendar_list_calendars', {}) as { calendars?: unknown[] };
    return `${r.calendars?.length ?? 0} calendars`;
  });

  await test('mailplus_list_folders', async () => {
    const r = await callTool('mailplus_list_folders', {}) as { folders?: unknown[] };
    return `${r.folders?.length ?? 0} folders`;
  });

  await test('drive_get_file_info /mydrive', async () => {
    const r = await callTool('drive_get_file_info', { path: '/mydrive' }) as { name?: string; isdir?: boolean };
    return `name=${r.name ?? '?'} isdir=${r.isdir ?? '?'}`;
  });

  // Shutdown
  server.stdin.end();
  await new Promise<void>((resolve) => server.on('close', resolve));

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log('');
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error('\nFailed tests:');
    for (const r of results.filter((x) => !x.ok)) {
      console.error(`  - ${r.name}: ${r.detail}`);
    }
    if (stderr) {
      console.error('\nServer stderr:');
      console.error(stderr.slice(-2000));
    }
    process.exit(1);
  }

  console.log('\nAll smoke tests passed.');
}

runSmokeTests().catch((err) => {
  console.error('Smoke test runner error:', err);
  process.exit(1);
});
