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

/** List files and folders under a Drive path. */
export async function listFiles(request: RequestFn, opts: ListFilesOpts): Promise<DriveFileList> {
  const params: Record<string, string | number | boolean> = {
    api: 'SYNO.Drive.Files',
    version: 2,
    method: 'list',
    folder_path: sanitizePath(opts.folder_path),
    limit: opts.limit,
    offset: opts.offset,
    sort_by: opts.sort_by,
    sort_direction: opts.sort_direction,
    file_type: opts.file_type,
    additional: JSON.stringify(['real_path', 'size', 'owner', 'time', 'perm']),
  };
  if (opts.pattern !== undefined) params['pattern'] = opts.pattern;

  const raw = await request<SynoDriveListResponse>({ endpoint: '/webapi/entry.cgi', params });
  return { total: raw.total, offset: raw.offset, files: raw.files.map(normalizeFile) };
}

/** Get detailed metadata for a single file or folder. */
export async function getFileInfo(request: RequestFn, filePath: string): Promise<DriveFileInfo> {
  const raw = await request<SynoDriveFile>({
    endpoint: '/webapi/entry.cgi',
    params: {
      api: 'SYNO.Drive.Files',
      version: 2,
      method: 'get',
      path: sanitizePath(filePath),
      additional: JSON.stringify(['real_path', 'size', 'owner', 'time', 'perm', 'label']),
    },
  });
  return normalizeFileInfo(raw);
}

/** Search for files by keyword. Output shape matches listFiles. */
export async function search(request: RequestFn, opts: SearchOpts): Promise<DriveFileList> {
  const params: Record<string, string | number | boolean> = {
    api: 'SYNO.Drive.Files',
    version: 2,
    method: 'search',
    query: opts.query,
    folder_path: sanitizePath(opts.folder_path),
    limit: opts.limit,
  };
  if (opts.extension !== undefined) params['extension'] = opts.extension;

  const raw = await request<SynoDriveListResponse>({ endpoint: '/webapi/entry.cgi', params });
  return { total: raw.total, offset: raw.offset, files: raw.files.map(normalizeFile) };
}

export type { DriveFile, DriveFileInfo, DriveFileList };
