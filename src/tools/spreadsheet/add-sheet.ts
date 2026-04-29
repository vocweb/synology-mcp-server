/**
 * MCP tool: spreadsheet_add_sheet
 * Adds a new sheet tab to an existing spreadsheet.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';
import { resolveSpreadsheetId } from '../../utils/spreadsheet-id-resolver.js';

const inputSchema = z
  .object({
    file_id: z.string().optional().describe('Alphanumeric Spreadsheet ID (overrides name lookup).'),
    name: z.string().optional().describe('Spreadsheet display name (resolved via local cache).'),
    path: z.string().optional().describe('Optional Drive path to disambiguate same-name files.'),
    sheet_name: z.string().describe('Name for the new sheet'),
  })
  .refine((v) => (v.file_id ?? '') !== '' || (v.name ?? '') !== '', {
    message: 'Either file_id or name is required',
  });

/** spreadsheet_add_sheet tool definition */
export const spreadsheetAddSheetTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_add_sheet',
  description:
    'Add a new sheet tab to an existing Synology Spreadsheet file. Provide either file_id or name.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const fileId = await resolveSpreadsheetId(input, ctx.spreadsheetIdCache);
      const result = await ctx.spreadsheetClient.addSheet({
        file_id: fileId,
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
