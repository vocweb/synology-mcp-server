/**
 * Drive folder, label, and sharing operations:
 * createFolder, move, delete, listLabels, addLabel, getSharingLink.
 */

import { sanitizePath } from '../../utils/path-guard.js';
import type { RequestOptions } from '../base-client.js';
import type {
  SynoDriveFolderResponse,
  SynoDriveMoveResponse,
  SynoDriveLabelListResponse,
  SynoDriveSharingResponse,
} from './raw-response-types.js';
import type {
  DriveFolderResult,
  DriveMoveResult,
  DriveLabel,
  DriveSharingLinkResult,
} from './drive-types.js';

type RequestFn = <T>(options: RequestOptions) => Promise<T>;

/** Options for createFolder */
export interface CreateFolderOpts {
  folder_path: string;
  name: string;
  force_parent: boolean;
}

/** Options for move */
export interface MoveOpts {
  path: string;
  dest_folder_path: string;
  new_name?: string | undefined;
  conflict_action: 'version' | 'autorename' | 'skip';
}

/** Options for getSharingLink */
export interface SharingLinkOpts {
  path: string;
  permission: 'view' | 'edit' | 'download';
  password?: string | undefined;
  expire_days?: number | undefined;
}

/** Create a new folder in Drive. */
export async function createFolder(
  request: RequestFn,
  opts: CreateFolderOpts,
): Promise<DriveFolderResult> {
  const raw = await request<SynoDriveFolderResponse>({
    endpoint: '/webapi/entry.cgi',
    method: 'POST',
    params: {
      api: 'SYNO.SynologyDrive.Files',
      version: 2,
      method: 'create_folder',
      folder_path: sanitizePath(opts.folder_path),
      name: opts.name,
      force_parent: opts.force_parent,
    },
  });
  return { success: true, folder_id: raw.id, folder_path: raw.path };
}

/** Move or rename a file/folder. */
export async function move(request: RequestFn, opts: MoveOpts): Promise<DriveMoveResult> {
  const params: Record<string, string | number | boolean> = {
    api: 'SYNO.SynologyDrive.Files',
    version: 2,
    method: 'move',
    path: sanitizePath(opts.path),
    dest_folder_path: sanitizePath(opts.dest_folder_path),
    conflict_action: opts.conflict_action,
  };
  if (opts.new_name !== undefined) params['new_name'] = opts.new_name;

  const raw = await request<SynoDriveMoveResponse>({
    endpoint: '/webapi/entry.cgi',
    method: 'POST',
    params,
  });
  return { dry_run: false, success: true, new_path: raw.path };
}

/** Delete a file or folder (trash or permanent). */
export async function deleteFile(
  request: RequestFn,
  opts: { path: string; permanent: boolean },
): Promise<{ success: boolean }> {
  await request<Record<string, never>>({
    endpoint: '/webapi/entry.cgi',
    method: 'POST',
    params: {
      api: 'SYNO.SynologyDrive.Files',
      version: 2,
      method: 'delete',
      path: sanitizePath(opts.path),
      permanent: opts.permanent,
    },
  });
  return { success: true };
}

/** List all label definitions in Drive. */
export async function listLabels(request: RequestFn): Promise<DriveLabel[]> {
  const raw = await request<SynoDriveLabelListResponse>({
    endpoint: '/webapi/entry.cgi',
    params: { api: 'SYNO.SynologyDrive.Files', version: 2, method: 'list_labels' },
  });
  return raw.labels;
}

/** Apply a label to a file or folder by name. */
export async function addLabel(
  request: RequestFn,
  opts: { path: string; label_name: string },
): Promise<{ success: boolean }> {
  await request<Record<string, never>>({
    endpoint: '/webapi/entry.cgi',
    method: 'POST',
    params: {
      api: 'SYNO.SynologyDrive.Files',
      version: 2,
      method: 'add_label',
      path: sanitizePath(opts.path),
      label_name: opts.label_name,
    },
  });
  return { success: true };
}

/** Generate or retrieve a sharing link for a file. */
export async function getSharingLink(
  request: RequestFn,
  opts: SharingLinkOpts,
): Promise<DriveSharingLinkResult> {
  const params: Record<string, string | number | boolean> = {
    api: 'SYNO.SynologyDrive.Sharing',
    version: 2,
    method: 'create',
    path: sanitizePath(opts.path),
    permission: opts.permission,
  };
  if (opts.password !== undefined) params['password'] = opts.password;
  if (opts.expire_days !== undefined) params['expire_days'] = opts.expire_days;

  const raw = await request<SynoDriveSharingResponse>({
    endpoint: '/webapi/entry.cgi',
    method: 'POST',
    params,
  });

  return {
    link: raw.link,
    permission: raw.permission,
    expires_at: raw.expire_time ? new Date(raw.expire_time * 1000).toISOString() : null,
  };
}
