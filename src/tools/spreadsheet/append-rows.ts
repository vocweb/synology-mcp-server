/**
 * MCP tool: spreadsheet_append_rows
 * Appends rows after the last non-empty row. Requires confirm=true.
 * Composition: reads minimal range to find total_rows, then calls setCells.
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
      // Read minimal range (column A only) to determine the last occupied row
      const existing = await ctx.spreadsheetClient.getCells({
        file_id: input.file_id,
        sheet_name: input.sheet_name,
      });

      const total_existing_rows = existing.values.length;
      // Append starts one row below last occupied row (1-indexed for A1 notation)
      const start_row = total_existing_rows + 1;
      const start_cell = `A${start_row}`;

      await ctx.spreadsheetClient.setCells({
        file_id: input.file_id,
        sheet_name: input.sheet_name,
        start_cell,
        values: input.rows,
      });

      const new_last_row = total_existing_rows + input.rows.length;

      return {
        success: true,
        rows_appended: input.rows.length,
        new_last_row,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
