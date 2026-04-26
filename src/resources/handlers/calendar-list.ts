/**
 * Resource handler: syno://calendar/list
 * Returns all calendars accessible to the authenticated user.
 */

import type { CalendarClient } from '../../clients/calendar-client.js';

/**
 * Lists all calendars.
 *
 * URI format: `syno://calendar/list`
 *
 * @param uri - Full resource URI.
 * @param client - Authenticated CalendarClient.
 * @returns MCP resource content object.
 */
export async function handleCalendarList(
  uri: string,
  client: CalendarClient,
): Promise<{ uri: string; mimeType: string; text: string }> {
  const data = await client.listCalendars();
  return { uri, mimeType: 'application/json', text: JSON.stringify(data) };
}
