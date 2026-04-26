/**
 * Tests for resources/index.ts — list(), read() happy paths and invalid URI.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { allHandlers } from '../mocks/synology-handlers.js';
import { createTestContext } from '../mocks/test-client-factory.js';
import { list, read } from '../../src/resources/index.js';

const mswServer = setupServer(...allHandlers);
beforeAll(() => mswServer.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

// ---------------------------------------------------------------------------
// list()
// ---------------------------------------------------------------------------

describe('resources list()', () => {
  it('returns a non-empty resources array', () => {
    const { resources } = list();
    expect(resources.length).toBeGreaterThan(0);
  });

  it('every descriptor has uri, name, description, mimeType', () => {
    const { resources } = list();
    for (const r of resources) {
      expect(r.uri).toBeTruthy();
      expect(r.name).toBeTruthy();
      expect(r.description).toBeTruthy();
      expect(r.mimeType).toBe('application/json');
    }
  });
});

// ---------------------------------------------------------------------------
// read() — unsupported URI
// ---------------------------------------------------------------------------

describe('resources read() — invalid URI', () => {
  it('throws for an unsupported URI scheme', async () => {
    const ctx = createTestContext();
    await expect(read('syno://unknown/resource', ctx)).rejects.toThrow('Unsupported resource URI');
  });

  it('throws for an empty URI', async () => {
    const ctx = createTestContext();
    await expect(read('', ctx)).rejects.toThrow('Unsupported resource URI');
  });
});

// ---------------------------------------------------------------------------
// read() — calendar/list happy path
// ---------------------------------------------------------------------------

describe('resources read() — calendar/list', () => {
  it('returns contents array with JSON data', async () => {
    mswServer.use(
      http.get('http://nas.local:5000/webapi/auth.cgi', () =>
        HttpResponse.json({ success: true, data: { sid: 'test-sid' } }),
      ),
      http.get('http://nas.local:5000/webapi/entry.cgi', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('api') === 'SYNO.Cal.Cal') {
          return HttpResponse.json({
            success: true,
            data: [
              {
                cal_id: 'cal1',
                name: 'My Calendar',
                color: '#ff0000',
                is_owner: true,
                is_shared: false,
                description: '',
              },
            ],
          });
        }
        return HttpResponse.json({ success: false, error: { code: 100 } });
      }),
    );

    const ctx = createTestContext();
    const result = await read('syno://calendar/list', ctx);
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0]?.uri).toBe('syno://calendar/list');
    expect(result.contents[0]?.mimeType).toBe('application/json');
    const data = JSON.parse(result.contents[0]?.text ?? '[]') as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// read() — spreadsheet info URI pattern
// ---------------------------------------------------------------------------

describe('resources read() — spreadsheet patterns', () => {
  it('routes syno://spreadsheet/{id}/info to spreadsheet handler', async () => {
    mswServer.use(
      http.get('http://nas.local:5000/webapi/auth.cgi', () =>
        HttpResponse.json({ success: true, data: { sid: 'test-sid' } }),
      ),
      http.get('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({
          success: true,
          data: { file_id: 'f1', sheets: [{ name: 'Sheet1', row_count: 10, col_count: 5 }] },
        }),
      ),
    );

    const ctx = createTestContext();
    const result = await read('syno://spreadsheet/file123/info', ctx);
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0]?.mimeType).toBe('application/json');
  });
});
