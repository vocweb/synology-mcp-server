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

/**
 * Synology Drive file or directory entry returned by SYNO.SynologyDrive.Files
 * on DSM 7.3.2. Field names differ significantly from legacy SYNO.Drive.Files.
 */
export interface SynoDriveFile {
  /** Internal file/folder ID (numeric string) */
  file_id: string;
  /** Display name (basename only) */
  name: string;
  /** Path relative to the user team folder root, e.g. "/Reports/Q1.xlsx" */
  path: string;
  /** Full virtual path including team folder root, e.g. "/mydrive/Reports/Q1.xlsx" */
  display_path: string;
  /** Filesystem path on NAS (only on certain endpoints) */
  dsm_path?: string;
  /** Whether this entry is a file or directory */
  type: 'file' | 'dir';
  /** MIME-ish content category ("dir" for folders, e.g. "application/...") */
  content_type?: string;
  /** File size in bytes; 0 for directories */
  size: number;
  /** Last access time (Unix seconds) */
  access_time?: number;
  /** Last modification time (Unix seconds) */
  modified_time?: number;
  /** Creation time (Unix seconds) */
  created_time?: number;
  /** Owner descriptor; shape varies by endpoint */
  owner?: { name?: string; uid?: number; nickname?: string };
  /** Permanent share-link token */
  permanent_link?: string;
  /** Whether the file is currently shared */
  shared?: boolean;
  /** Capability map for the current user */
  capabilities?: Record<string, boolean>;
  /** Label IDs/names attached to the file */
  labels?: Array<string | { label_id?: string; name?: string }>;
}

/** Synology Drive file list response (SYNO.SynologyDrive.Files list) */
export interface SynoDriveListResponse {
  /** Total number of matching items */
  total: number;
  /** Page of file entries (DSM 7.3.2 returns "items", not "files") */
  items: SynoDriveFile[];
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

// ============================================================================
// Synology Spreadsheet API v3.7+ REST API Response Types
// ============================================================================

/** Sheet metadata from REST API v3.7+ */
export interface SheetDataV2 {
  /** Internal sheet ID */
  sheetId: string;
  /** Human-readable tab name */
  name: string;
  /** Number of rows with data */
  rowCount: number;
  /** Number of columns with data */
  columnCount: number;
  /** Whether the sheet is hidden */
  isHidden: boolean;
}

/** Spreadsheet metadata response from REST API v3.7+ (GET /spreadsheets/{id}) */
export interface SpreadsheetDataV2 {
  /** Spreadsheet ID from REST API */
  id: string;
  /** Display name of the spreadsheet */
  name: string;
  /** Ordered list of sheets in the workbook */
  sheets: SheetDataV2[];
  /** Creation timestamp (Unix seconds) */
  createdTime?: number;
  /** Last modification timestamp (Unix seconds) */
  modifiedTime?: number;
}

/** Cell values response from REST API v3.7+ (GET /spreadsheets/{id}/values/{range}) */
export interface GetValueResponse {
  /** Name of the sheet queried */
  sheet: string;
  /** A1-notation range actually returned */
  range: string;
  /** 2D grid of cell values; outer = rows, inner = columns */
  values: Array<Array<string | number | boolean | null>>;
}

/** Append/set values response from REST API v3.7+ (PUT /spreadsheets/{id}/values/{range}/append) */
export interface AppendResponse {
  /** Number of rows updated */
  updatedRows: number;
  /** Number of columns updated */
  updatedColumns: number;
  /** Total cells updated */
  updatedCells: number;
}

/** Add sheet response from REST API v3.7+ (POST /spreadsheets/{id}/sheet/add) */
export interface AddSheetResponse {
  /** ID of the newly created sheet */
  sheetId: string;
  /** Index position of the new sheet */
  index: number;
}

/** Cell styles response from REST API v3.7+ (GET /spreadsheets/{id}/styles/{range}) */
export interface GetStyleResponse {
  /** Name of the sheet queried */
  sheet: string;
  /** A1-notation range queried */
  range: string;
  /** 2D grid of cell styles; outer = rows, inner = columns */
  styles: Array<Array<CellStyle | null>>;
}

/** Individual cell style definition */
export interface CellStyle {
  /** Font name, e.g. "Arial", "Times New Roman" */
  fontName?: string;
  /** Font size in points */
  fontSize?: number;
  /** Font weight: normal (400), bold (700), etc. */
  fontWeight?: number;
  /** True if italic */
  italic?: boolean;
  /** True if underline */
  underline?: boolean;
  /** True if strikethrough */
  strikethrough?: boolean;
  /** Hex color code (e.g. "#FF0000" for red) */
  fontColor?: string;
  /** Background color hex code */
  backgroundColor?: string;
  /** Horizontal alignment: left, center, right, justify */
  horizontalAlignment?: 'left' | 'center' | 'right' | 'justify';
  /** Vertical alignment: top, middle, bottom */
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  /** Number format code, e.g. "0.00", "@" for text */
  numberFormat?: string;
  /** Whether text wraps in cell */
  wrapText?: boolean;
}
