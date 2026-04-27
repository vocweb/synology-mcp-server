/**
 * Tests for the drive_create_folder tool handler.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { createFolderTool } from '../../../src/tools/drive/create-folder.js';
import type { McpErrorResponse } from '../../../src/types/mcp-types.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('drive_create_folder handler', () => {
  it('creates folder and returns id on happy path', async () => {
    const ctx = createTestContext();
    const result = (await createFolderTool.handler(
      { folder_path: '/mydrive/projects', name: 'new-folder', force_parent: false },
      ctx,
    )) as { success: boolean; folder_id: string; folder_path: string };
    expect(result.success).toBe(true);
    expect(result.folder_id).toBe('dir-new');
    expect(result.folder_path).toBe('/mydrive/projects/new-folder');
  });

  it('returns McpErrorResponse on permission error', async () => {
    server.use(
      http.post('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({ success: false, error: { code: 414 } }),
      ),
    );
    const ctx = createTestContext();
    const result = (await createFolderTool.handler(
      { folder_path: '/mydrive/projects', name: 'locked', force_parent: false },
      ctx,
    )) as McpErrorResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('PERMISSION_DENIED');
  });
});
