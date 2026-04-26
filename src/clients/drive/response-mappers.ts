/**
 * Synology raw response → flat MCP shape normalizers for Drive entities.
 * All functions are pure transforms with defensive defaults for missing fields.
 */

import type { SynoDriveFile } from '../../types/synology-types.js';
import type { DriveFile, DriveFileInfo } from './drive-types.js';

/**
 * Converts a raw SynoDriveFile to a flat DriveFile for MCP output.
 * Defensive defaults handle missing `additional` fields.
 */
export function normalizeFile(f: SynoDriveFile): DriveFile {
  const mtime = f.additional?.time?.mtime ?? 0;
  const crtime = f.additional?.time?.crtime ?? 0;
  const owner = f.additional?.owner?.user ?? '';
  const ext =
    f.type === 'file' ? (f.name.includes('.') ? (f.name.split('.').pop() ?? '') : '') : '';

  return {
    id: f.id,
    name: f.name,
    path: f.path,
    type: f.type,
    size: f.size ?? 0,
    modified: mtime ? new Date(mtime * 1000).toISOString() : '',
    created: crtime ? new Date(crtime * 1000).toISOString() : '',
    owner,
    extension: ext,
    // Synology does not expose is_shared in list/get; default false
    is_shared: false,
  };
}

/**
 * Converts a raw SynoDriveFile with full additional fields to DriveFileInfo.
 * Extends normalizeFile with ACL, real_path, and label data.
 */
export function normalizeFileInfo(f: SynoDriveFile & { labels?: string[] }): DriveFileInfo {
  const base = normalizeFile(f);
  const perm = f.additional?.perm ?? {
    acl: { append: false, del: false, exec: false, read: false, write: false },
    is_owner: false,
  };

  return {
    ...base,
    real_path: f.real_path ?? f.path,
    perm,
    labels: f.labels ?? [],
  };
}
