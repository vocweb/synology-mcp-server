/**
 * Tests for the drive_get_file_info tool handler.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { getFileInfoTool } from '../../../src/tools/drive/get-file-info.js';
import type { McpErrorResponse } from '../../../src/types/mcp-types.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('drive_get_file_info handler', () => {
  it('returns file metadata on happy path', async () => {
    const ctx = createTestContext();
    const result = (await getFileInfoTool.handler(
      { path: '/mydrive/report.osheet' },
      ctx,
    )) as Record<string, unknown>;
    expect(result['id']).toBe('file-001');
    expect(result['perm']).toBeDefined();
    expect((result['labels'] as string[]).length).toBeGreaterThan(0);
  });

  it('returns McpErrorResponse when file not found', async () => {
    const ctx = createTestContext();
    const result = (await getFileInfoTool.handler(
      { path: '/mydrive/notfound' },
      ctx,
    )) as McpErrorResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('NOT_FOUND');
  });

  it('returns McpErrorResponse on network error', async () => {
    server.use(http.get('http://nas.local:5000/webapi/entry.cgi', () => HttpResponse.error()));
    const ctx = createTestContext();
    const result = (await getFileInfoTool.handler(
      { path: '/mydrive/report.osheet' },
      ctx,
    )) as McpErrorResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('NETWORK_ERROR');
  });
});
