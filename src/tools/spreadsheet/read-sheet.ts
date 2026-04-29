/**
 * MCP tool: spreadsheet_read_sheet
 * Reads cell data from a sheet, returning headers, rows, and totals.
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
    sheet_name: z.string().optional().describe('Sheet name. If omitted, reads the first sheet.'),
    range: z
      .string()
      .optional()
      .describe("A1-notation range, e.g. 'A1:D20'. If omitted, reads all non-empty cells."),
    include_formulas: z
      .boolean()
      .default(false)
      .describe('If true, return formula strings instead of computed values where applicable.'),
  })
  .refine((v) => (v.file_id ?? '') !== '' || (v.name ?? '') !== '', {
    message: 'Either file_id or name is required',
  });

/** spreadsheet_read_sheet tool definition */
export const spreadsheetReadSheetTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_read_sheet',
  description:
    'Read cell data from a Synology Spreadsheet sheet. Returns headers (first row), data rows, and totals. Provide either file_id or name.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const fileId = await resolveSpreadsheetId(input, ctx.spreadsheetIdCache);
      const data = await ctx.spreadsheetClient.getCells({
        file_id: fileId,
        ...(input.sheet_name !== undefined ? { sheet_name: input.sheet_name } : {}),
        ...(input.range !== undefined ? { range: input.range } : {}),
        include_formulas: input.include_formulas,
      });

      const allRows = data.values;
      const firstRow = allRows[0] ?? [];
      const headers = firstRow.map((v) => (v === null ? '' : String(v)));
      const rows = allRows.slice(1);
      const total_rows = rows.length;
      const total_cols = headers.length;

      return {
        file_id: fileId,
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
