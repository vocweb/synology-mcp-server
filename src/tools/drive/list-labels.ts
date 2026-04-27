/**
 * MCP tool: drive_list_labels
 * List all label definitions available in Synology Drive.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({});

/** drive_list_labels tool definition */
export const listLabelsTool: ToolDefinition<typeof inputSchema> = {
  name: 'drive_list_labels',
  description: 'List all labels defined in Synology Drive (id, name, color).',
  inputSchema,
  async handler(_input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const labels = await ctx.driveClient.listLabels();
      return { labels };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
