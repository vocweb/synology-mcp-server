/**
 * Tests for calendar_list_calendars tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { calendarListCalendarsTool } from '../../../src/tools/calendar/list-calendars.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('calendar_list_calendars', () => {
  it('returns calendars array with mapped fields', async () => {
    const ctx = createTestContext();
    const result = (await calendarListCalendarsTool.handler({}, ctx)) as Record<string, unknown>;
    const calendars = result['calendars'] as Array<Record<string, unknown>>;
    expect(Array.isArray(calendars)).toBe(true);
    expect(calendars[0]).toMatchObject({
      id: 'cal-001',
      name: 'Personal',
      color: '#4A90E2',
      is_owner: true,
      is_shared: false,
    });
  });

  it('returns error response on API failure', async () => {
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.get('http://nas.local:5000/webapi/entry.cgi', () =>
        HttpResponse.json({ success: false, error: { code: 100 } }),
      ),
    );
    const ctx = createTestContext();
    const result = (await calendarListCalendarsTool.handler({}, ctx)) as Record<string, unknown>;
    expect(result['error']).toBe(true);
  });
});
