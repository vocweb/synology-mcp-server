/**
 * MCP tool: spreadsheet_create
 * Creates a new empty Spreadsheet file in a Drive folder.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  name: z.string().describe('Spreadsheet name (without extension)'),
});

/** spreadsheet_create tool definition */
export const spreadsheetCreateTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_create',
  description:
    'Create a new empty Synology Spreadsheet (.osheet). Note: the Spreadsheet API has no notion of destination folder; use Drive tools to move the file afterwards if needed.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const result = await ctx.spreadsheetClient.create({ name: input.name });
      return { success: true, file_id: result.file_id };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
