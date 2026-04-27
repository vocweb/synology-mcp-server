/**
 * Resource handler: syno://calendar/{cal_id}/today
 * Returns today's events for a given calendar.
 */

import type { CalendarClient } from '../../clients/calendar-client.js';

/**
 * Fetches events for today (midnight → 23:59:59 local) for a calendar.
 *
 * URI format: `syno://calendar/{cal_id}/today`
 *
 * @param uri - Full resource URI.
 * @param client - Authenticated CalendarClient.
 * @returns MCP resource content object.
 */
export async function handleCalendarToday(
  uri: string,
  client: CalendarClient,
): Promise<{ uri: string; mimeType: string; text: string }> {
  const calId = extractCalId(uri, 'today');
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const data = await client.listEvents({
    calendar_id: calId,
    start_unix: Math.floor(startOfDay.getTime() / 1000),
    end_unix: Math.floor(endOfDay.getTime() / 1000),
  });
  return { uri, mimeType: 'application/json', text: JSON.stringify(data) };
}

function extractCalId(uri: string, suffix: string): string {
  const pattern = new RegExp(`^syno:\\/\\/calendar\\/([^/]+)\\/${suffix}$`);
  const match = pattern.exec(uri);
  if (!match || !match[1]) throw new Error(`Invalid calendar URI: ${uri}`);
  return decodeURIComponent(match[1]);
}
