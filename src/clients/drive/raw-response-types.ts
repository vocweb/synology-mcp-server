/**
 * Internal Synology API raw response shapes for Drive operations.
 * These are NOT exported to consumers — they are implementation details
 * of the DriveClient and its operation modules.
 */

/** Raw label entry from SYNO.Drive.Files list_labels */
export interface SynoDriveLabel {
  id: string;
  name: string;
  color: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
}

/** Raw response for upload */
export interface SynoDriveUploadResponse {
  file_id: string;
  path: string;
  name: string;
}

/** Raw response for create_folder */
export interface SynoDriveFolderResponse {
  id: string;
  path: string;
}

/** Raw response for move */
export interface SynoDriveMoveResponse {
  path: string;
}

/** Raw response for sharing link creation */
export interface SynoDriveSharingResponse {
  link: string;
  permission: string;
  /** Unix timestamp; absent when no expiry is set */
  expire_time?: number;
}

/** Raw label list response */
export interface SynoDriveLabelListResponse {
  labels: SynoDriveLabel[];
}
