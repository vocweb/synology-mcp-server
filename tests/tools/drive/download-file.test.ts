/**
 * Tests for the drive_download_file tool handler.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { downloadFileTool } from '../../../src/tools/drive/download-file.js';
import type { McpErrorResponse } from '../../../src/types/mcp-types.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('drive_download_file handler', () => {
  it('returns base64 content with metadata on happy path', async () => {
    const ctx = createTestContext();
    const result = (await downloadFileTool.handler({ path: '/mydrive/report.osheet' }, ctx)) as {
      file_name: string;
      mime_type: string;
      size: number;
      content_base64: string;
    };
    expect(result.file_name).toBe('report.osheet');
    expect(result.size).toBe(5); // "hello" is 5 bytes
    expect(result.content_base64).toBe(Buffer.from('hello').toString('base64'));
  });

  it('returns McpErrorResponse when file not found', async () => {
    const ctx = createTestContext();
    const result = (await downloadFileTool.handler(
      { path: '/mydrive/notfound' },
      ctx,
    )) as McpErrorResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('NOT_FOUND');
  });
});
