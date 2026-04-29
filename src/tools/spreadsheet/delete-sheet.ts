/**
 * MCP tool: spreadsheet_delete_sheet
 * Deletes a sheet tab from a spreadsheet. Requires confirm=true.
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
    sheet_id: z.string().describe('Internal ID of the sheet to delete'),
    confirm: z.boolean().default(false),
  })
  .refine((v) => (v.file_id ?? '') !== '' || (v.name ?? '') !== '', {
    message: 'Either file_id or name is required',
  });

/** spreadsheet_delete_sheet tool definition */
export const spreadsheetDeleteSheetTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_delete_sheet',
  description:
    'Delete a sheet tab from a Synology Spreadsheet. This action cannot be undone. Provide either file_id or name. Set confirm=true to execute.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!input.confirm) {
      return confirmRequiredResponse(`permanently delete sheet (ID: ${input.sheet_id})`);
    }

    try {
      const fileId = await resolveSpreadsheetId(input, ctx.spreadsheetIdCache);
      await ctx.spreadsheetClient.deleteSheet({
        file_id: fileId,
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
