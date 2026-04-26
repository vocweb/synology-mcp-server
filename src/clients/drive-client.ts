/**
 * Synology Drive API client — thin shell that delegates to operation modules.
 * Public API is unchanged: consumers call `client.listFiles(...)` etc.
 * Internal logic lives in `src/clients/drive/` sub-modules.
 * Per spec §7.1 and §6.
 */

import { Agent } from 'undici';
import { BaseClient } from './base-client.js';
import type { AuthManager } from '../auth/auth-manager.js';
import type { SynologyConfig } from '../types/index.js';

import * as fileOps from './drive/file-operations.js';
import * as transfer from './drive/file-transfer.js';
import * as folderOps from './drive/folder-label-sharing-operations.js';

import type {
  DriveFileList,
  DriveFileInfo,
  DriveUploadResult,
  DriveDownloadResult,
  DriveFolderResult,
  DriveMoveResult,
  DriveLabel,
  DriveSharingLinkResult,
} from './drive/drive-types.js';

// Re-export all public types so callers only need to import from drive-client.ts
export type {
  DriveFile,
  DriveFileInfo,
  DriveFileList,
  DriveUploadResult,
  DriveDownloadResult,
  DriveFolderResult,
  DriveMoveResult,
  DriveLabel,
  DriveSharingLinkResult,
} from './drive/drive-types.js';

export type { ListFilesOpts, SearchOpts } from './drive/file-operations.js';
export type { UploadOpts } from './drive/file-transfer.js';
export type {
  CreateFolderOpts,
  MoveOpts,
  SharingLinkOpts,
} from './drive/folder-label-sharing-operations.js';

/**
 * Wraps all SYNO.Drive.Files v2 and SYNO.Drive.Sharing v2 operations.
 * Binary transfers (upload/download) bypass `request<T>()` and use direct fetch.
 */
export class DriveClient extends BaseClient {
  /** Passed to file-transfer module for binary HTTP calls that bypass request<T>(). */
  private readonly transferDeps: transfer.TransferDeps;

  constructor(config: SynologyConfig, authManager: AuthManager) {
    super(config, authManager);
    const dispatcher = config.ignoreCert
      ? new Agent({ connect: { rejectUnauthorized: false } })
      : undefined;

    this.transferDeps = {
      baseUrl: this.baseUrl,
      dispatcher,
      getToken: () => authManager.getToken(),
    };
  }

  // ---------------------------------------------------------------------------
  // File query operations
  // ---------------------------------------------------------------------------

  /** List files and folders under a Drive path. */
  listFiles(opts: fileOps.ListFilesOpts): Promise<DriveFileList> {
    return fileOps.listFiles(this.request.bind(this), opts);
  }

  /** Get detailed metadata (size, ACL, labels) for a single file or folder. */
  getFileInfo(filePath: string): Promise<DriveFileInfo> {
    return fileOps.getFileInfo(this.request.bind(this), filePath);
  }

  /** Search for files by keyword. Output shape matches listFiles. */
  search(opts: fileOps.SearchOpts): Promise<DriveFileList> {
    return fileOps.search(this.request.bind(this), opts);
  }

  // ---------------------------------------------------------------------------
  // Binary transfer operations
  // ---------------------------------------------------------------------------

  /** Upload a file from base64-encoded content via multipart/form-data. */
  upload(opts: transfer.UploadOpts): Promise<DriveUploadResult> {
    return transfer.upload(this.transferDeps, opts);
  }

  /** Download a file and return its raw buffer plus filename and MIME type. */
  download(filePath: string): Promise<DriveDownloadResult> {
    return transfer.download(this.transferDeps, filePath);
  }

  // ---------------------------------------------------------------------------
  // Folder, label, and sharing operations
  // ---------------------------------------------------------------------------

  /** Create a new folder in Drive. */
  createFolder(opts: folderOps.CreateFolderOpts): Promise<DriveFolderResult> {
    return folderOps.createFolder(this.request.bind(this), opts);
  }

  /** Move or rename a file/folder. */
  move(opts: folderOps.MoveOpts): Promise<DriveMoveResult> {
    return folderOps.move(this.request.bind(this), opts);
  }

  /** Delete a file or folder (trash or permanent). */
  delete(opts: { path: string; permanent: boolean }): Promise<{ success: boolean }> {
    return folderOps.deleteFile(this.request.bind(this), opts);
  }

  /** List all label definitions in Drive. */
  listLabels(): Promise<DriveLabel[]> {
    return folderOps.listLabels(this.request.bind(this));
  }

  /** Apply a label to a file or folder by name. */
  addLabel(opts: { path: string; label_name: string }): Promise<{ success: boolean }> {
    return folderOps.addLabel(this.request.bind(this), opts);
  }

  /** Generate or retrieve a sharing link for a file. */
  getSharingLink(opts: folderOps.SharingLinkOpts): Promise<DriveSharingLinkResult> {
    return folderOps.getSharingLink(this.request.bind(this), opts);
  }
}
