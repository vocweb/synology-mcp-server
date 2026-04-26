/**
 * MCP tool: drive_create_folder
 * Create a new folder in Synology Drive.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  folder_path: z.string().describe("Parent folder path, e.g. '/mydrive/projects'"),
  name: z.string().describe('New folder name'),
  force_parent: z
    .boolean()
    .describe("Create parent directories if they don't exist")
    .default(false),
});

/** drive_create_folder tool definition */
export const createFolderTool: ToolDefinition<typeof inputSchema> = {
  name: 'drive_create_folder',
  description: 'Create a new folder in Synology Drive, optionally creating parent directories.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      return await ctx.driveClient.createFolder(input);
    } catch (err) {
      return toMcpError(err);
    }
  },
};
