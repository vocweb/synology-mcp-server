/**
 * MCP tool: spreadsheet_rename_sheet
 * Renames a sheet tab in a spreadsheet.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse } from '../types.js';
import { resolveSpreadsheetId } from '../../utils/spreadsheet-id-resolver.js';

const inputSchema = z
  .object({
    file_id: z.string().optional().describe('Alphanumeric Spreadsheet ID (overrides name lookup).'),
    name: z.string().optional().describe('Spreadsheet display name (resolved via local cache).'),
    path: z.string().optional().describe('Optional Drive path to disambiguate same-name files.'),
    sheet_id: z.string().describe('Internal ID of the sheet to rename'),
    new_name: z.string().describe('New name for the sheet'),
    confirm: z.boolean().default(false),
  })
  .refine((v) => (v.file_id ?? '') !== '' || (v.name ?? '') !== '', {
    message: 'Either file_id or name is required',
  });

/** spreadsheet_rename_sheet tool definition */
export const spreadsheetRenameSheetTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_rename_sheet',
  description:
    'Rename a sheet tab in a Synology Spreadsheet. Provide either file_id or name. Set confirm=true to execute.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!input.confirm) {
      return confirmRequiredResponse(`rename sheet to '${input.new_name}'`);
    }

    try {
      const fileId = await resolveSpreadsheetId(input, ctx.spreadsheetIdCache);
      await ctx.spreadsheetClient.renameSheet({
        file_id: fileId,
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
