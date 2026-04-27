/**
 * Resource handler: syno://spreadsheet/{file_id}/{sheet_name}
 * Returns sheet cell data (first 100 rows) for a given sheet.
 */

import type { SpreadsheetClient } from '../../clients/spreadsheet-client.js';

/**
 * Reads cell data for a specific sheet within a spreadsheet.
 *
 * URI format: `syno://spreadsheet/{file_id}/{sheet_name}`
 *
 * @param uri - Full resource URI.
 * @param client - Authenticated SpreadsheetClient.
 * @returns MCP resource content object.
 */
export async function handleSpreadsheetSheet(
  uri: string,
  client: SpreadsheetClient,
): Promise<{ uri: string; mimeType: string; text: string }> {
  const { fileId, sheetName } = extractParts(uri);
  // Limit to first 100 rows via range notation A1:ZZ100
  const data = await client.getCells({
    file_id: fileId,
    sheet_name: sheetName,
    range: 'A1:ZZ100',
  });
  return { uri, mimeType: 'application/json', text: JSON.stringify(data) };
}

function extractParts(uri: string): { fileId: string; sheetName: string } {
  // syno://spreadsheet/{file_id}/{sheet_name}
  const match = /^syno:\/\/spreadsheet\/([^/]+)\/([^/]+)$/.exec(uri);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid spreadsheet sheet URI: ${uri}`);
  }
  return {
    fileId: decodeURIComponent(match[1]),
    sheetName: decodeURIComponent(match[2]),
  };
}
