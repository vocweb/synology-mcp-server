/**
 * MCP tool: calendar_create_calendar
 * Creates a new calendar on the Synology NAS.
 * Per spec §7.4.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional().describe("Hex color code, e.g. '#4A90E2'"),
  description: z.string().optional(),
});

/** calendar_create_calendar tool definition */
export const calendarCreateCalendarTool: ToolDefinition<typeof inputSchema> = {
  name: 'calendar_create_calendar',
  description: 'Create a new Synology Calendar.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const result = await ctx.calendarClient.createCalendar({
        name: input.name,
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      });

      return {
        success: true,
        calendar_id: result.cal_id,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
