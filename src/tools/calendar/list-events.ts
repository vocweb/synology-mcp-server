/**
 * MCP tool: calendar_list_events
 * Lists events within a date range, optionally filtered by calendar.
 * ISO 8601 input is converted to Unix seconds before the API call.
 * Unix seconds in API response are converted to ISO 8601 in output.
 * ISO without timezone offset is interpreted as NAS local time.
 * Per spec §7.4.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';
import { isoToUnixSeconds } from '../../utils/datetime-convert.js';
import { mapEvent } from './event-mapper.js';

const inputSchema = z.object({
  calendar_id: z
    .string()
    .optional()
    .describe('Filter by calendar ID. If omitted, returns events from all calendars.'),
  start_date: z
    .string()
    .describe(
      "Start of range in ISO 8601: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ss'. ISO without offset is interpreted as NAS local time.",
    ),
  end_date: z
    .string()
    .describe(
      "End of range in ISO 8601: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ss'. ISO without offset is interpreted as NAS local time.",
    ),
  limit: z.number().int().min(1).max(500).default(100),
});

/** calendar_list_events tool definition */
export const calendarListEventsTool: ToolDefinition<typeof inputSchema> = {
  name: 'calendar_list_events',
  description:
    'List Synology Calendar events within a date range. ' +
    'ISO 8601 dates without a timezone offset are interpreted as NAS local time.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const result = await ctx.calendarClient.listEvents({
        calendar_id: input.calendar_id,
        start_unix: isoToUnixSeconds(input.start_date),
        end_unix: isoToUnixSeconds(input.end_date),
        limit: input.limit,
      });

      return {
        total: result.total,
        events: result.events.map(mapEvent),
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
