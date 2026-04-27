/**
 * Tests for calendar_update_event tool.
 * Covers: confirm guard, partial update, happy path, error path.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { calendarUpdateEventTool } from '../../../src/tools/calendar/update-event.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const VALID_INPUT = {
  event_id: 'evt-001',
  calendar_id: 'cal-001',
  title: 'Updated Meeting',
  confirm: true,
};

describe('calendar_update_event', () => {
  it('returns CONFIRMATION_REQUIRED when confirm=false', async () => {
    const ctx = createTestContext();
    const result = (await calendarUpdateEventTool.handler(
      { ...VALID_INPUT, confirm: false },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBe(true);
    expect(result['code']).toBe('CONFIRMATION_REQUIRED');
  });

  it('updates event and returns event_id when confirm=true', async () => {
    const ctx = createTestContext();
    const result = (await calendarUpdateEventTool.handler(VALID_INPUT, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['success']).toBe(true);
    expect(result['event_id']).toBe('evt-001');
    expect(result['calendar_id']).toBe('cal-001');
  });

  it('accepts partial update (only title)', async () => {
    const ctx = createTestContext();
    const result = (await calendarUpdateEventTool.handler(
      { event_id: 'evt-001', calendar_id: 'cal-001', confirm: true },
      ctx,
    )) as Record<string, unknown>;
    expect(result['success']).toBe(true);
  });

  it('accepts ISO datetime fields', async () => {
    const ctx = createTestContext();
    const result = (await calendarUpdateEventTool.handler(
      { ...VALID_INPUT, start: '2024-06-15T10:00:00Z', end: '2024-06-15T11:00:00Z' },
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
    const result = (await calendarUpdateEventTool.handler(VALID_INPUT, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['error']).toBe(true);
  });
});
