/**
 * MCP tool: spreadsheet_delete_sheet
 * Deletes a sheet tab from a spreadsheet. Requires confirm=true.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse } from '../types.js';

const inputSchema = z.object({
  file_id: z.string().describe('Drive file ID of the .osheet file'),
  sheet_id: z.string().describe('Internal ID of the sheet to delete'),
  confirm: z.boolean().default(false),
});

/** spreadsheet_delete_sheet tool definition */
export const spreadsheetDeleteSheetTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_delete_sheet',
  description:
    'Delete a sheet tab from a Synology Spreadsheet. This action cannot be undone. Set confirm=true to execute.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    // Confirm guard — must be first (destructive operation)
    if (!input.confirm) {
      return confirmRequiredResponse(`permanently delete sheet (ID: ${input.sheet_id})`);
    }

    try {
      await ctx.spreadsheetClient.deleteSheet({
        file_id: input.file_id,
        sheet_id: input.sheet_id,
      });

      return {
        success: true,
        deleted_sheet_id: input.sheet_id,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
