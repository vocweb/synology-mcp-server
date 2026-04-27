/**
 * Tests for mailplus_send_message tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers, setMailplusAvailable } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { mailplusSendMessageTool } from '../../../src/tools/mailplus/send-message.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  setMailplusAvailable(true);
});
afterAll(() => server.close());

const VALID_INPUT = {
  to: ['recipient@example.com'],
  subject: 'Test Subject',
  body: 'Test body',
  body_format: 'text' as const,
  confirm: true,
};

describe('mailplus_send_message', () => {
  it('returns CONFIRMATION_REQUIRED when confirm=false', async () => {
    const ctx = createTestContext();
    const result = (await mailplusSendMessageTool.handler(
      { ...VALID_INPUT, confirm: false },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBe(true);
    expect(result['code']).toBe('CONFIRMATION_REQUIRED');
  });

  it('sends message and returns ISO sent_at when confirm=true', async () => {
    const ctx = createTestContext();
    const result = (await mailplusSendMessageTool.handler(VALID_INPUT, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['success']).toBe(true);
    expect(result['message_id']).toBe('sent-msg-001');
    expect(typeof result['sent_at']).toBe('string');
    expect(result['sent_at']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sends with attachments', async () => {
    const ctx = createTestContext();
    const result = (await mailplusSendMessageTool.handler(
      {
        ...VALID_INPUT,
        attachments: [
          {
            name: 'file.txt',
            content_base64: Buffer.from('hello').toString('base64'),
            mime_type: 'text/plain',
          },
        ],
      },
      ctx,
    )) as Record<string, unknown>;
    expect(result['success']).toBe(true);
  });

  it('returns MODULE_UNAVAILABLE when MailPlus not installed (after confirm check)', async () => {
    setMailplusAvailable(false);
    const ctx = createTestContext();
    const result = (await mailplusSendMessageTool.handler(VALID_INPUT, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['error']).toBe(true);
    expect(result['code']).toBe('MODULE_UNAVAILABLE');
  });
});
