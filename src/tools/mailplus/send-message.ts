/**
 * MCP tool: mailplus_send_message
 * Sends an email via MailPlus Compose API. Requires confirm=true.
 * Attachments decoded from base64 to Buffer inside the client layer.
 */

import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../types.js';
import { toMcpError, confirmRequiredResponse, moduleUnavailableResponse } from '../types.js';

const inputSchema = z.object({
  to: z.array(z.string().email()).min(1).describe('Recipient email addresses'),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1),
  body: z.string().min(1).describe('Email body. Plain text. Use \\n for line breaks.'),
  body_format: z.enum(['text', 'html']).default('text'),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        content_base64: z.string(),
        mime_type: z.string(),
      }),
    )
    .optional(),
  account: z
    .string()
    .optional()
    .describe('Sending account email address. Defaults to primary account.'),
  confirm: z.boolean().default(false).describe('Must be true to send the email'),
});

/** mailplus_send_message tool definition */
export const mailplusSendMessageTool: ToolDefinition<typeof inputSchema> = {
  name: 'mailplus_send_message',
  description: 'Send an email via Synology MailPlus. Requires confirm=true to execute.',
  inputSchema,
  async handler(input: z.infer<typeof inputSchema>, ctx: ToolContext) {
    if (!input.confirm) return confirmRequiredResponse('mailplus_send_message');
    if (!(await ctx.mailplusClient.isAvailable())) return moduleUnavailableResponse();

    try {
      const result = await ctx.mailplusClient.send({
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        body: input.body,
        body_format: input.body_format,
        attachments: input.attachments,
        account: input.account,
      });

      return {
        success: true,
        message_id: result.message_id,
        sent_at: new Date(result.sent_at * 1000).toISOString(),
      };
    } catch (err) {
      return toMcpError(err);
    }
  },
};
