/**
 * Tests for mailplus_list_messages tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers, setMailplusAvailable } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { mailplusListMessagesTool } from '../../../src/tools/mailplus/list-messages.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  setMailplusAvailable(true);
});
afterAll(() => server.close());

describe('mailplus_list_messages', () => {
  it('returns total and messages array with ISO dates', async () => {
    const ctx = createTestContext();
    const result = (await mailplusListMessagesTool.handler(
      {
        folder_path: 'INBOX',
        limit: 20,
        offset: 0,
        sort_by: 'date',
        sort_direction: 'DESC',
        unread_only: false,
      },
      ctx,
    )) as Record<string, unknown>;

    expect(typeof result['total']).toBe('number');
    const messages = result['messages'] as Array<Record<string, unknown>>;
    expect(Array.isArray(messages)).toBe(true);
    // date should be ISO 8601
    expect(typeof messages[0]?.['date']).toBe('string');
    expect(messages[0]?.['date']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('maps sender/recipient address fields correctly', async () => {
    const ctx = createTestContext();
    const result = (await mailplusListMessagesTool.handler(
      {
        folder_path: 'INBOX',
        limit: 20,
        offset: 0,
        sort_by: 'date',
        sort_direction: 'DESC',
        unread_only: false,
      },
      ctx,
    )) as Record<string, unknown>;
    const messages = result['messages'] as Array<Record<string, unknown>>;
    const sender = messages[0]?.['sender'] as Record<string, unknown>;
    expect(sender).toHaveProperty('email');
    expect(sender).toHaveProperty('name');
  });

  it('returns MODULE_UNAVAILABLE when MailPlus not installed', async () => {
    setMailplusAvailable(false);
    const ctx = createTestContext();
    const result = (await mailplusListMessagesTool.handler(
      {
        folder_path: 'INBOX',
        limit: 20,
        offset: 0,
        sort_by: 'date',
        sort_direction: 'DESC',
        unread_only: false,
      },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBe(true);
    expect(result['code']).toBe('MODULE_UNAVAILABLE');
  });
});
