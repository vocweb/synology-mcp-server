/**
 * MCP tool: calendar_list_calendars
 * Lists all calendars accessible to the authenticated user.
 * Per spec §7.4.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';
import type { SynoCalendar } from '../../clients/calendar-client.js';

const inputSchema = z.object({});

/** Map a raw Synology calendar to the MCP output shape. */
function mapCalendar(c: SynoCalendar): {
  id: string;
  name: string;
  color: string;
  is_owner: boolean;
  is_shared: boolean;
  description: string;
} {
  return {
    id: c.cal_id,
    name: c.name,
    color: c.color,
    is_owner: c.is_owner,
    is_shared: c.is_shared,
    description: c.description,
  };
}

/** calendar_list_calendars tool definition */
export const calendarListCalendarsTool: ToolDefinition<typeof inputSchema> = {
  name: 'calendar_list_calendars',
  description: 'List all Synology Calendar calendars accessible to the authenticated user.',
  inputSchema,
  async handler(_input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const calendars = await ctx.calendarClient.listCalendars();
      return { calendars: calendars.map(mapCalendar) };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
