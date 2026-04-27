/**
 * Drive file query operations: listFiles, getFileInfo, search.
 * Each function receives a `request` callback (bound from BaseClient) so
 * this module stays free of inheritance and HTTP details.
 */

import { sanitizePath } from '../../utils/path-guard.js';
import { normalizeFile, normalizeFileInfo } from './response-mappers.js';
import type { RequestOptions } from '../base-client.js';
import type { SynoDriveFile, SynoDriveListResponse } from '../../types/synology-types.js';
import type { DriveFile, DriveFileInfo, DriveFileList } from './drive-types.js';

/** Minimal request function signature accepted by each operation. */
type RequestFn = <T>(options: RequestOptions) => Promise<T>;

/** Options for listFiles */
export interface ListFilesOpts {
  folder_path: string;
  limit: number;
  offset: number;
  sort_by: 'name' | 'size' | 'user' | 'modified' | 'created';
  sort_direction: 'ASC' | 'DESC';
  file_type: 'all' | 'file' | 'dir';
  pattern?: string | undefined;
}

/** Options for search */
export interface SearchOpts {
  query: string;
  folder_path: string;
  limit: number;
  extension?: string | undefined;
}

/** List files and folders under a Drive path (SYNO.SynologyDrive.Files list, DSM 7.3.2). */
export async function listFiles(request: RequestFn, opts: ListFilesOpts): Promise<DriveFileList> {
  // DSM 7.3.2 SYNO.SynologyDrive.Files list expects `path` (not legacy `folder_path`)
  // and returns { total, items } (not { total, offset, files }).
  const params: Record<string, string | number | boolean> = {
    api: 'SYNO.SynologyDrive.Files',
    version: 2,
    method: 'list',
    path: sanitizePath(opts.folder_path),
    offset: opts.offset,
    limit: opts.limit,
    sort_by: opts.sort_by,
    sort_direction: opts.sort_direction,
  };
  // Optional file_type filter ("file" | "dir"); omitted when "all"
  if (opts.file_type !== 'all') params['filter'] = JSON.stringify({ type: opts.file_type });
  if (opts.pattern !== undefined) params['pattern'] = opts.pattern;

  const raw = await request<SynoDriveListResponse>({ endpoint: '/webapi/entry.cgi', params });
  return { total: raw.total, offset: opts.offset, files: raw.items.map(normalizeFile) };
}

/** Get detailed metadata for a single file or folder. */
export async function getFileInfo(request: RequestFn, filePath: string): Promise<DriveFileInfo> {
  // DSM 7.3.2 returns full metadata by default; no `additional` param required.
  const raw = await request<SynoDriveFile>({
    endpoint: '/webapi/entry.cgi',
    params: {
      api: 'SYNO.SynologyDrive.Files',
      version: 2,
      method: 'get',
      path: sanitizePath(filePath),
    },
  });
  return normalizeFileInfo(raw);
}

/** Search for files by keyword. Output shape matches listFiles. */
export async function search(request: RequestFn, opts: SearchOpts): Promise<DriveFileList> {
  // DSM 7.3.2 SYNO.SynologyDrive.Files search uses `path` (not `folder_path`)
  // and returns { total, items }.
  const params: Record<string, string | number | boolean> = {
    api: 'SYNO.SynologyDrive.Files',
    version: 2,
    method: 'search',
    keyword: opts.query,
    path: sanitizePath(opts.folder_path),
    limit: opts.limit,
  };
  if (opts.extension !== undefined) params['extension'] = opts.extension;

  const raw = await request<SynoDriveListResponse>({ endpoint: '/webapi/entry.cgi', params });
  return { total: raw.total, offset: 0, files: raw.items.map(normalizeFile) };
}

export type { DriveFile, DriveFileInfo, DriveFileList };
