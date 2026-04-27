/**
 * Tests for spreadsheet_create tool.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../../mocks/synology-handlers.js';
import { createTestContext } from '../../mocks/test-client-factory.js';
import { spreadsheetCreateTool } from '../../../src/tools/spreadsheet/create.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('spreadsheet_create', () => {
  it('returns success, file_id, and file_path', async () => {
    const ctx = createTestContext();
    const result = (await spreadsheetCreateTool.handler(
      {
        name: 'NewSheet',
        dest_folder_path: '/mydrive',
        initial_sheet_name: 'Sheet1',
      },
      ctx,
    )) as Record<string, unknown>;

    expect(result['success']).toBe(true);
    expect(result['file_id']).toBe('new-sheet-001');
    expect(typeof result['file_path']).toBe('string');
  });
});
