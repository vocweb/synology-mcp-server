/**
 * Tests for the drive_move_file tool handler.
 * Validates confirmation guard and happy/error paths.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { moveFileTool } from '../../../src/tools/drive/move-file.js';
import type {
  McpConfirmationRequiredResponse,
  McpErrorResponse,
} from '../../../src/types/mcp-types.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('drive_move_file handler', () => {
  it('returns CONFIRMATION_REQUIRED when confirm=false', async () => {
    const ctx = createTestContext();
    const result = (await moveFileTool.handler(
      {
        path: '/mydrive/report.osheet',
        dest_folder_path: '/mydrive/dest',
        conflict_action: 'autorename',
        confirm: false,
      },
      ctx,
    )) as McpConfirmationRequiredResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('CONFIRMATION_REQUIRED');
    expect(result.operation).toContain('/mydrive/report.osheet');
  });

  it('moves file when confirm=true', async () => {
    const ctx = createTestContext();
    const result = (await moveFileTool.handler(
      {
        path: '/mydrive/report.osheet',
        dest_folder_path: '/mydrive/dest',
        conflict_action: 'autorename',
        confirm: true,
      },
      ctx,
    )) as { success: boolean; new_path: string; dry_run: boolean };
    expect(result.success).toBe(true);
    expect(result.dry_run).toBe(false);
    expect(result.new_path).toBe('/mydrive/dest/report.osheet');
  });

  it('returns McpErrorResponse when source not found', async () => {
    server.use(
      http.post('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({ success: false, error: { code: 408 } }),
      ),
    );
    const ctx = createTestContext();
    const result = (await moveFileTool.handler(
      {
        path: '/mydrive/missing.txt',
        dest_folder_path: '/mydrive/dest',
        conflict_action: 'autorename',
        confirm: true,
      },
      ctx,
    )) as McpErrorResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('NOT_FOUND');
  });
});
