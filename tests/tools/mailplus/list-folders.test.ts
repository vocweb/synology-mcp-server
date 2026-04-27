/**
 * Tests for mailplus_list_folders tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers, setMailplusAvailable } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { mailplusListFoldersTool } from '../../../src/tools/mailplus/list-folders.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  setMailplusAvailable(true);
});
afterAll(() => server.close());

describe('mailplus_list_folders', () => {
  it('returns folders array on success', async () => {
    const ctx = createTestContext();
    const result = (await mailplusListFoldersTool.handler({}, ctx)) as Record<string, unknown>;
    expect(result['folders']).toBeDefined();
    expect(Array.isArray(result['folders'])).toBe(true);
    const folders = result['folders'] as Array<Record<string, unknown>>;
    expect(folders[0]).toHaveProperty('id');
    expect(folders[0]).toHaveProperty('path');
  });

  it('passes account param when provided', async () => {
    const ctx = createTestContext();
    const result = (await mailplusListFoldersTool.handler(
      { account: 'user@example.com' },
      ctx,
    )) as Record<string, unknown>;
    expect(Array.isArray(result['folders'])).toBe(true);
  });

  it('returns MODULE_UNAVAILABLE when MailPlus not installed', async () => {
    setMailplusAvailable(false);
    const ctx = createTestContext();
    const result = (await mailplusListFoldersTool.handler({}, ctx)) as Record<string, unknown>;
    expect(result['error']).toBe(true);
    expect(result['code']).toBe('MODULE_UNAVAILABLE');
    expect(result['retryable']).toBe(false);
  });
});
