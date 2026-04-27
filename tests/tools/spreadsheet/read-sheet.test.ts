/**
 * Tests for spreadsheet_read_sheet tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { spreadsheetReadSheetTool } from '../../../src/tools/spreadsheet/read-sheet.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('spreadsheet_read_sheet', () => {
  it('returns headers, rows, and totals', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetReadSheetTool.handler(
      { file_id: 'sheet-001', include_formulas: false },
      ctx,
    )) as Record<string, unknown>;

    expect(result['headers']).toEqual(['Name', 'Age', 'City', 'Score']);
    expect(Array.isArray(result['rows'])).toBe(true);
    expect(result['total_rows']).toBe(2);
    expect(result['total_cols']).toBe(4);
    expect(result['file_id']).toBe('sheet-001');
  });

  it('returns error response for not-found file', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetReadSheetTool.handler(
      { file_id: 'not-found', include_formulas: false },
      ctx,
    )) as Record<string, unknown>;
    expect(result['error']).toBe(true);
  });
});
