/**
 * MCP tool: calendar_get_event
 * Fetches a single calendar event by ID.
 * Unix seconds in API response are converted to ISO 8601 in output.
 * Per spec §7.4.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';
import { mapEvent } from './event-mapper.js';

const inputSchema = z.object({
  event_id: z.string().describe('Event identifier'),
  calendar_id: z.string().describe('Owning calendar identifier'),
});

/** calendar_get_event tool definition */
export const calendarGetEventTool: ToolDefinition<typeof inputSchema> = {
  name: 'calendar_get_event',
  description: 'Get details of a specific Synology Calendar event.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const event = await ctx.calendarClient.getEvent(input.event_id, input.calendar_id);
      return mapEvent(event);
    } catch (err) {
      return toMcpError(err);
    }
  },
};
