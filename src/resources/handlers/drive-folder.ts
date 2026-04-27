/**
 * Resource handler: syno://drive/folder/{path}
 * Returns folder listing at the given Drive path.
 */

import type { DriveClient } from '../../clients/drive-client.js';

/**
 * Lists files inside the Drive folder encoded in the URI.
 *
 * URI format: `syno://drive/folder/{path}` where `{path}` may contain slashes.
 *
 * @param uri - Full resource URI.
 * @param client - Authenticated DriveClient.
 * @returns MCP resource content object.
 */
export async function handleDriveFolder(
  uri: string,
  client: DriveClient,
): Promise<{ uri: string; mimeType: string; text: string }> {
  const path = extractPath(uri, 'syno://drive/folder/');
  const data = await client.listFiles({
    folder_path: path,
    limit: 100,
    offset: 0,
    sort_by: 'name',
    sort_direction: 'ASC',
    file_type: 'all',
  });
  return { uri, mimeType: 'application/json', text: JSON.stringify(data) };
}

function extractPath(uri: string, prefix: string): string {
  const raw = uri.slice(prefix.length);
  if (!raw) throw new Error(`Missing path in URI: ${uri}`);
  return decodeURIComponent(raw);
}
