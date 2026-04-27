/**
 * Tests for spreadsheet_write_cells tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { spreadsheetWriteCellsTool } from '../../../src/tools/spreadsheet/write-cells.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('spreadsheet_write_cells', () => {
  it('returns confirmation-required when confirm=false', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetWriteCellsTool.handler(
      {
        file_id: 'sheet-001',
        sheet_name: 'Sheet1',
        start_cell: 'A1',
        values: [['x']],
        confirm: false,
      },
      ctx,
    )) as Record<string, unknown>;

    expect(result['error']).toBe(true);
    expect(result['code']).toBe('CONFIRMATION_REQUIRED');
  });

  it('writes cells when confirm=true and returns range', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetWriteCellsTool.handler(
      {
        file_id: 'sheet-001',
        sheet_name: 'Sheet1',
        start_cell: 'A1',
        values: [
          ['Name', 'Age'],
          ['Alice', 30],
        ],
        confirm: true,
      },
      ctx,
    )) as Record<string, unknown>;

    expect(result['success']).toBe(true);
    expect(result['cells_written']).toBe(4);
    expect(result['range_written']).toBe('A1:B2');
  });

  it('returns error response on API failure', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetWriteCellsTool.handler(
      {
        file_id: 'not-found',
        sheet_name: 'Sheet1',
        start_cell: 'A1',
        values: [['x']],
        confirm: true,
      },
      ctx,
    )) as Record<string, unknown>;

    expect(result['error']).toBe(true);
  });
});
