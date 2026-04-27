/**
 * Tests for spreadsheet_add_sheet tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { spreadsheetAddSheetTool } from '../../../src/tools/spreadsheet/add-sheet.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('spreadsheet_add_sheet', () => {
  it('returns success and sheet_id', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetAddSheetTool.handler(
      { file_id: 'sheet-001', sheet_name: 'NewTab' },
      ctx,
    )) as Record<string, unknown>;

    expect(result['success']).toBe(true);
    expect(result['sheet_id']).toBe('new-sheet-tab-001');
  });

  it('passes optional position without error', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetAddSheetTool.handler(
      { file_id: 'sheet-001', sheet_name: 'NewTab', position: 0 },
      ctx,
    )) as Record<string, unknown>;

    expect(result['success']).toBe(true);
  });

  it('returns error response for not-found file', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetAddSheetTool.handler(
      { file_id: 'not-found', sheet_name: 'Tab' },
      ctx,
    )) as Record<string, unknown>;

    expect(result['error']).toBe(true);
  });
});
