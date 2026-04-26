/**
 * MCP tool: spreadsheet_create
 * Creates a new empty Spreadsheet file in a Drive folder.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  name: z.string().describe('Spreadsheet name (without extension)'),
  dest_folder_path: z.string().default('/mydrive').describe('Drive folder to create the file in'),
  initial_sheet_name: z.string().default('Sheet1').describe('Name of the first sheet'),
});

/** spreadsheet_create tool definition */
export const spreadsheetCreateTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_create',
  description: 'Create a new empty Synology Spreadsheet (.osheet) file in a Drive folder.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const result = await ctx.spreadsheetClient.create({
        name: input.name,
        dest_folder_path: input.dest_folder_path,
        initial_sheet_name: input.initial_sheet_name,
      });

      return {
        success: true,
        file_id: result.file_id,
        file_path: result.file_path,
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
