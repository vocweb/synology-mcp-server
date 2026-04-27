/**
 * MCP tool: calendar_update_event
 * Updates an existing calendar event. Requires confirm=true.
 * Only supplied fields are sent to the API (partial update).
 * ISO 8601 without timezone offset is interpreted as NAS local time.
 * Per spec §7.4.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse } from '../types.js';
import { isoToUnixSeconds } from '../../utils/datetime-convert.js';

const inputSchema = z.object({
  event_id: z.string(),
  calendar_id: z.string(),
  title: z.string().optional(),
  start: z
    .string()
    .optional()
    .describe('New start in ISO 8601. ISO without offset is interpreted as NAS local time.'),
  end: z
    .string()
    .optional()
    .describe('New end in ISO 8601. ISO without offset is interpreted as NAS local time.'),
  description: z.string().optional(),
  location: z.string().optional(),
  confirm: z.boolean().default(false).describe('Must be true to update the event'),
});

/** calendar_update_event tool definition */
export const calendarUpdateEventTool: ToolDefinition<typeof inputSchema> = {
  name: 'calendar_update_event',
  description:
    'Update an existing Synology Calendar event. Requires confirm=true. ' +
    'Only provided fields are changed. ISO 8601 without timezone offset is interpreted as NAS local time.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!input.confirm) return confirmRequiredResponse('calendar_update_event');

    try {
      const result = await ctx.calendarClient.updateEvent({
        event_id: input.event_id,
        calendar_id: input.calendar_id,
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.start !== undefined ? { dtstart: isoToUnixSeconds(input.start) } : {}),
        ...(input.end !== undefined ? { dtend: isoToUnixSeconds(input.end) } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
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
