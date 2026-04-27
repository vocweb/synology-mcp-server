/**
 * MCP tool: mailplus_list_messages
 * Lists email messages in a folder with pagination, sort, and search support.
 * Unix epoch `date` fields from the API are converted to ISO 8601 in the mapper.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, moduleUnavailableResponse } from '../types.js';
import type { SynoMailMessage } from '../../types/synology-types.js';

const inputSchema = z.object({
  folder_path: z
    .string()
    .default('INBOX')
    .describe("Folder path, e.g. 'INBOX', 'INBOX/Projects', 'Sent'"),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sort_by: z.enum(['date', 'subject', 'sender', 'size']).default('date'),
  sort_direction: z.enum(['ASC', 'DESC']).default('DESC'),
  unread_only: z.boolean().default(false).describe('If true, only return unread messages'),
  search: z.string().optional().describe('Keyword search in subject/sender/body'),
  account: z
    .string()
    .optional()
    .describe("Email account address. If omitted, uses the authenticated user's primary account."),
});

/** Convert a SynoMailMessage (unix dates, address fields) to the MCP output shape. */
function mapMessage(m: SynoMailMessage): {
  id: string;
  subject: string;
  sender: { name: string; email: string };
  recipients: Array<{ name: string; email: string }>;
  date: string;
  size: number;
  unread: boolean;
  has_attachment: boolean;
  preview: string;
} {
  return {
    id: m.id,
    subject: m.subject,
    sender: { name: m.from.name, email: m.from.address },
    recipients: m.to.map((r) => ({ name: r.name, email: r.address })),
    date: new Date(m.date * 1000).toISOString(),
    size: m.size,
    unread: !m.flags.includes('\\Seen'),
    has_attachment: m.flags.includes('\\HasAttachment') || m.flags.includes('HasAttachment'),
    preview: m.preview ?? '',
  };
}

/** mailplus_list_messages tool definition */
export const mailplusListMessagesTool: ToolDefinition<typeof inputSchema> = {
  name: 'mailplus_list_messages',
  description:
    'List email messages in a MailPlus folder with pagination, sort, and keyword search.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!(await ctx.mailplusClient.isAvailable())) return moduleUnavailableResponse();

    try {
      const result = await ctx.mailplusClient.listMessages({
        folder_path: input.folder_path,
        limit: input.limit,
        offset: input.offset,
        sort_by: input.sort_by,
        sort_direction: input.sort_direction,
        unread_only: input.unread_only,
        search: input.search,
        account: input.account,
      });

      return {
        total: result.total,
        messages: result.messages.map(mapMessage),
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
