/**
 * Tests for mailplus_get_message tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers, setMailplusAvailable } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { mailplusGetMessageTool } from '../../../src/tools/mailplus/get-message.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  setMailplusAvailable(true);
});
afterAll(() => server.close());

describe('mailplus_get_message', () => {
  it('returns full message with ISO date and null attachment content by default', async () => {
    const ctx = createTestContext();
    const result = (await mailplusGetMessageTool.handler(
      { message_id: 'msg-001', include_attachments: false },
      ctx,
    )) as Record<string, unknown>;

    expect(result['id']).toBe('msg-001');
    expect(result['subject']).toBe('Hello World');
    expect(typeof result['date']).toBe('string');
    expect(result['date']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const attachments = result['attachments'] as Array<Record<string, unknown>>;
    expect(attachments[0]?.['content_base64']).toBeNull();
  });

  it('includes base64 attachment content when include_attachments=true', async () => {
    const ctx = createTestContext();
    const result = (await mailplusGetMessageTool.handler(
      { message_id: 'msg-001', include_attachments: true },
      ctx,
    )) as Record<string, unknown>;

    const attachments = result['attachments'] as Array<Record<string, unknown>>;
    expect(typeof attachments[0]?.['content_base64']).toBe('string');
    expect(attachments[0]?.['content_base64']).not.toBeNull();
  });

  it('maps recipients with type field', async () => {
    const ctx = createTestContext();
    const result = (await mailplusGetMessageTool.handler(
      { message_id: 'msg-001', include_attachments: false },
      ctx,
    )) as Record<string, unknown>;
    const recipients = result['recipients'] as Array<Record<string, unknown>>;
    expect(recipients.some((r) => r['type'] === 'to')).toBe(true);
  });

  it('returns error response for not-found message', async () => {
    const ctx = createTestContext();
    const result = (await mailplusGetMessageTool.handler(
      { message_id: 'not-found', include_attachments: false },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBe(true);
  });

  it('returns MODULE_UNAVAILABLE when MailPlus not installed', async () => {
    setMailplusAvailable(false);
    const ctx = createTestContext();
    const result = (await mailplusGetMessageTool.handler(
      { message_id: 'msg-001', include_attachments: false },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBe(true);
    expect(result['code']).toBe('MODULE_UNAVAILABLE');
  });
});
