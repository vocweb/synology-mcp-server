/**
 * Resource handler: syno://spreadsheet/{file_id}/info
 * Returns sheet list and metadata for a spreadsheet file.
 */

import type { SpreadsheetClient } from '../../clients/spreadsheet-client.js';

/**
 * Fetches spreadsheet info (sheet names, dimensions) for a given file_id.
 *
 * URI format: `syno://spreadsheet/{file_id}/info`
 *
 * @param uri - Full resource URI.
 * @param client - Authenticated SpreadsheetClient.
 * @returns MCP resource content object.
 */
export async function handleSpreadsheetInfo(
  uri: string,
  client: SpreadsheetClient,
): Promise<{ uri: string; mimeType: string; text: string }> {
  const fileId = extractFileId(uri);
  const data = await client.getInfo(fileId);
  return { uri, mimeType: 'application/json', text: JSON.stringify(data) };
}

function extractFileId(uri: string): string {
  // syno://spreadsheet/{file_id}/info
  const match = /^syno:\/\/spreadsheet\/([^/]+)\/info$/.exec(uri);
  if (!match || !match[1]) throw new Error(`Invalid spreadsheet info URI: ${uri}`);
  return decodeURIComponent(match[1]);
}
