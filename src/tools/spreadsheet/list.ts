/**
 * MCP tool: spreadsheet_list
 * Lists all .osheet files accessible to the user by delegating to DriveClient.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  folder_path: z.string().default('/mydrive').describe('Drive folder to search in'),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

/** spreadsheet_list tool definition — delegates to DriveClient.listFiles with *.osheet pattern */
export const spreadsheetListTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_list',
  description: 'List all Synology Spreadsheet (.osheet) files in a Drive folder.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const result = await ctx.driveClient.listFiles({
        folder_path: input.folder_path,
        limit: input.limit,
        offset: input.offset,
        sort_by: 'name',
        sort_direction: 'ASC',
        file_type: 'file',
        pattern: '*.osheet',
      });

      return {
        total: result.total,
        files: result.files.map((f) => ({
          file_id: f.id,
          name: f.name,
          path: f.path,
          modified: f.modified,
          owner: f.owner,
        })),
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
