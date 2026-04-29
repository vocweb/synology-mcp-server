/**
 * MCP tool: spreadsheet_get_styles
 * Retrieves cell styles (font, colors, alignment, etc.) for a range.
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
    sheet_name: z.string().describe('Target sheet name'),
    range: z.string().describe('Cell range in A1 notation, e.g. "A1:C10"'),
  })
  .refine((v) => (v.file_id ?? '') !== '' || (v.name ?? '') !== '', {
    message: 'Either file_id or name is required',
  });

/** spreadsheet_get_styles tool definition */
export const spreadsheetGetStylesTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_get_styles',
  description:
    'Get cell styling information (fonts, colors, alignment, number formats) for a range in a Synology Spreadsheet. Provide either file_id or name.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const fileId = await resolveSpreadsheetId(input, ctx.spreadsheetIdCache);
      const result = await ctx.spreadsheetClient.getStyles({
        file_id: fileId,
        sheet_name: input.sheet_name,
        range: input.range,
      });

      return {
        sheet: input.sheet_name,
        range: result.range,
        styles: result.styles,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
