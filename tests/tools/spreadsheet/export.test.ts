/**
 * Tests for spreadsheet_export tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { spreadsheetExportTool } from '../../../src/tools/spreadsheet/export.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('spreadsheet_export', () => {
  it('returns base64-encoded content and metadata', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetExportTool.handler(
      { file_id: 'sheet-001', format: 'xlsx' },
      ctx,
    )) as Record<string, unknown>;

    expect(result['format']).toBe('xlsx');
    expect(result['file_name']).toBe('Budget.xlsx');
    expect(typeof result['content_base64']).toBe('string');
    expect((result['content_base64'] as string).length).toBeGreaterThan(0);
    expect(typeof result['size']).toBe('number');
    expect(result['size']).toBeGreaterThan(0);
  });

  it('returns error response for not-found file', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetExportTool.handler(
      { file_id: 'not-found', format: 'xlsx' },
      ctx,
    )) as Record<string, unknown>;

    expect(result['error']).toBe(true);
  });

  it('accepts optional sheet_name for csv export', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetExportTool.handler(
      { file_id: 'sheet-001', format: 'csv', sheet_name: 'Sheet1' },
      ctx,
    )) as Record<string, unknown>;

    // MSW returns xlsx mime; format field reflects requested format
    expect(result['format']).toBe('csv');
  });
});
