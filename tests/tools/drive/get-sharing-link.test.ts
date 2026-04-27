/**
 * Tests for the drive_get_sharing_link tool handler.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { getSharingLinkTool } from '../../../src/tools/drive/get-sharing-link.js';
import type { McpErrorResponse } from '../../../src/types/mcp-types.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('drive_get_sharing_link handler', () => {
  it('returns sharing link on happy path', async () => {
    const ctx = createTestContext();
    const result = (await getSharingLinkTool.handler(
      { path: '/mydrive/report.osheet', permission: 'view' },
      ctx,
    )) as { link: string; permission: string; expires_at: string | null };
    expect(result.link).toContain('https://');
    expect(result.permission).toBe('view');
    expect(result.expires_at).toBeNull();
  });

  it('returns McpErrorResponse on API error', async () => {
    server.use(
      http.post('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({ success: false, error: { code: 105 } }),
      ),
    );
    const ctx = createTestContext();
    const result = (await getSharingLinkTool.handler(
      { path: '/mydrive/report.osheet', permission: 'view' },
      ctx,
    )) as McpErrorResponse;
    expect(result.error).toBe(true);
    expect(result.code).toBe('PERMISSION_DENIED');
  });
});
