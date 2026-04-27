/**
 * MCP tool: drive_add_label
 * Apply a label to a Drive file or folder by label name.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  path: z.string().describe('File/folder path or ID'),
  label_name: z.string().describe('Label name to apply'),
});

/** drive_add_label tool definition */
export const addLabelTool: ToolDefinition<typeof inputSchema> = {
  name: 'drive_add_label',
  description: 'Add a label to a file or folder in Synology Drive.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      return await ctx.driveClient.addLabel(input);
    } catch (err) {
      return toMcpError(err);
    }
  },
};
