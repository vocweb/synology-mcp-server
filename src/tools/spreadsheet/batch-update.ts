/**
 * MCP tool: spreadsheet_batch_update
 * Performs batch operations: insert/delete rows or columns.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse } from '../types.js';

const inputSchema = z.object({
  file_id: z.string().describe('Drive file ID of the .osheet file'),
  sheet_id: z.string().describe('Internal ID of the sheet'),
  action: z
    .enum(['insert_rows', 'insert_columns', 'delete_rows', 'delete_columns'])
    .describe('Batch operation: insert or delete rows/columns'),
  index: z.number().int().min(0).describe('Starting row/column index (0-based)'),
  count: z.number().int().min(1).describe('Number of rows/columns to insert or delete'),
  confirm: z.boolean().default(false),
});

/** spreadsheet_batch_update tool definition */
export const spreadsheetBatchUpdateTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_batch_update',
  description:
    'Insert or delete rows/columns in a Synology Spreadsheet. Set confirm=true to execute.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    // Confirm guard — must be first
    const actionLabel =
      input.action === 'insert_rows'
        ? `insert ${input.count} row(s)`
        : input.action === 'insert_columns'
          ? `insert ${input.count} column(s)`
          : input.action === 'delete_rows'
            ? `delete ${input.count} row(s)`
            : `delete ${input.count} column(s)`;

    if (!input.confirm) {
      return confirmRequiredResponse(`${actionLabel} starting at index ${input.index}`);
    }

    try {
      await ctx.spreadsheetClient.batchUpdate({
        file_id: input.file_id,
        sheet_id: input.sheet_id,
        action: input.action,
        index: input.index,
        count: input.count,
      });

      return {
        success: true,
        action: input.action,
        index: input.index,
        count: input.count,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
