/**
 * MCP tool: mailplus_list_folders
 * Lists all mail folders (IMAP-like tree) for the authenticated user.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, moduleUnavailableResponse } from '../types.js';

const inputSchema = z.object({
  account: z
    .string()
    .optional()
    .describe("Email account address. If omitted, uses the authenticated user's primary account."),
});

/** mailplus_list_folders tool definition */
export const mailplusListFoldersTool: ToolDefinition<typeof inputSchema> = {
  name: 'mailplus_list_folders',
  description: 'List all mail folders (IMAP-like folder tree) for the MailPlus account.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!(await ctx.mailplusClient.isAvailable())) return moduleUnavailableResponse();

    try {
      const folders = await ctx.mailplusClient.listFolders(input.account);
      return { folders };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
