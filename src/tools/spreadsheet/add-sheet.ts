/**
 * MCP tool: spreadsheet_add_sheet
 * Adds a new sheet tab to an existing spreadsheet.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  file_id: z.string().describe('Spreadsheet ID of the .osheet file'),
  sheet_name: z.string().describe('Name for the new sheet'),
});

/** spreadsheet_add_sheet tool definition */
export const spreadsheetAddSheetTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_add_sheet',
  description: 'Add a new sheet tab to an existing Synology Spreadsheet file.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const result = await ctx.spreadsheetClient.addSheet({
        file_id: input.file_id,
        sheet_name: input.sheet_name,
      });

      return {
        success: result.success,
        sheet_id: result.sheet_id,
        index: result.index,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
