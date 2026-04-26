/**
 * Tests for mailplus_move_messages tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers, setMailplusAvailable } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { mailplusMoveMessagesTool } from '../../../src/tools/mailplus/move-messages.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  setMailplusAvailable(true);
});
afterAll(() => server.close());

const VALID_INPUT = {
  message_ids: ['msg-001'],
  dest_folder: 'Archive',
  confirm: true,
};

describe('mailplus_move_messages', () => {
  it('returns CONFIRMATION_REQUIRED when confirm=false', async () => {
    const ctx = createTestContext();
    const result = (await mailplusMoveMessagesTool.handler(
      { ...VALID_INPUT, confirm: false },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBe(true);
    expect(result['code']).toBe('CONFIRMATION_REQUIRED');
  });

  it('returns success=true when confirm=true', async () => {
    const ctx = createTestContext();
    const result = (await mailplusMoveMessagesTool.handler(VALID_INPUT, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['success']).toBe(true);
  });

  it('returns MODULE_UNAVAILABLE when MailPlus not installed (after confirm check)', async () => {
    setMailplusAvailable(false);
    const ctx = createTestContext();
    const result = (await mailplusMoveMessagesTool.handler(VALID_INPUT, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['error']).toBe(true);
    expect(result['code']).toBe('MODULE_UNAVAILABLE');
  });
});
