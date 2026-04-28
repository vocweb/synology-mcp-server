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
// Synology Spreadsheet API REST Types
// Matches OpenAPI 3.3.2 (Synology Office package >= 3.6.0;
// Docker tag synology/spreadsheet-api:3.4.1+ requires Synology Office >= 3.7.0).
// ============================================================================

/** Cell value: literal or rich-text segment object. */
export type CellJSON = string | number | boolean | RichTextJSON;
export type CellJSON2D = CellJSON[][];

/** Style for a single rich-text segment (compact short keys). */
export interface CompactFontJSON {
  /** font family */
  n?: string;
  /** font size */
  sz?: number;
  /** bold */
  b?: boolean;
  /** italic */
  i?: boolean;
  /** strike-through */
  s?: boolean;
  /** underline */
  u?: boolean;
  /** color (hex without #) */
  c?: string;
}

export interface RichTextRunJSON {
  /** segment text */
  tx: string;
  /** segment style */
  s?: CompactFontJSON;
}

/** Rich text cell (`{ t: 'r', v: [...] }`). */
export interface RichTextJSON {
  t: 'r';
  v: RichTextRunJSON[];
}

/** Sheet ID like `sh_1` (suffix from URL `#tid=N`). */
export type SheetId = string;
export type Dimension = 'ROWS' | 'COLUMNS';

/** Sheet tab properties. */
export interface SheetProperties {
  title: string;
  sheetId: SheetId;
  index: number;
  hidden?: boolean;
}

/** Worksheet payload as returned inside `SpreadsheetData.sheets[]`. */
export interface WorksheetData {
  properties: SheetProperties;
  rowCount: number;
  colCount: number;
  fixedColumnLeft?: number;
  fixedRowTop?: number;
  /** Each entry is a 4-tuple [row1, col1, row2, col2]. */
  mergeCells?: number[][];
}

/** Workbook-level properties. */
export interface SpreadsheetProperties {
  title: string;
  locale?: string;
}

/** GET /spreadsheets/{id} response. */
export interface SpreadsheetData {
  id: string;
  properties: SpreadsheetProperties;
  sheets: WorksheetData[];
}

/** Number format. */
export interface NumberFormat {
  type?: 'DEFAULT' | 'DATE_TIME' | 'DATE' | 'TIME' | 'TEXT' | 'DURATION';
  pattern?: string;
}

export interface TextFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  name?: string;
  size?: number;
}

export interface CellFormat {
  numberFormat?: NumberFormat | null;
  verticalAlignment?: 'top' | 'middle' | 'bottom' | null;
  textFormat?: TextFormat;
  /** Background color (hex without #). */
  bg?: string | null;
  quotePrefix?: boolean;
  horizontalAlignment?: 'left' | 'center' | 'right' | null;
  wrapStrategy?: 'wrap' | 'clip' | null;
  /** Border colors top/right/bottom/left. */
  borders?: Array<string | null> | null;
}

export interface FormulaError {
  error: string;
}

/** Cell style entry as returned by GET /styles/{range}. */
export interface CellStyle {
  userEnteredValue?: CellJSON;
  effectiveValue?: string | number | boolean | FormulaError;
  formattedValue?: string;
  userEnteredFormat?: CellFormat;
  effectiveFormat?: CellFormat;
  hyperlink?: string;
}

/** GET /spreadsheets/{id}/values/{range}. */
export interface GetValueResponse {
  range: string;
  majorDimension: Dimension;
  values: CellJSON2D;
}

/** PUT /spreadsheets/{id}/values/{range}/append. */
export interface AppendResponse {
  tableRange: string;
  updates: {
    updateRange: string;
    updateRows: number;
    updateColumns: number;
  };
  spreadsheetId: string;
}

/** POST /spreadsheets/{id}/sheet/add. */
export interface AddSheetResponse {
  addSheet: {
    properties: {
      sheetId: SheetId;
      title: string;
      index: number;
    };
  };
}

/** POST /spreadsheets/{id}/sheet/rename. */
export interface RenameSheetResponse {
  spreadsheetId: string;
  sheetId: SheetId;
  sheetName: string;
}

/** POST /spreadsheets/{id}/sheet/delete. */
export interface DeleteSheetResponse {
  spreadsheetId: string;
}

/** POST /spreadsheets/create. */
export interface CreateSpreadsheetResponse {
  spreadsheetId: string;
}

/** GET /spreadsheets/{id}/styles/{range}. */
export interface GetStyleResponse {
  range: string;
  rows: Array<{ values: CellStyle[] }>;
}

/** POST /spreadsheets/{id}/batchUpdate – single request item. */
export type BatchUpdateRequestItem =
  | { insertDimension: { range: DimensionRange; inheritFromBefore?: boolean } }
  | { deleteDimension: { range: DimensionRange } };

export interface DimensionRange {
  sheetId: SheetId;
  dimension: Dimension;
  startIndex: number;
  endIndex: number;
}

export interface BatchUpdateRequest {
  requests: BatchUpdateRequestItem[];
}
