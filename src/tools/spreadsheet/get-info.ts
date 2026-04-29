/**
 * MCP tool: spreadsheet_get_info
 * Fetches metadata about a spreadsheet: sheet names, row/col counts.
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
  })
  .refine((v) => (v.file_id ?? '') !== '' || (v.name ?? '') !== '', {
    message: 'Either file_id or name is required',
  });

/** spreadsheet_get_info tool definition */
export const spreadsheetGetInfoTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_get_info',
  description:
    'Get metadata about a Synology Spreadsheet file: sheet names, row and column counts. Provide either file_id or name.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const fileId = await resolveSpreadsheetId(input, ctx.spreadsheetIdCache);
      return await ctx.spreadsheetClient.getInfo(fileId);
    } catch (err) {
      return toMcpError(err);
    }
  },
};
