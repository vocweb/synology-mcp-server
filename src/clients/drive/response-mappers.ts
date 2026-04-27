/**
 * Synology raw response → flat MCP shape normalizers for Drive entities.
 * All functions are pure transforms with defensive defaults for missing fields.
 */

import type { SynoDriveFile } from '../../types/synology-types.js';
import type { DriveFile, DriveFileInfo } from './drive-types.js';

/**
 * Converts a raw SynoDriveFile (DSM 7.3.2 SYNO.SynologyDrive.Files shape)
 * to a flat DriveFile for MCP output. Defensive defaults handle missing fields.
 */
export function normalizeFile(f: SynoDriveFile): DriveFile {
  const mtime = f.modified_time ?? 0;
  const crtime = f.created_time ?? 0;
  const owner = f.owner?.name ?? f.owner?.nickname ?? '';
  const ext =
    f.type === 'file' ? (f.name.includes('.') ? (f.name.split('.').pop() ?? '') : '') : '';

  return {
    id: f.file_id,
    name: f.name,
    // Surface the user-friendly full virtual path (e.g. /mydrive/...) when present
    path: f.display_path ?? f.path,
    type: f.type,
    size: f.size ?? 0,
    modified: mtime ? new Date(mtime * 1000).toISOString() : '',
    created: crtime ? new Date(crtime * 1000).toISOString() : '',
    owner,
    extension: ext,
    is_shared: f.shared ?? false,
  };
}

/**
 * Converts a raw SynoDriveFile to DriveFileInfo, mapping DSM 7.3.2 capabilities
 * map to the legacy `perm.acl` shape and extracting label names.
 */
export function normalizeFileInfo(f: SynoDriveFile): DriveFileInfo {
  const base = normalizeFile(f);
  const cap = f.capabilities ?? {};
  const perm = {
    acl: {
      append: cap['can_write'] ?? false,
      del: cap['can_delete'] ?? false,
      exec: false,
      read: cap['can_read'] ?? false,
      write: cap['can_write'] ?? false,
    },
    is_owner: cap['can_organize'] ?? false,
  };

  const labels = (f.labels ?? []).map((l) =>
    typeof l === 'string' ? l : (l.name ?? l.label_id ?? ''),
  );

  return {
    ...base,
    real_path: f.dsm_path ?? f.display_path ?? f.path,
    perm,
    labels,
  };
}
