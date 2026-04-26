/**
 * MCP tool: drive_upload_file
 * Upload a base64-encoded file to Synology Drive via multipart/form-data.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  dest_folder_path: z.string().describe("Destination folder in Drive, e.g. '/mydrive/uploads'"),
  file_name: z.string().describe("File name including extension, e.g. 'report.pdf'"),
  content_base64: z.string().describe('Base64-encoded file content'),
  mime_type: z
    .string()
    .describe("MIME type, e.g. 'application/pdf', 'text/csv'")
    .default('application/octet-stream'),
  conflict_action: z
    .enum(['version', 'autorename', 'skip'])
    .describe(
      "What to do if file already exists. 'version' overwrites with version history, 'autorename' renames new file, 'skip' aborts",
    )
    .default('version'),
});

/** drive_upload_file tool definition */
export const uploadFileTool: ToolDefinition<typeof inputSchema> = {
  name: 'drive_upload_file',
  description:
    'Upload a file to Synology Drive from a base64-encoded payload. Max recommended size: 50 MB.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      return await ctx.driveClient.upload(input);
    } catch (err) {
      return toMcpError(err);
    }
  },
};
