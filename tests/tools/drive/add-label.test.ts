/**
 * Tests for the drive_add_label tool handler.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { addLabelTool } from '../../../src/tools/drive/add-label.js';
import type { McpErrorResponse } from '../../../src/types/mcp-types.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('drive_add_label handler', () => {
  it('adds label and returns success on happy path', async () => {
    const ctx = createTestContext();
    const result = (await addLabelTool.handler(
      { path: '/mydrive/report.osheet', label_name: 'Important' },
      ctx,
    )) as { success: boolean };
    expect(result.success).toBe(true);
  });

  it('returns McpErrorResponse on API error', async () => {
    server.use(
      http.post('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({ success: false, error: { code: 414 } }),
      ),
    );
    const ctx = createTestContext();
    const result = (await addLabelTool.handler(
      { path: '/mydrive/report.osheet', label_name: 'Important' },
      ctx,
    )) as McpErrorResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('PERMISSION_DENIED');
  });
});
