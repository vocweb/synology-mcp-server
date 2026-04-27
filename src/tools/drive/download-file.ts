/**
 * MCP tool: drive_download_file
 * Download a Drive file and return it as base64-encoded content.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  path: z.string().describe('File path or file ID in Drive'),
});

/** drive_download_file tool definition */
export const downloadFileTool: ToolDefinition<typeof inputSchema> = {
  name: 'drive_download_file',
  description:
    'Download a file from Synology Drive and return it as base64-encoded content with metadata.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const result = await ctx.driveClient.download(input.path);
      return {
        file_name: result.filename,
        mime_type: result.mimeType,
        size: result.buffer.length,
        content_base64: result.buffer.toString('base64'),
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
