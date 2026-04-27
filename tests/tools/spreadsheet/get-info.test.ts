/**
 * Tests for spreadsheet_get_info tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { spreadsheetGetInfoTool } from '../../../src/tools/spreadsheet/get-info.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('spreadsheet_get_info', () => {
  it('returns sheet metadata', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetGetInfoTool.handler({ file_id: 'sheet-001' }, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['file_id']).toBe('sheet-001');
    expect(Array.isArray(result['sheets'])).toBe(true);
  });

  it('returns error response for not-found file', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetGetInfoTool.handler({ file_id: 'not-found' }, ctx)) as Record<
      string,
      unknown
    >;
    expect(result['error']).toBe(true);
    expect(result['code']).toBeDefined();
  });
});
