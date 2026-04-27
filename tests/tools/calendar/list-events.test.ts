/**
 * Tests for calendar_list_events tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { calendarListEventsTool } from '../../../src/tools/calendar/list-events.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const BASE_INPUT = {
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  limit: 100,
};

describe('calendar_list_events', () => {
  it('returns total and events with ISO 8601 start/end', async () => {
    const ctx = createTestContext();
    const result = (await calendarListEventsTool.handler(BASE_INPUT, ctx)) as Record<
      string,
      unknown
    >;
    expect(typeof result['total']).toBe('number');
    const events = result['events'] as Array<Record<string, unknown>>;
    expect(Array.isArray(events)).toBe(true);
    expect(typeof events[0]?.['start']).toBe('string');
    expect(events[0]?.['start']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof events[0]?.['end']).toBe('string');
  });

  it('maps all event fields correctly', async () => {
    const ctx = createTestContext();
    const result = (await calendarListEventsTool.handler(BASE_INPUT, ctx)) as Record<
      string,
      unknown
    >;
    const events = result['events'] as Array<Record<string, unknown>>;
    expect(events[0]).toMatchObject({
      id: 'evt-001',
      calendar_id: 'cal-001',
      title: 'Team Meeting',
      all_day: false,
    });
  });

  it('accepts optional calendar_id filter', async () => {
    const ctx = createTestContext();
    const result = (await calendarListEventsTool.handler(
      { ...BASE_INPUT, calendar_id: 'cal-001' },
      ctx,
    )) as Record<string, unknown>;
    expect(Array.isArray(result['events'])).toBe(true);
  });

  it('accepts full ISO datetime range', async () => {
    const ctx = createTestContext();
    const result = (await calendarListEventsTool.handler(
      { start_date: '2024-01-01T00:00:00Z', end_date: '2024-01-31T23:59:59Z', limit: 100 },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBeUndefined();
  });

  it('returns error response on API failure', async () => {
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.get('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({ success: false, error: { code: 100 } }),
      ),
    );
    const ctx = createTestContext();
    const result = (await calendarListEventsTool.handler(BASE_INPUT, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['error']).toBe(true);
  });
});
