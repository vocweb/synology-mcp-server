/**
 * MCP tool: drive_get_sharing_link
 * Generate or retrieve a sharing link for a Synology Drive file.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  path: z.string().describe('File path or ID'),
  permission: z
    .enum(['view', 'edit', 'download'])
    .describe('Access level for the shared link')
    .default('view'),
  password: z.string().optional().describe('Optional password protection'),
  expire_days: z
    .number()
    .int()
    .min(1)
    .max(365)
    .optional()
    .describe('Link expiry in days. Omit for no expiry.'),
});

/** drive_get_sharing_link tool definition */
export const getSharingLinkTool: ToolDefinition<typeof inputSchema> = {
  name: 'drive_get_sharing_link',
  description:
    'Generate or retrieve a sharing link for a Synology Drive file with configurable permission and optional expiry.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      return await ctx.driveClient.getSharingLink({
        path: input.path,
        permission: input.permission,
        ...(input.password !== undefined ? { password: input.password } : {}),
        ...(input.expire_days !== undefined ? { expire_days: input.expire_days } : {}),
      });
    } catch (err) {
      return toMcpError(err);
    }
  },
};
