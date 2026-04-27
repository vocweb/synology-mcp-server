/**
 * MCP tool: mailplus_move_messages
 * Move messages to a destination folder. Requires confirm=true.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse, moduleUnavailableResponse } from '../types.js';

const inputSchema = z.object({
  message_ids: z.array(z.string()).min(1),
  dest_folder: z.string().describe('Destination folder path'),
  account: z
    .string()
    .optional()
    .describe("Email account address. If omitted, uses the authenticated user's primary account."),
  confirm: z.boolean().default(false),
});

/** mailplus_move_messages tool definition */
export const mailplusMoveMessagesTool: ToolDefinition<typeof inputSchema> = {
  name: 'mailplus_move_messages',
  description: 'Move MailPlus messages to another folder. Requires confirm=true to execute.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!input.confirm) return confirmRequiredResponse('mailplus_move_messages');
    if (!(await ctx.mailplusClient.isAvailable())) return moduleUnavailableResponse();

    try {
      await ctx.mailplusClient.move({
        message_ids: input.message_ids,
        dest_folder: input.dest_folder,
        account: input.account,
      });
      return { success: true };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
