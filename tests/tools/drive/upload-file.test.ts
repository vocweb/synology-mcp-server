/**
 * Tests for the drive_upload_file tool handler.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { uploadFileTool } from '../../../src/tools/drive/upload-file.js';
import type { McpErrorResponse } from '../../../src/types/mcp-types.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('drive_upload_file handler', () => {
  it('uploads file and returns success result', async () => {
    const ctx = createTestContext();
    const result = (await uploadFileTool.handler(
      {
        dest_folder_path: '/mydrive/uploads',
        file_name: 'test.txt',
        content_base64: Buffer.from('hello world').toString('base64'),
        mime_type: 'text/plain',
        conflict_action: 'version',
      },
      ctx,
    )) as { success: boolean; file_id: string; file_name: string };
    expect(result.success).toBe(true);
    expect(result.file_id).toBe('new-file-001');
    expect(result.file_name).toBe('test.txt');
  });

  it('returns McpErrorResponse on API error', async () => {
    server.use(
      http.post('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({ success: false, error: { code: 414 } }),
      ),
    );
    const ctx = createTestContext();
    const result = (await uploadFileTool.handler(
      {
        dest_folder_path: '/mydrive/uploads',
        file_name: 'test.txt',
        content_base64: Buffer.from('data').toString('base64'),
        mime_type: 'text/plain',
        conflict_action: 'version',
      },
      ctx,
    )) as McpErrorResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('PERMISSION_DENIED');
  });
});
