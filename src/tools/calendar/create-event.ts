/**
 * MCP tool: calendar_create_event
 * Creates a new calendar event. Requires confirm=true.
 * ISO 8601 start/end are converted to Unix seconds for the API call.
 * ISO without timezone offset is interpreted as NAS local time.
 * RRULE is passed through as an opaque string (not parsed).
 * Per spec §7.4.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse } from '../types.js';
import { isoToUnixSeconds } from '../../utils/datetime-convert.js';

const inputSchema = z.object({
  calendar_id: z.string().describe('Target calendar ID'),
  title: z.string().min(1),
  start: z
    .string()
    .describe(
      "Event start in ISO 8601: 'YYYY-MM-DDTHH:mm:ss' or 'YYYY-MM-DD' for all-day. ISO without offset is interpreted as NAS local time.",
    ),
  end: z
    .string()
    .describe('Event end in ISO 8601. ISO without offset is interpreted as NAS local time.'),
  all_day: z.boolean().default(false),
  description: z.string().optional(),
  location: z.string().optional(),
  attendees: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      }),
    )
    .optional(),
  recurrence: z
    .string()
    .optional()
    .describe(
      "RFC 5545 RRULE string, e.g. 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'. Passed through as-is.",
    ),
  reminder_minutes: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Reminder in minutes before event start'),
  confirm: z.boolean().default(false).describe('Must be true to create the event'),
});

/** calendar_create_event tool definition */
export const calendarCreateEventTool: ToolDefinition<typeof inputSchema> = {
  name: 'calendar_create_event',
  description:
    'Create a new Synology Calendar event. Requires confirm=true. ' +
    'ISO 8601 without timezone offset is interpreted as NAS local time.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!input.confirm) return confirmRequiredResponse('calendar_create_event');

    try {
      const result = await ctx.calendarClient.createEvent({
        calendar_id: input.calendar_id,
        title: input.title,
        dtstart: isoToUnixSeconds(input.start),
        dtend: isoToUnixSeconds(input.end),
        is_all_day: input.all_day,
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.attendees !== undefined ? { attendees: input.attendees } : {}),
        ...(input.recurrence !== undefined ? { recurrence: input.recurrence } : {}),
        ...(input.reminder_minutes !== undefined
          ? { reminder_minutes: input.reminder_minutes }
          : {}),
      });

      return {
        success: true,
        event_id: result.evt_id,
        calendar_id: result.cal_id,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
