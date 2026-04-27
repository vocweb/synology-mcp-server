/**
 * Tests for calendar_delete_event tool.
 * Covers: confirm guard, happy path, error path.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { calendarDeleteEventTool } from '../../../src/tools/calendar/delete-event.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('calendar_delete_event', () => {
  it('returns CONFIRMATION_REQUIRED when confirm=false', async () => {
    const ctx = createTestContext();
    const result = (await calendarDeleteEventTool.handler(
      { event_id: 'evt-001', calendar_id: 'cal-001', confirm: false },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBe(true);
    expect(result['code']).toBe('CONFIRMATION_REQUIRED');
  });

  it('deletes event and returns success when confirm=true', async () => {
    const ctx = createTestContext();
    const result = (await calendarDeleteEventTool.handler(
      { event_id: 'evt-001', calendar_id: 'cal-001', confirm: true },
      ctx,
    )) as Record<string, unknown>;
    expect(result['success']).toBe(true);
  });

  it('returns error response on API failure', async () => {
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.post('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({ success: false, error: { code: 100 } }),
      ),
    );
    const ctx = createTestContext();
    const result = (await calendarDeleteEventTool.handler(
      { event_id: 'evt-001', calendar_id: 'cal-001', confirm: true },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBe(true);
  });
});
