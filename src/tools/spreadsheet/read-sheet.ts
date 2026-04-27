/**
 * MCP tool: spreadsheet_read_sheet
 * Reads cell data from a sheet, returning headers, rows, and totals.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  file_id: z.string().describe('Drive file ID of the .osheet file'),
  sheet_name: z.string().optional().describe('Sheet name. If omitted, reads the first sheet.'),
  range: z
    .string()
    .optional()
    .describe("A1-notation range, e.g. 'A1:D20'. If omitted, reads all non-empty cells."),
  include_formulas: z
    .boolean()
    .default(false)
    .describe('If true, return formula strings instead of computed values where applicable.'),
});

/** spreadsheet_read_sheet tool definition */
export const spreadsheetReadSheetTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_read_sheet',
  description:
    'Read cell data from a Synology Spreadsheet sheet. Returns headers (first row), data rows, and totals.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const data = await ctx.spreadsheetClient.getCells({
        file_id: input.file_id,
        ...(input.sheet_name !== undefined ? { sheet_name: input.sheet_name } : {}),
        ...(input.range !== undefined ? { range: input.range } : {}),
        include_formulas: input.include_formulas,
      });

      const allRows = data.values;
      const firstRow = allRows[0] ?? [];
      // headers = first row coerced to strings; rows = remaining rows
      const headers = firstRow.map((v) => (v === null ? '' : String(v)));
      const rows = allRows.slice(1);
      const total_rows = rows.length;
      const total_cols = headers.length;

      return {
        file_id: input.file_id,
        sheet_name: data.sheet_name,
        range: data.range,
        headers,
        rows,
        total_rows,
        total_cols,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
