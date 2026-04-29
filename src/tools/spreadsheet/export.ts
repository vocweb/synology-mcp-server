/**
 * MCP tool: spreadsheet_export
 * Exports a spreadsheet to xlsx or csv, returning the file as base64.
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
    format: z.enum(['xlsx', 'csv']).describe('Export format'),
    sheet_name: z
      .string()
      .optional()
      .describe('For CSV export: which sheet to export. Defaults to first sheet.'),
  })
  .refine((v) => (v.file_id ?? '') !== '' || (v.name ?? '') !== '', {
    message: 'Either file_id or name is required',
  });

/** spreadsheet_export tool definition */
export const spreadsheetExportTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_export',
  description:
    'Export a Synology Spreadsheet to xlsx or csv format. Returns the file content as base64. Provide either file_id or name.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const fileId = await resolveSpreadsheetId(input, ctx.spreadsheetIdCache);
      let sheetId: string | undefined;
      if (input.format === 'csv') {
        const info = await ctx.spreadsheetClient.getInfo(fileId);
        sheetId =
          input.sheet_name === undefined
            ? info.sheets[0]?.sheet_id
            : info.sheets.find((s) => s.name === input.sheet_name)?.sheet_id;
      }

      const result = await ctx.spreadsheetClient.exportFile({
        file_id: fileId,
        format: input.format,
        ...(sheetId !== undefined ? { sheet_id: sheetId } : {}),
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
