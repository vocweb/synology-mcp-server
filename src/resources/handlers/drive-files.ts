/**
 * Resource handler: syno://drive/files/{path}
 * Returns file metadata at the given Drive path.
 */

import type { DriveClient } from '../../clients/drive-client.js';

/**
 * Fetches file info for the Drive path encoded in the URI.
 *
 * URI format: `syno://drive/files/{path}` where `{path}` may contain slashes.
 *
 * @param uri - Full resource URI.
 * @param client - Authenticated DriveClient.
 * @returns MCP resource content object.
 */
export async function handleDriveFiles(
  uri: string,
  client: DriveClient,
): Promise<{ uri: string; mimeType: string; text: string }> {
  const path = extractPath(uri, 'syno://drive/files/');
  const data = await client.getFileInfo(path);
  return { uri, mimeType: 'application/json', text: JSON.stringify(data) };
}

function extractPath(uri: string, prefix: string): string {
  const raw = uri.slice(prefix.length);
  if (!raw) throw new Error(`Missing path in URI: ${uri}`);
  return decodeURIComponent(raw);
}
