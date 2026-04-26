/**
 * Tests for calendar_get_event tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { calendarGetEventTool } from '../../../src/tools/calendar/get-event.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('calendar_get_event', () => {
  it('returns mapped event with ISO start/end', async () => {
    const ctx = createTestContext();
    const result = (await calendarGetEventTool.handler(
      { event_id: 'evt-001', calendar_id: 'cal-001' },
      ctx,
    )) as Record<string, unknown>;
    expect(result['id']).toBe('evt-001');
    expect(result['title']).toBe('Team Meeting');
    expect(typeof result['start']).toBe('string');
    expect(result['start']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof result['end']).toBe('string');
  });

  it('returns attendees array', async () => {
    const ctx = createTestContext();
    const result = (await calendarGetEventTool.handler(
      { event_id: 'evt-001', calendar_id: 'cal-001' },
      ctx,
    )) as Record<string, unknown>;
    const attendees = result['attendees'] as Array<Record<string, unknown>>;
    expect(Array.isArray(attendees)).toBe(true);
    expect(attendees[0]).toHaveProperty('email');
    expect(attendees[0]).toHaveProperty('status');
  });

  it('returns error response for not-found event', async () => {
    const ctx = createTestContext();
    const result = (await calendarGetEventTool.handler(
      { event_id: 'not-found', calendar_id: 'cal-001' },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBe(true);
  });
});
