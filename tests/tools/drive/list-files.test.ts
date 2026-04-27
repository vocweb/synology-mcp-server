/**
 * Tests for the drive_list_files tool handler.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { listFilesTool } from '../../../src/tools/drive/list-files.js';
import type { McpErrorResponse } from '../../../src/types/mcp-types.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('drive_list_files handler', () => {
  it('returns file list on happy path', async () => {
    const ctx = createTestContext();
    const result = await listFilesTool.handler(
      {
        folder_path: '/mydrive',
        limit: 100,
        offset: 0,
        sort_by: 'name',
        sort_direction: 'ASC',
        file_type: 'all',
      },
      ctx,
    );
    const list = result as { total: number; files: unknown[] };
    expect(list.total).toBe(2);
    expect(list.files).toHaveLength(2);
  });

  it('returns McpErrorResponse on API error', async () => {
    server.use(
      http.get('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({ success: false, error: { code: 105 } }),
      ),
    );
    const ctx = createTestContext();
    const result = (await listFilesTool.handler(
      {
        folder_path: '/mydrive',
        limit: 100,
        offset: 0,
        sort_by: 'name',
        sort_direction: 'ASC',
        file_type: 'all',
      },
      ctx,
    )) as McpErrorResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('PERMISSION_DENIED');
  });
});
