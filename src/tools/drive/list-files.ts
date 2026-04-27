/**
 * MCP tool: drive_list_files
 * Lists files and folders in a Synology Drive path.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  folder_path: z
    .string()
    .describe(
      "Absolute path in Drive. Use '/mydrive' for private folder, '/team-folders/NAME' for shared folders.",
    )
    .default('/mydrive'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .describe('Maximum number of items to return')
    .default(100),
  offset: z.number().int().min(0).describe('Pagination offset').default(0),
  sort_by: z
    .enum(['name', 'size', 'user', 'modified', 'created'])
    .describe('Sort field')
    .default('name'),
  sort_direction: z.enum(['ASC', 'DESC']).default('ASC'),
  file_type: z.enum(['all', 'file', 'dir']).describe('Filter by type').default('all'),
  pattern: z.string().optional().describe("Glob pattern filter, e.g. '*.osheet' or '*report*'"),
});

/** drive_list_files tool definition */
export const listFilesTool: ToolDefinition<typeof inputSchema> = {
  name: 'drive_list_files',
  description:
    'List files and folders in a Synology Drive path. Supports pagination, sorting, and glob filtering.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      return await ctx.driveClient.listFiles({
        folder_path: input.folder_path,
        limit: input.limit,
        offset: input.offset,
        sort_by: input.sort_by,
        sort_direction: input.sort_direction,
        file_type: input.file_type,
        ...(input.pattern !== undefined ? { pattern: input.pattern } : {}),
      });
    } catch (err) {
      return toMcpError(err);
    }
  },
};
