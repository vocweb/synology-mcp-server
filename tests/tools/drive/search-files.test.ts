/**
 * Tests for the drive_search_files tool handler.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { searchFilesTool } from '../../../src/tools/drive/search-files.js';
import type { McpErrorResponse } from '../../../src/types/mcp-types.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('drive_search_files handler', () => {
  it('returns matching files on happy path', async () => {
    const ctx = createTestContext();
    const result = (await searchFilesTool.handler(
      { query: 'report', folder_path: '/mydrive', limit: 50 },
      ctx,
    )) as { total: number; files: unknown[] };
    expect(result.total).toBe(1);
    expect(result.files).toHaveLength(1);
  });

  it('returns McpErrorResponse on API error', async () => {
    server.use(
      http.get('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({ success: false, error: { code: 105 } }),
      ),
    );
    const ctx = createTestContext();
    const result = (await searchFilesTool.handler(
      { query: 'report', folder_path: '/mydrive', limit: 50 },
      ctx,
    )) as McpErrorResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('PERMISSION_DENIED');
  });
});
