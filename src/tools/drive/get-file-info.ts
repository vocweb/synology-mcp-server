/**
 * MCP tool: drive_get_file_info
 * Retrieves detailed metadata for a single Drive file or folder.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  path: z
    .string()
    .describe(
      "File or folder path, e.g. '/mydrive/reports/Q1.osheet', or a file ID like '552146100935505098'",
    ),
});

/** drive_get_file_info tool definition */
export const getFileInfoTool: ToolDefinition<typeof inputSchema> = {
  name: 'drive_get_file_info',
  description:
    'Get detailed metadata (size, owner, ACL, labels) for a specific Drive file or folder.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      return await ctx.driveClient.getFileInfo(input.path);
    } catch (err) {
      return toMcpError(err);
    }
  },
};
