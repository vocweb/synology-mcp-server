/**
 * Tests for calendar_create_event tool.
 * Covers: confirm guard, happy path, RRULE passthrough, attendees, error path.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { calendarCreateEventTool } from '../../../src/tools/calendar/create-event.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const VALID_INPUT = {
  calendar_id: 'cal-001',
  title: 'New Meeting',
  start: '2024-06-15T10:00:00Z',
  end: '2024-06-15T11:00:00Z',
  all_day: false,
  confirm: true,
};

describe('calendar_create_event', () => {
  it('returns CONFIRMATION_REQUIRED when confirm=false', async () => {
    const ctx = createTestContext();
    const result = (await calendarCreateEventTool.handler(
      { ...VALID_INPUT, confirm: false },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBe(true);
    expect(result['code']).toBe('CONFIRMATION_REQUIRED');
  });

  it('creates event and returns event_id when confirm=true', async () => {
    const ctx = createTestContext();
    const result = (await calendarCreateEventTool.handler(VALID_INPUT, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['success']).toBe(true);
    expect(result['event_id']).toBe('evt-new-001');
    expect(result['calendar_id']).toBe('cal-001');
  });

  it('accepts attendees with validated email', async () => {
    const ctx = createTestContext();
    const result = (await calendarCreateEventTool.handler(
      { ...VALID_INPUT, attendees: [{ email: 'alice@example.com', name: 'Alice' }] },
      ctx,
    )) as Record<string, unknown>;
    expect(result['success']).toBe(true);
  });

  it('passes RRULE through as opaque string', async () => {
    const ctx = createTestContext();
    const result = (await calendarCreateEventTool.handler(
      { ...VALID_INPUT, recurrence: 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR' },
      ctx,
    )) as Record<string, unknown>;
    expect(result['success']).toBe(true);
  });

  it('creates all-day event', async () => {
    const ctx = createTestContext();
    const result = (await calendarCreateEventTool.handler(
      { ...VALID_INPUT, start: '2024-06-15', end: '2024-06-15', all_day: true },
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
    const result = (await calendarCreateEventTool.handler(VALID_INPUT, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['error']).toBe(true);
  });
});
