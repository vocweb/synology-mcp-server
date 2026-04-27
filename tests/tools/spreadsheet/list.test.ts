/**
 * Tests for spreadsheet_list tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { spreadsheetListTool } from '../../../src/tools/spreadsheet/list.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('spreadsheet_list', () => {
  it('returns total and mapped files array', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetListTool.handler(
      { folder_path: '/mydrive', limit: 50, offset: 0 },
      ctx,
    )) as { total: number; files: unknown[] };

    expect(result.total).toBe(2);
    expect(Array.isArray(result.files)).toBe(true);
    // MSW returns FILE_FIXTURE + FOLDER_FIXTURE; both mapped
    const first = result.files[0] as Record<string, unknown>;
    expect(first['file_id']).toBe('file-001');
    expect(first['name']).toBeDefined();
    expect(first['path']).toBeDefined();
  });
});
