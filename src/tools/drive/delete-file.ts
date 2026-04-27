/**
 * MCP tool: drive_delete_file
 * Delete a Drive file or folder. Requires confirm=true to execute.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse } from '../types.js';

const inputSchema = z.object({
  path: z.string().describe('File or folder path or ID to delete'),
  permanent: z
    .boolean()
    .describe('If true, permanently delete. If false, move to Synology Drive trash.')
    .default(false),
  confirm: z.boolean().describe('REQUIRED: must be true to execute deletion').default(false),
});

/** drive_delete_file tool definition */
export const deleteFileTool: ToolDefinition<typeof inputSchema> = {
  name: 'drive_delete_file',
  description:
    'Delete a file or folder in Synology Drive (moves to trash by default). Set confirm=true to execute.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    // Confirmation guard must be first
    if (!input.confirm) {
      return confirmRequiredResponse(
        `delete '${input.path}'${input.permanent ? ' permanently' : ' (to trash)'}`,
      );
    }

    try {
      return await ctx.driveClient.delete({ path: input.path, permanent: input.permanent });
    } catch (err) {
      return toMcpError(err);
    }
  },
};
