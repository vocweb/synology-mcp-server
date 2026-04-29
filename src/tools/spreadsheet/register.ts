/**
 * MCP tool: spreadsheet_register
 * Manually maps a spreadsheet name (and optional Drive path) to its alphanumeric
 * Spreadsheet ID, so other tools can address the file by name.
 *
 * The Spreadsheet ID is the random string in the URL `/oo/r/{spreadsheetId}`
 * shown when opening a `.osheet` file in Synology Office.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError } from '../types.js';

const inputSchema = z.object({
  name: z.string().min(1).describe('Spreadsheet display name used to look up the file later.'),
  spreadsheet_id: z
    .string()
    .min(1)
    .describe('Alphanumeric Spreadsheet ID, e.g. extracted from /oo/r/{id}.'),
  path: z
    .string()
    .optional()
    .describe('Optional Drive path (e.g. /mydrive/Reports/Sales.osheet) to disambiguate same-name files.'),
});

export const spreadsheetRegisterTool: ToolDefinition<typeof inputSchema> = {
  name: 'spreadsheet_register',
  description:
    'Register a Synology Spreadsheet so it can be addressed by name in other tools. Provide the alphanumeric ID from the file URL /oo/r/{id}.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    try {
      const entry = await ctx.spreadsheetIdCache.register(
        input.name,
        input.path ?? null,
        input.spreadsheet_id,
        'manual',
      );
      return { success: true, entry };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
