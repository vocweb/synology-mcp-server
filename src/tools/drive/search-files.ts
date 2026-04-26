/**
 * MCP tool: drive_search_files
 * Search for files across Drive by keyword, with optional extension filter.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  query: z.string().min(1).describe('Search keyword'),
  folder_path: z
    .string()
    .describe('Scope the search to this path. Default: entire Drive')
    .default('/mydrive'),
  extension: z.string().optional().describe("Filter by extension, e.g. 'osheet', 'odoc', 'pdf'"),
  limit: z.number().int().min(1).max(200).default(50),
});

/** drive_search_files tool definition */
export const searchFilesTool: ToolDefinition<typeof inputSchema> = {
  name: 'drive_search_files',
  description:
    'Search for files across Synology Drive by name or keyword, with optional extension filter.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      return await ctx.driveClient.search({
        query: input.query,
        folder_path: input.folder_path,
        limit: input.limit,
        ...(input.extension !== undefined ? { extension: input.extension } : {}),
      });
    } catch (err) {
      return toMcpError(err);
    }
  },
};
