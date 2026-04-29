/**
 * MCP tool: spreadsheet_write_cells
 * Write values to a cell range. Requires confirm=true to execute.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse } from '../types.js';
import { buildRange } from '../../utils/a1-notation.js';
import { resolveSpreadsheetId } from '../../utils/spreadsheet-id-resolver.js';

const inputSchema = z
  .object({
    file_id: z.string().optional().describe('Alphanumeric Spreadsheet ID (overrides name lookup).'),
    name: z.string().optional().describe('Spreadsheet display name (resolved via local cache).'),
    path: z.string().optional().describe('Optional Drive path to disambiguate same-name files.'),
    sheet_name: z.string().describe('Target sheet name'),
    start_cell: z.string().describe("Top-left cell in A1 notation, e.g. 'A1', 'B3'"),
    values: z
      .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
      .describe(
        "2D array of values. Outer = rows, inner = columns. e.g. [['Name','Age'],['Alice',30]]",
      ),
    confirm: z.boolean().default(false).describe('Must be true to execute the write operation'),
  })
  .refine((v) => (v.file_id ?? '') !== '' || (v.name ?? '') !== '', {
    message: 'Either file_id or name is required',
  });

/** spreadsheet_write_cells tool definition */
export const spreadsheetWriteCellsTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_write_cells',
  description:
    'Write values to a range of cells in a Synology Spreadsheet sheet. Provide either file_id or name. Set confirm=true to execute.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!input.confirm) {
      return confirmRequiredResponse(
        `write ${input.values.length} row(s) to '${input.sheet_name}' starting at ${input.start_cell}`,
      );
    }

    try {
      const fileId = await resolveSpreadsheetId(input, ctx.spreadsheetIdCache);
      await ctx.spreadsheetClient.setCells({
        file_id: fileId,
        sheet_name: input.sheet_name,
        start_cell: input.start_cell,
        values: input.values,
      });

      const numRows = input.values.length;
      const numCols = Math.max(0, ...input.values.map((r) => r.length));
      const range_written =
        numRows > 0 && numCols > 0
          ? buildRange(input.start_cell, numRows, numCols)
          : input.start_cell;

      return {
        success: true,
        cells_written: input.values.reduce((acc, row) => acc + row.length, 0),
        range_written,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
