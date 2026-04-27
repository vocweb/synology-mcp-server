/**
 * Tests for CalendarClient — SYNO.Cal.Cal and SYNO.Cal.Event operations.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../mocks/synology-handlers.js';
import { createTestCalendarClient } from '../mocks/test-client-factory.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('CalendarClient.listCalendars', () => {
  it('returns array of calendars', async () => {
    const client = createTestCalendarClient();
    const result = await client.listCalendars();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({ cal_id: 'cal-001', name: 'Personal' });
  });
});

describe('CalendarClient.listEvents', () => {
  it('returns total and events array', async () => {
    const client = createTestCalendarClient();
    const result = await client.listEvents({ start_unix: 1700000000, end_unix: 1700086400 });
    expect(result.total).toBe(1);
    expect(result.events[0]).toMatchObject({ evt_id: 'evt-001', cal_id: 'cal-001' });
  });

  it('accepts optional calendar_id param', async () => {
    const client = createTestCalendarClient();
    const result = await client.listEvents({
      calendar_id: 'cal-001',
      start_unix: 1700000000,
      end_unix: 1700086400,
    });
    expect(result.events.length).toBeGreaterThan(0);
  });
});

describe('CalendarClient.getEvent', () => {
  it('returns event by id', async () => {
    const client = createTestCalendarClient();
    const result = await client.getEvent('evt-001', 'cal-001');
    expect(result.evt_id).toBe('evt-001');
    expect(result.title).toBe('Team Meeting');
  });

  it('throws on not-found event', async () => {
    const client = createTestCalendarClient();
    await expect(client.getEvent('not-found', 'cal-001')).rejects.toThrow();
  });
});

describe('CalendarClient.createEvent', () => {
  it('returns new event id and calendar id', async () => {
    const client = createTestCalendarClient();
    const result = await client.createEvent({
      calendar_id: 'cal-001',
      title: 'New Event',
      dtstart: 1700100000,
      dtend: 1700103600,
      is_all_day: false,
    });
    expect(result.evt_id).toBe('evt-new-001');
    expect(result.cal_id).toBe('cal-001');
  });

  it('accepts optional fields', async () => {
    const client = createTestCalendarClient();
    const result = await client.createEvent({
      calendar_id: 'cal-001',
      title: 'All Day',
      dtstart: 1700000000,
      dtend: 1700086400,
      is_all_day: true,
      description: 'A day off',
      location: 'Home',
      attendees: [{ email: 'bob@example.com', name: 'Bob' }],
      recurrence: 'RRULE:FREQ=WEEKLY',
      reminder_minutes: 30,
    });
    expect(result.evt_id).toBeDefined();
  });
});

describe('CalendarClient.updateEvent', () => {
  it('returns updated event id', async () => {
    const client = createTestCalendarClient();
    const result = await client.updateEvent({
      event_id: 'evt-001',
      calendar_id: 'cal-001',
      title: 'Updated Title',
    });
    expect(result.evt_id).toBe('evt-001');
  });
});

describe('CalendarClient.deleteEvent', () => {
  it('resolves without error', async () => {
    const client = createTestCalendarClient();
    await expect(client.deleteEvent('evt-001', 'cal-001')).resolves.toBeDefined();
  });
});

describe('CalendarClient.createCalendar', () => {
  it('returns new calendar id', async () => {
    const client = createTestCalendarClient();
    const result = await client.createCalendar({ name: 'Work' });
    expect(result.cal_id).toBe('cal-new-001');
  });

  it('accepts optional color and description', async () => {
    const client = createTestCalendarClient();
    const result = await client.createCalendar({
      name: 'Work',
      color: '#FF0000',
      description: 'Work events',
    });
    expect(result.cal_id).toBeDefined();
  });
});
