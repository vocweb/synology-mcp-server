/**
 * Tests for calendar_create_calendar tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { calendarCreateCalendarTool } from '../../../src/tools/calendar/create-calendar.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('calendar_create_calendar', () => {
  it('creates calendar and returns calendar_id', async () => {
    const ctx = createTestContext();
    const result = (await calendarCreateCalendarTool.handler({ name: 'Work' }, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['success']).toBe(true);
    expect(result['calendar_id']).toBe('cal-new-001');
  });

  it('accepts optional color and description', async () => {
    const ctx = createTestContext();
    const result = (await calendarCreateCalendarTool.handler(
      { name: 'Work', color: '#FF0000', description: 'Work calendar' },
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
    const result = (await calendarCreateCalendarTool.handler({ name: 'Work' }, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['error']).toBe(true);
  });
});
