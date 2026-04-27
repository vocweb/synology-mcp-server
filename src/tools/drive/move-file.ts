/**
 * MCP tool: drive_move_file
 * Move or rename a Drive file/folder. Requires confirm=true to execute.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse } from '../types.js';

const inputSchema = z.object({
  path: z.string().describe('Source file/folder path or ID'),
  dest_folder_path: z.string().describe('Destination folder path'),
  new_name: z.string().optional().describe('New name after move (optional rename)'),
  conflict_action: z.enum(['version', 'autorename', 'skip']).default('autorename'),
  confirm: z
    .boolean()
    .describe('Must be true to execute. Set false to dry-run (validate only)')
    .default(false),
});

/** drive_move_file tool definition */
export const moveFileTool: ToolDefinition<typeof inputSchema> = {
  name: 'drive_move_file',
  description:
    'Move or rename a file/folder in Synology Drive. Set confirm=true to execute; omit or set false for a dry-run check.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    // Confirmation guard must be first
    if (!input.confirm) {
      return confirmRequiredResponse(
        `move '${input.path}' to '${input.dest_folder_path}'${input.new_name ? ` as '${input.new_name}'` : ''}`,
      );
    }

    try {
      return await ctx.driveClient.move({
        path: input.path,
        dest_folder_path: input.dest_folder_path,
        ...(input.new_name !== undefined ? { new_name: input.new_name } : {}),
        conflict_action: input.conflict_action,
      });
    } catch (err) {
      return toMcpError(err);
    }
  },
};
