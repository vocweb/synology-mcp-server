/**
 * Tests for spreadsheet_append_rows tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { spreadsheetAppendRowsTool } from '../../../src/tools/spreadsheet/append-rows.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('spreadsheet_append_rows', () => {
  it('returns confirmation-required when confirm=false', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetAppendRowsTool.handler(
      {
        file_id: 'sheet-001',
        sheet_name: 'Sheet1',
        rows: [['New', 'Row']],
        confirm: false,
      },
      ctx,
    )) as Record<string, unknown>;

    expect(result['error']).toBe(true);
    expect(result['code']).toBe('CONFIRMATION_REQUIRED');
  });

  it('appends rows and returns rows_appended', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetAppendRowsTool.handler(
      {
        file_id: 'sheet-001',
        sheet_name: 'Sheet1',
        rows: [
          ['Charlie', 28],
          ['Diana', 32],
        ],
        confirm: true,
      },
      ctx,
    )) as Record<string, unknown>;

    expect(result['success']).toBe(true);
    expect(result['rows_appended']).toBe(2);
  });

  it('returns error response on API failure', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetAppendRowsTool.handler(
      {
        file_id: 'not-found',
        sheet_name: 'Sheet1',
        rows: [['x']],
        confirm: true,
      },
      ctx,
    )) as Record<string, unknown>;

    expect(result['error']).toBe(true);
  });
});
