/**
 * MCP tool: spreadsheet_get_info
 * Fetches metadata about a spreadsheet: sheet names, row/col counts.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  file_id: z.string().describe('Drive file ID of the .osheet file'),
});

/** spreadsheet_get_info tool definition */
export const spreadsheetGetInfoTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_get_info',
  description:
    'Get metadata about a Synology Spreadsheet file: sheet names, row and column counts.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      return await ctx.spreadsheetClient.getInfo(input.file_id);
    } catch (err) {
      return toMcpError(err);
    }
  },
};
