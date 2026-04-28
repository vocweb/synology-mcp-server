/**
 * Unit tests for SpreadsheetClient.
 * Uses MSW to intercept HTTP calls to the Synology API.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../mocks/synology-handlers.js';
import { createTestSpreadsheetClient } from '../mocks/test-client-factory.js';

const server = setupServer(...allHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SpreadsheetClient.getInfo', () => {
  it('returns spreadsheet metadata', async () => {
    const client = createTestSpreadsheetClient();
    const info = await client.getInfo('sheet-001');
    expect(info.file_id).toBe('sheet-001');
    expect(info.sheets).toHaveLength(2);
    expect(info.sheets[0]?.name).toBe('Sheet1');
  });

  it('throws on not-found file_id', async () => {
    const client = createTestSpreadsheetClient();
    await expect(client.getInfo('not-found')).rejects.toThrow();
  });
});

describe('SpreadsheetClient.getCells', () => {
  it('returns cell data', async () => {
    const client = createTestSpreadsheetClient();
    const data = await client.getCells({ file_id: 'sheet-001' });
    expect(data.sheet_name).toBe('Sheet1');
    expect(data.values).toHaveLength(3);
  });

  it('accepts optional sheet_name and range', async () => {
    const client = createTestSpreadsheetClient();
    const data = await client.getCells({
      file_id: 'sheet-001',
      sheet_name: 'Sheet1',
      range: 'A1:D3',
      include_formulas: false,
    });
    expect(data.range).toBe('Sheet1!A1:D3');
  });

  it('throws on not-found file_id', async () => {
    const client = createTestSpreadsheetClient();
    await expect(client.getCells({ file_id: 'not-found' })).rejects.toThrow();
  });
});

describe('SpreadsheetClient.setCells', () => {
  it('returns success=true', async () => {
    const client = createTestSpreadsheetClient();
    const result = await client.setCells({
      file_id: 'sheet-001',
      sheet_name: 'Sheet1',
      start_cell: 'A1',
      values: [['Hello', 'World']],
    });
    expect(result.success).toBe(true);
  });

  it('throws on not-found file_id', async () => {
    const client = createTestSpreadsheetClient();
    await expect(
      client.setCells({
        file_id: 'not-found',
        sheet_name: 'Sheet1',
        start_cell: 'A1',
        values: [['x']],
      }),
    ).rejects.toThrow();
  });
});

describe('SpreadsheetClient.create', () => {
  it('returns new file_id', async () => {
    const client = createTestSpreadsheetClient();
    const result = await client.create({ name: 'NewSheet' });
    expect(result.file_id).toBe('new-sheet-001');
  });
});

describe('SpreadsheetClient.addSheet', () => {
  it('returns success and sheet_id', async () => {
    const client = createTestSpreadsheetClient();
    const result = await client.addSheet({
      file_id: 'sheet-001',
      sheet_name: 'NewTab',
    });
    expect(result.success).toBe(true);
    expect(result.sheet_id).toBe('new-sheet-tab-001');
  });

  it('throws on not-found file_id', async () => {
    const client = createTestSpreadsheetClient();
    await expect(client.addSheet({ file_id: 'not-found', sheet_name: 'Tab' })).rejects.toThrow();
  });
});

describe('SpreadsheetClient.exportFile', () => {
  it('returns binary buffer with metadata', async () => {
    const client = createTestSpreadsheetClient();
    const result = await client.exportFile({ file_id: 'sheet-001', format: 'xlsx' });
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.file_name).toBe('Budget.xlsx');
  });
});
