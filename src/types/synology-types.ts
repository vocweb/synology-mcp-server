/**
 * Synology API response envelope and entity type definitions.
 * All types correspond to spec §13.
 */

/** Generic Synology API response wrapper */
export interface SynologyResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: number; errors?: unknown[] };
}

/** Synology Drive file or directory entry */
export interface SynoDriveFile {
  /** Internal file/folder ID */
  id: string;
  /** Display name */
  name: string;
  /** Virtual path in Drive */
  path: string;
  /** Filesystem path on NAS (when requested via additional) */
  real_path?: string;
  /** Whether this entry is a file or directory */
  type: 'file' | 'dir';
  /** File size in bytes; absent for directories */
  size?: number;
  /** Optional extended metadata returned via additional[] param */
  additional?: {
    owner?: { user: string };
    time?: { atime: number; ctime: number; crtime: number; mtime: number };
    perm?: {
      acl: { append: boolean; del: boolean; exec: boolean; read: boolean; write: boolean };
      is_owner: boolean;
    };
  };
}

/** Synology Drive file list response */
export interface SynoDriveListResponse {
  /** Total number of matching items (for pagination) */
  total: number;
  /** Pagination offset applied */
  offset: number;
  /** Page of file entries */
  files: SynoDriveFile[];
}

/** Single sheet metadata within a Spreadsheet file */
export interface SynoSheetInfo {
  /** Internal sheet ID */
  sheet_id: string;
  /** Human-readable tab name */
  name: string;
  /** Number of rows with data */
  row_count: number;
  /** Number of columns with data */
  col_count: number;
  /** Whether the sheet is hidden */
  hidden: boolean;
}

/** Synology Spreadsheet file metadata (get_info response) */
export interface SynoSpreadsheetInfo {
  /** Drive file ID of the .osheet file */
  file_id: string;
  /** Display name of the spreadsheet */
  name: string;
  /** Ordered list of sheets in the workbook */
  sheets: SynoSheetInfo[];
}

/** Spreadsheet cell data response */
export interface SynoCellData {
  /** Name of the sheet queried */
  sheet_name: string;
  /** A1-notation range actually returned */
  range: string;
  /** 2D grid of cell values; outer = rows, inner = columns */
  values: Array<Array<string | number | boolean | null>>;
}

/** MailPlus mail folder */
export interface SynoMailFolder {
  /** Unique folder ID */
  id: string;
  /** Display name */
  name: string;
  /** IMAP-style path, e.g. "INBOX/Projects" */
  path: string;
  /** Count of unread messages */
  unread: number;
  /** Total message count */
  total: number;
  /** Whether this folder has sub-folders */
  has_children: boolean;
}

/** MailPlus message summary (list view) */
export interface SynoMailMessage {
  /** Unique message ID */
  id: string;
  /** Email subject line */
  subject: string;
  /** Sender name and address */
  from: { name: string; address: string };
  /** Primary recipients */
  to: Array<{ name: string; address: string }>;
  /** Unix timestamp of send/receive time */
  date: number;
  /** Message size in bytes */
  size: number;
  /** IMAP flags, e.g. ["\\Seen", "\\Flagged"] */
  flags: string[];
  /** First ~200 chars of body for preview */
  preview?: string;
}

/** Synology Calendar event */
export interface SynoCalEvent {
  /** Unique event ID */
  id: string;
  /** Parent calendar ID */
  cal_id: string;
  /** Event title / summary */
  title: string;
  /** Event description / body */
  desc: string;
  /** Physical or virtual location */
  location: string;
  /** Start time as Unix timestamp (seconds) */
  dtstart: number;
  /** End time as Unix timestamp (seconds) */
  dtend: number;
  /** True for all-day events (time portion is ignored) */
  is_all_day: boolean;
  /** RFC 5545 RRULE recurrence string, absent for one-off events */
  rrule?: string;
  /** Optional attendee list */
  attendee?: Array<{ email: string; name: string; status: string }>;
}
