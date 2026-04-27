/**
 * Tests for mailplus_mark_messages tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers, setMailplusAvailable } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { mailplusMarkMessagesTool } from '../../../src/tools/mailplus/mark-messages.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  setMailplusAvailable(true);
});
afterAll(() => server.close());

describe('mailplus_mark_messages', () => {
  it('returns success=true for read action', async () => {
    const ctx = createTestContext();
    const result = (await mailplusMarkMessagesTool.handler(
      { message_ids: ['msg-001'], action: 'read' },
      ctx,
    )) as Record<string, unknown>;
    expect(result['success']).toBe(true);
  });

  it('returns success=true for unread action', async () => {
    const ctx = createTestContext();
    const result = (await mailplusMarkMessagesTool.handler(
      { message_ids: ['msg-001', 'msg-002'], action: 'unread' },
      ctx,
    )) as Record<string, unknown>;
    expect(result['success']).toBe(true);
  });

  it('returns success=true for flag action', async () => {
    const ctx = createTestContext();
    const result = (await mailplusMarkMessagesTool.handler(
      { message_ids: ['msg-001'], action: 'flag' },
      ctx,
    )) as Record<string, unknown>;
    expect(result['success']).toBe(true);
  });

  it('returns MODULE_UNAVAILABLE when MailPlus not installed', async () => {
    setMailplusAvailable(false);
    const ctx = createTestContext();
    const result = (await mailplusMarkMessagesTool.handler(
      { message_ids: ['msg-001'], action: 'read' },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBe(true);
    expect(result['code']).toBe('MODULE_UNAVAILABLE');
  });
});
