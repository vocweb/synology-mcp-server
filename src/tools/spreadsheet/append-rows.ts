/**
 * MCP tool: spreadsheet_append_rows
 * Appends rows after the last non-empty row using REST API native append endpoint.
 * Requires confirm=true.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse } from '../types.js';

const inputSchema = z.object({
  file_id: z.string().describe('Drive file ID of the .osheet file'),
  sheet_name: z.string().describe('Target sheet name'),
  rows: z
    .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
    .describe('Array of rows to append. Each row is an array of cell values.'),
  confirm: z.boolean().default(false),
});

/** spreadsheet_append_rows tool definition */
export const spreadsheetAppendRowsTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_append_rows',
  description:
    'Append rows to the end of existing data in a Synology Spreadsheet sheet. Set confirm=true to execute.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    // Confirm guard — must be first
    if (!input.confirm) {
      return confirmRequiredResponse(`append ${input.rows.length} row(s) to '${input.sheet_name}'`);
    }

    try {
      // Use native REST API append endpoint (efficient, automatic row detection)
      const result = await ctx.spreadsheetClient.appendRows({
        file_id: input.file_id,
        sheet_name: input.sheet_name,
        start_cell: 'A1', // API automatically appends after last data row
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
