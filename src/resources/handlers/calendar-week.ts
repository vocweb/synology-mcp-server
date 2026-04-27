/**
 * Resource handler: syno://calendar/{cal_id}/week
 * Returns this week's events (Monday 00:00 → Sunday 23:59:59) for a calendar.
 */

import type { CalendarClient } from '../../clients/calendar-client.js';

/**
 * Fetches events for the current ISO week for a calendar.
 *
 * URI format: `syno://calendar/{cal_id}/week`
 *
 * @param uri - Full resource URI.
 * @param client - Authenticated CalendarClient.
 * @returns MCP resource content object.
 */
export async function handleCalendarWeek(
  uri: string,
  client: CalendarClient,
): Promise<{ uri: string; mimeType: string; text: string }> {
  const calId = extractCalId(uri);
  const { startUnix, endUnix } = currentWeekRange();

  const data = await client.listEvents({
    calendar_id: calId,
    start_unix: startUnix,
    end_unix: endUnix,
  });
  return { uri, mimeType: 'application/json', text: JSON.stringify(data) };
}

/** Returns Unix seconds for Monday 00:00:00 and Sunday 23:59:59 of the current week. */
function currentWeekRange(): { startUnix: number; endUnix: number } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Shift so week starts Monday (ISO 8601)
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday);
  const sunday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
    23,
    59,
    59,
  );

  return {
    startUnix: Math.floor(monday.getTime() / 1000),
    endUnix: Math.floor(sunday.getTime() / 1000),
  };
}

function extractCalId(uri: string): string {
  const match = /^syno:\/\/calendar\/([^/]+)\/week$/.exec(uri);
  if (!match || !match[1]) throw new Error(`Invalid calendar week URI: ${uri}`);
  return decodeURIComponent(match[1]);
}
