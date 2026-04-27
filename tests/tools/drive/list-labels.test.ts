/**
 * Tests for the drive_list_labels tool handler.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { listLabelsTool } from '../../../src/tools/drive/list-labels.js';
import type { McpErrorResponse } from '../../../src/types/mcp-types.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('drive_list_labels handler', () => {
  it('returns label list on happy path', async () => {
    const ctx = createTestContext();
    const result = (await listLabelsTool.handler({}, ctx)) as {
      labels: Array<{ id: string; name: string; color: string }>;
    };
    expect(result.labels).toHaveLength(1);
    expect(result.labels[0]?.name).toBe('Important');
    expect(result.labels[0]?.color).toBe('red');
  });

  it('returns McpErrorResponse on API error', async () => {
    server.use(
      http.get('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({ success: false, error: { code: 105 } }),
      ),
    );
    const ctx = createTestContext();
    const result = (await listLabelsTool.handler({}, ctx)) as McpErrorResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('PERMISSION_DENIED');
  });
});
