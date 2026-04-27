/**
 * Shared mapper: converts a raw SynoCalEvent (unix seconds) to the MCP event shape (ISO 8601).
 * Imported by list-events, get-event, create-event, update-event to avoid duplication.
 */

import { unixSecondsToIso } from '../../utils/datetime-convert.js';
import type { SynoCalEvent, SynoAttendee } from '../../clients/calendar-client.js';

const ATTENDEE_STATUS_MAP: Record<string, 'accepted' | 'declined' | 'tentative' | 'needs-action'> =
  {
    accepted: 'accepted',
    declined: 'declined',
    tentative: 'tentative',
    'needs-action': 'needs-action',
  };

function mapAttendeeStatus(
  raw: string | undefined,
): 'accepted' | 'declined' | 'tentative' | 'needs-action' {
  if (raw === undefined) return 'needs-action';
  return ATTENDEE_STATUS_MAP[raw.toLowerCase()] ?? 'needs-action';
}

function mapAttendee(a: SynoAttendee): {
  name: string;
  email: string;
  status: 'accepted' | 'declined' | 'tentative' | 'needs-action';
} {
  return {
    name: a.name,
    email: a.email,
    status: mapAttendeeStatus(a.status),
  };
}

/** MCP-shaped event output. */
export interface MappedEvent {
  id: string;
  calendar_id: string;
  calendar_name: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  all_day: boolean;
  recurrence: string | null;
  attendees: Array<{
    name: string;
    email: string;
    status: 'accepted' | 'declined' | 'tentative' | 'needs-action';
  }>;
}

/**
 * Convert a raw Synology event (unix timestamps) to the MCP output shape (ISO 8601).
 *
 * @param e - Raw Synology event from the API.
 * @returns MCP-shaped event with ISO 8601 start/end.
 */
export function mapEvent(e: SynoCalEvent): MappedEvent {
  return {
    id: e.evt_id,
    calendar_id: e.cal_id,
    calendar_name: e.cal_name,
    title: e.title,
    description: e.desc,
    location: e.location,
    start: unixSecondsToIso(e.dtstart),
    end: unixSecondsToIso(e.dtend),
    all_day: e.is_all_day,
    recurrence: e.rrule ?? null,
    attendees: (e.attendee ?? []).map(mapAttendee),
  };
}
