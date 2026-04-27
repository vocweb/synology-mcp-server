/**
 * Exported MCP output shapes for all Drive operations.
 * These are the flat, normalized types returned to MCP tool handlers.
 * Per spec §7.1.
 */

/** Normalized Drive file entry for MCP consumers */
export interface DriveFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'dir';
  /** Size in bytes; 0 for directories */
  size: number;
  modified: string; // ISO 8601
  created: string; // ISO 8601
  owner: string;
  /** File extension without leading dot, e.g. "osheet" */
  extension: string;
  is_shared: boolean;
}

/** Detailed file info including real path, ACL, and labels */
export interface DriveFileInfo extends DriveFile {
  real_path: string;
  perm: {
    acl: { append: boolean; del: boolean; exec: boolean; read: boolean; write: boolean };
    is_owner: boolean;
  };
  labels: string[];
}

/** Paginated file list result */
export interface DriveFileList {
  total: number;
  offset: number;
  files: DriveFile[];
}

/** Result of a file upload */
export interface DriveUploadResult {
  success: boolean;
  file_id: string;
  file_path: string;
  file_name: string;
}

/** Result of a file download — raw buffer plus metadata */
export interface DriveDownloadResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

/** Result of folder creation */
export interface DriveFolderResult {
  success: boolean;
  folder_id: string;
  folder_path: string;
}

/** Result of a move or rename operation */
export interface DriveMoveResult {
  dry_run: boolean;
  success: boolean;
  new_path: string;
}

/** Label definition as returned by list_labels */
export interface DriveLabel {
  id: string;
  name: string;
  color: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
}

/** Sharing link result */
export interface DriveSharingLinkResult {
  link: string;
  permission: string;
  expires_at: string | null;
}
