/**
 * MCP tool: spreadsheet_export
 * Exports a spreadsheet to xlsx or csv, returning the file as base64.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  file_id: z.string().describe('Drive file ID of the .osheet file'),
  format: z.enum(['xlsx', 'csv']).describe('Export format'),
  sheet_name: z
    .string()
    .optional()
    .describe('For CSV export: which sheet to export. Defaults to first sheet.'),
});

/** spreadsheet_export tool definition */
export const spreadsheetExportTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_export',
  description:
    'Export a Synology Spreadsheet to xlsx or csv format. Returns the file content as base64.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const result = await ctx.spreadsheetClient.exportFile({
        file_id: input.file_id,
        format: input.format,
        ...(input.sheet_name !== undefined ? { sheet_name: input.sheet_name } : {}),
      });

      return {
        format: input.format,
        file_name: result.file_name,
        content_base64: result.buffer.toString('base64'),
        size: result.buffer.length,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
