/**
 * Tests for the drive_delete_file tool handler.
 * Validates confirmation guard and happy/error paths.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { deleteFileTool } from '../../../src/tools/drive/delete-file.js';
import type {
  McpConfirmationRequiredResponse,
  McpErrorResponse,
} from '../../../src/types/mcp-types.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('drive_delete_file handler', () => {
  it('returns CONFIRMATION_REQUIRED when confirm=false', async () => {
    const ctx = createTestContext();
    const result = (await deleteFileTool.handler(
      { path: '/mydrive/report.osheet', permanent: false, confirm: false },
      ctx,
    )) as McpConfirmationRequiredResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('CONFIRMATION_REQUIRED');
    expect(result.operation).toContain('/mydrive/report.osheet');
  });

  it('deletes file when confirm=true', async () => {
    const ctx = createTestContext();
    const result = (await deleteFileTool.handler(
      { path: '/mydrive/report.osheet', permanent: false, confirm: true },
      ctx,
    )) as { success: boolean };
    expect(result.success).toBe(true);
  });

  it('returns McpErrorResponse when file not found', async () => {
    server.use(
      http.post('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({ success: false, error: { code: 408 } }),
      ),
    );
    const ctx = createTestContext();
    const result = (await deleteFileTool.handler(
      { path: '/mydrive/missing.txt', permanent: true, confirm: true },
      ctx,
    )) as McpErrorResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('NOT_FOUND');
  });
});
