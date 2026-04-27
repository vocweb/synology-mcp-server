/**
 * MCP tool: spreadsheet_get_styles
 * Retrieves cell styles (font, colors, alignment, etc.) for a range.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  file_id: z.string().describe('Drive file ID of the .osheet file'),
  sheet_name: z.string().describe('Target sheet name'),
  range: z.string().describe('Cell range in A1 notation, e.g. "A1:C10"'),
});

/** spreadsheet_get_styles tool definition */
export const spreadsheetGetStylesTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_get_styles',
  description:
    'Get cell styling information (fonts, colors, alignment, number formats) for a range in a Synology Spreadsheet.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const result = await ctx.spreadsheetClient.getStyles({
        file_id: input.file_id,
        sheet_name: input.sheet_name,
        range: input.range,
      });

      return {
        sheet: result.sheet,
        range: result.range,
        styles: result.styles,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
