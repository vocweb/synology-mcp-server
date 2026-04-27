/**
 * MCP tool: mailplus_get_message
 * Fetches full content of an email message, optionally including attachment content.
 * Unix epoch `date` field is converted to ISO 8601.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, moduleUnavailableResponse } from '../types.js';

const inputSchema = z.object({
  message_id: z.string().describe('Message ID from mailplus_list_messages'),
  include_attachments: z
    .boolean()
    .default(false)
    .describe('If true, include attachment content as base64 in response'),
});

/** mailplus_get_message tool definition */
export const mailplusGetMessageTool: ToolDefinition<typeof inputSchema> = {
  name: 'mailplus_get_message',
  description:
    'Get the full content of a MailPlus email message, with optional attachment download.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!(await ctx.mailplusClient.isAvailable())) return moduleUnavailableResponse();

    try {
      const detail = await ctx.mailplusClient.getMessage({
        message_id: input.message_id,
        include_attachments: input.include_attachments,
      });

      const recipients = [
        ...detail.to.map((r) => ({ name: r.name, email: r.address, type: 'to' as const })),
        ...(detail.cc ?? []).map((r) => ({ name: r.name, email: r.address, type: 'cc' as const })),
        ...(detail.bcc ?? []).map((r) => ({
          name: r.name,
          email: r.address,
          type: 'bcc' as const,
        })),
      ];

      return {
        id: detail.id,
        subject: detail.subject,
        sender: { name: detail.from.name, email: detail.from.address },
        recipients,
        date: new Date(detail.date * 1000).toISOString(),
        body_text: detail.body_text,
        body_html: detail.body_html,
        attachments: detail.attachments.map(
          (a: {
            id: string;
            name: string;
            mime_type: string;
            size: number;
            content_base64: string | null;
          }) => ({
            id: a.id,
            name: a.name,
            mime_type: a.mime_type,
            size: a.size,
            content_base64: a.content_base64,
          }),
        ),
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
