/**
 * Drive binary transfer operations: upload (multipart) and download (binary stream).
 * These bypass BaseClient.request<T>() because the wire format is not JSON.
 */

import FormData from 'form-data';
import type { Agent } from 'undici';
import { sanitizePath } from '../../utils/path-guard.js';
import { NetworkError } from '../../errors.js';
import { mapSynologyError } from '../../utils/synology-error-map.js';
import type { SynoDriveUploadResponse } from './raw-response-types.js';
import type { DriveUploadResult, DriveDownloadResult } from './drive-types.js';

/** Dependencies injected by DriveClient for binary HTTP calls. */
export interface TransferDeps {
  baseUrl: string;
  /** undici Agent for self-signed cert bypass; undefined when not needed */
  dispatcher: Agent | undefined;
  /** Returns the current valid session ID */
  getToken: () => Promise<string>;
}

/** Options for upload */
export interface UploadOpts {
  dest_folder_path: string;
  file_name: string;
  content_base64: string;
  mime_type: string;
  conflict_action: 'version' | 'autorename' | 'skip';
}

/**
 * Upload a file via multipart/form-data.
 * Decodes base64 content to Buffer and attaches as the `file` field.
 * api/method are placed in the query string per spec §7.1.
 */
export async function upload(deps: TransferDeps, opts: UploadOpts): Promise<DriveUploadResult> {
  const sid = await deps.getToken();
  const buffer = Buffer.from(opts.content_base64, 'base64');

  const form = new FormData();
  form.append('dest_folder_path', sanitizePath(opts.dest_folder_path));
  form.append('conflict_action', opts.conflict_action);
  form.append('_sid', sid);
  form.append('file', buffer, { filename: opts.file_name, contentType: opts.mime_type });

  const qs = new URLSearchParams({ api: 'SYNO.Drive.Files', version: '2', method: 'upload' });
  const url = `${deps.baseUrl}/webapi/entry.cgi?${qs.toString()}`;
  const init: Record<string, unknown> = {
    method: 'POST',
    headers: form.getHeaders(),
    body: form.getBuffer(),
    signal: AbortSignal.timeout(60_000),
  };
  if (deps.dispatcher) init['dispatcher'] = deps.dispatcher;

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    throw new NetworkError(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new NetworkError(`Upload returned non-JSON response (HTTP ${response.status})`);
  }

  const envelope = json as {
    success: boolean;
    data?: SynoDriveUploadResponse;
    error?: { code: number };
  };
  if (!envelope.success) {
    throw mapSynologyError(envelope.error?.code ?? 100, 'SYNO.Drive.Files');
  }
  if (!envelope.data) {
    throw new NetworkError('Upload succeeded but response contained no data field');
  }
  return {
    success: true,
    file_id: envelope.data.file_id,
    file_path: envelope.data.path,
    file_name: envelope.data.name,
  };
}

/**
 * Download a file and return its raw buffer plus metadata.
 * Uses direct fetch because the response is a binary stream, not JSON.
 */
export async function download(deps: TransferDeps, filePath: string): Promise<DriveDownloadResult> {
  const sid = await deps.getToken();
  const qs = new URLSearchParams({
    api: 'SYNO.Drive.Files',
    version: '2',
    method: 'download',
    path: sanitizePath(filePath),
  });
  const url = `${deps.baseUrl}/webapi/entry.cgi?${qs.toString()}`;
  const init: Record<string, unknown> = {
    method: 'GET',
    headers: { Cookie: `id=${sid}` },
    signal: AbortSignal.timeout(60_000),
  };
  if (deps.dispatcher) init['dispatcher'] = deps.dispatcher;

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    throw new NetworkError(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    throw new NetworkError(`Download HTTP error: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  // JSON content-type signals an error envelope (e.g. file not found)
  if (contentType.includes('application/json')) {
    const errJson = (await response.json()) as { success: boolean; error?: { code: number } };
    if (!errJson.success) {
      throw mapSynologyError(errJson.error?.code ?? 100, 'SYNO.Drive.Files');
    }
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const disposition = response.headers.get('content-disposition') ?? '';
  const fnMatch = /filename[^;=\n]*=(?:(['"])(?<q>[^'"]*)\1|(?<bare>[^;\n]*))/i.exec(disposition);
  const filename =
    fnMatch?.groups?.['q'] ?? fnMatch?.groups?.['bare'] ?? filePath.split('/').pop() ?? 'download';

  return { buffer, filename, mimeType: contentType };
}
