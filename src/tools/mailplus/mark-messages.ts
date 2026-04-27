/**
 * MCP tool: mailplus_mark_messages
 * Mark messages as read, unread, flagged, or unflagged.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, moduleUnavailableResponse } from '../types.js';

const inputSchema = z.object({
  message_ids: z.array(z.string()).min(1),
  action: z.enum(['read', 'unread', 'flag', 'unflag']),
  account: z
    .string()
    .optional()
    .describe("Email account address. If omitted, uses the authenticated user's primary account."),
});

/** mailplus_mark_messages tool definition */
export const mailplusMarkMessagesTool: ToolDefinition<typeof inputSchema> = {
  name: 'mailplus_mark_messages',
  description: 'Mark MailPlus messages as read, unread, flagged, or unflagged.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!(await ctx.mailplusClient.isAvailable())) return moduleUnavailableResponse();

    try {
      await ctx.mailplusClient.mark({
        message_ids: input.message_ids,
        action: input.action,
        account: input.account,
      });
      return { success: true };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
