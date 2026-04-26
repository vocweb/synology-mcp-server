/**
 * MCP tool: calendar_delete_event
 * Deletes a calendar event permanently. Requires confirm=true.
 * Per spec §7.4.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse } from '../types.js';

const inputSchema = z.object({
  event_id: z.string(),
  calendar_id: z.string(),
  confirm: z.boolean().default(false).describe('Must be true to delete the event'),
});

/** calendar_delete_event tool definition */
export const calendarDeleteEventTool: ToolDefinition<typeof inputSchema> = {
  name: 'calendar_delete_event',
  description: 'Delete a Synology Calendar event permanently. Requires confirm=true.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!input.confirm) return confirmRequiredResponse('calendar_delete_event');

    try {
      await ctx.calendarClient.deleteEvent(input.event_id, input.calendar_id);
      return { success: true };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
