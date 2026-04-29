/**
 * MCP tool: spreadsheet_append_rows
 * Appends rows after the last non-empty row using REST API native append endpoint.
 * Requires confirm=true.
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
    sheet_name: z.string().describe('Target sheet name'),
    rows: z
      .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
      .describe('Array of rows to append. Each row is an array of cell values.'),
    confirm: z.boolean().default(false),
  })
  .refine((v) => (v.file_id ?? '') !== '' || (v.name ?? '') !== '', {
    message: 'Either file_id or name is required',
  });

/** spreadsheet_append_rows tool definition */
export const spreadsheetAppendRowsTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_append_rows',
  description:
    'Append rows to the end of existing data in a Synology Spreadsheet sheet. Provide either file_id or name. Set confirm=true to execute.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!input.confirm) {
      return confirmRequiredResponse(`append ${input.rows.length} row(s) to '${input.sheet_name}'`);
    }

    try {
      const fileId = await resolveSpreadsheetId(input, ctx.spreadsheetIdCache);
      const result = await ctx.spreadsheetClient.appendRows({
        file_id: fileId,
        sheet_name: input.sheet_name,
        start_cell: 'A1',
        values: input.rows,
      });

      return {
        success: true,
        rows_appended: result.updatedRows,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
