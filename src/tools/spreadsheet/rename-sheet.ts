/**
 * MCP tool: spreadsheet_rename_sheet
 * Renames a sheet tab in a spreadsheet.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse } from '../types.js';

const inputSchema = z.object({
  file_id: z.string().describe('Drive file ID of the .osheet file'),
  sheet_id: z.string().describe('Internal ID of the sheet to rename'),
  new_name: z.string().describe('New name for the sheet'),
  confirm: z.boolean().default(false),
});

/** spreadsheet_rename_sheet tool definition */
export const spreadsheetRenameSheetTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_rename_sheet',
  description:
    'Rename a sheet tab in a Synology Spreadsheet. Set confirm=true to execute.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    // Confirm guard — must be first
    if (!input.confirm) {
      return confirmRequiredResponse(`rename sheet to '${input.new_name}'`);
    }

    try {
      await ctx.spreadsheetClient.renameSheet({
        file_id: input.file_id,
        sheet_id: input.sheet_id,
        new_name: input.new_name,
      });

      return {
        success: true,
        new_name: input.new_name,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
