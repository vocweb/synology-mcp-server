/**
 * Synology Office Spreadsheet API v3.7+ REST client.
 * Wraps REST endpoints (getInfo, getCells, setCells, create, addSheet, etc.)
 * Per spec §7.3 (Spreadsheet API v3.7+).
 */

import { Agent } from 'undici';
import { httpFetch, type FetchResponse } from '../utils/http-fetch.js';
import type { SpreadsheetAuthManager } from '../auth/spreadsheet-auth-manager.js';
import type { SynologyConfig } from '../types/index.js';
import type {
  SynoSpreadsheetInfo,
  SynoCellData,
  SynoSheetInfo,
  SpreadsheetDataV2,
  SheetDataV2,
  GetValueResponse,
  AppendResponse,
  AddSheetResponse,
  GetStyleResponse,
  CellStyle,
} from '../types/synology-types.js';
import { NetworkError, SynologyMcpError } from '../errors.js';

// ---------------------------------------------------------------------------
// Input/output types
// ---------------------------------------------------------------------------

/** Options for getCells */
export interface GetCellsOpts {
  file_id: string;
  sheet_name?: string | undefined;
  range?: string | undefined;
  include_formulas?: boolean | undefined;
}

/** Options for setCells */
export interface SetCellsOpts {
  file_id: string;
  sheet_name: string;
  start_cell: string;
  values: Array<Array<string | number | boolean | null>>;
}

/** Result of a setCells call */
export interface SetCellsResult {
  success: boolean;
}

/** Options for appendRows (native REST endpoint) */
export interface AppendRowsOpts {
  file_id: string;
  sheet_name: string;
  start_cell: string;
  values: Array<Array<string | number | boolean | null>>;
}

/** Result of appendRows */
export interface AppendRowsResult {
  success: boolean;
  updatedRows: number;
}

/** Options for create */
export interface CreateSpreadsheetOpts {
  name: string;
  dest_folder_path: string;
  initial_sheet_name: string;
}

/** Result of creating a new spreadsheet */
export interface CreateSpreadsheetResult {
  file_id: string;
  file_path: string;
}

/** Options for addSheet */
export interface AddSheetOpts {
  file_id: string;
  sheet_name: string;
  position?: number | undefined;
}

/** Result of addSheet */
export interface AddSheetResult {
  success: boolean;
  sheet_id: string;
}

/** Options for exportFile */
export interface ExportFileOpts {
  file_id: string;
  format: 'xlsx' | 'csv';
  sheet_name?: string | undefined;
}

/** Raw export response from Synology (binary buffer + meta) */
export interface ExportFileResult {
  buffer: Buffer;
  file_name: string;
  mime_type: string;
}

/** Options for getStyles */
export interface GetStylesOpts {
  file_id: string;
  sheet_name: string;
  range: string;
}

/** Result of getStyles */
export interface GetStylesResult {
  sheet: string;
  range: string;
  styles: Array<Array<CellStyle | null>>;
}

/** Options for renameSheet */
export interface RenameSheetOpts {
  file_id: string;
  sheet_id: string;
  new_name: string;
}

/** Options for deleteSheet */
export interface DeleteSheetOpts {
  file_id: string;
  sheet_id: string;
}

/** Options for batchUpdate */
export interface BatchUpdateOpts {
  file_id: string;
  sheet_id: string;
  action: 'insert_rows' | 'insert_columns' | 'delete_rows' | 'delete_columns';
  index: number;
  count: number;
}

/** Result of batchUpdate */
export interface BatchUpdateResult {
  success: boolean;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * REST client for Synology Spreadsheet API v3.7+.
 * Does NOT inherit from BaseClient (separate JWT auth, not DSM session).
 * Communicates with Spreadsheet API container at {host}:{spreadsheetPort}.
 */
export class SpreadsheetClient {
  private readonly authManager: SpreadsheetAuthManager;
  private readonly config: SynologyConfig;
  private readonly dispatcher: Agent | undefined;

  constructor(config: SynologyConfig, authManager: SpreadsheetAuthManager) {
    this.config = config;
    this.authManager = authManager;

    if (config.ignoreCert) {
      this.dispatcher = new Agent({
        connect: { rejectUnauthorized: false },
      });
    }
  }

  /**
   * Fetch metadata (sheet names, dimensions) for a spreadsheet file.
   *
   * @param file_id - Drive file ID (assumed equal to spreadsheetId in v3.7+).
   */
  async getInfo(file_id: string): Promise<SynoSpreadsheetInfo> {
    const response = await this.fetchJson<SpreadsheetDataV2>(
      `GET`,
      `/spreadsheets/${file_id}`,
    );

    return this.mapSpreadsheetDataToInfo(response);
  }

  /**
   * Read cell values from a sheet.
   *
   * @param opts - Query options: file_id, optional sheet_name, range, include_formulas.
   */
  async getCells(opts: GetCellsOpts): Promise<SynoCellData> {
    const sheetName = opts.sheet_name ?? 'Sheet1';
    const range = opts.range ?? 'A1:Z1000';

    const response = await this.fetchJson<GetValueResponse>(
      `GET`,
      `/spreadsheets/${opts.file_id}/values/${encodeURIComponent(range)}?sheet=${encodeURIComponent(sheetName)}`,
    );

    return {
      sheet_name: response.sheet,
      range: response.range,
      values: response.values,
    };
  }

  /**
   * Write a 2D array of values into a sheet starting at a given cell.
   *
   * @param opts - Target file_id, sheet_name, start_cell, and values grid.
   */
  async setCells(opts: SetCellsOpts): Promise<SetCellsResult> {
    const range = `${opts.start_cell}:${this.calculateEndCell(opts.start_cell, opts.values)}`;

    await this.fetchJson<unknown>(
      `PUT`,
      `/spreadsheets/${opts.file_id}/values/${encodeURIComponent(range)}?sheet=${encodeURIComponent(opts.sheet_name)}`,
      { values: opts.values },
    );

    return { success: true };
  }

  /**
   * Append rows to a sheet using native REST API endpoint (more efficient than setCells).
   *
   * @param opts - file_id, sheet_name, start_cell, and values grid.
   */
  async appendRows(opts: AppendRowsOpts): Promise<AppendRowsResult> {
    const range = `${opts.start_cell}:${this.calculateEndCell(opts.start_cell, opts.values)}`;

    const response = await this.fetchJson<AppendResponse>(
      `PUT`,
      `/spreadsheets/${opts.file_id}/values/${encodeURIComponent(range)}/append?sheet=${encodeURIComponent(opts.sheet_name)}`,
      { values: opts.values },
    );

    return {
      success: true,
      updatedRows: response.updatedRows,
    };
  }

  /**
   * Create a new empty spreadsheet file in Drive.
   *
   * @param opts - Name, destination folder path, and initial sheet name.
   */
  async create(opts: CreateSpreadsheetOpts): Promise<CreateSpreadsheetResult> {
    const body = {
      name: opts.name,
      destFolderPath: opts.dest_folder_path,
      initialSheetName: opts.initial_sheet_name,
    };

    const response = await this.fetchJson<{ id: string; filePath: string }>(
      `POST`,
      `/spreadsheets/create`,
      body,
    );

    return {
      file_id: response.id,
      file_path: response.filePath,
    };
  }

  /**
   * Add a new sheet tab to an existing spreadsheet.
   *
   * @param opts - file_id, new sheet_name, optional position.
   */
  async addSheet(opts: AddSheetOpts): Promise<AddSheetResult> {
    const body: Record<string, string | number> = { name: opts.sheet_name };
    if (opts.position !== undefined) {
      body.index = opts.position;
    }

    const response = await this.fetchJson<AddSheetResponse>(
      `POST`,
      `/spreadsheets/${opts.file_id}/sheet/add`,
      body,
    );

    return {
      success: true,
      sheet_id: response.sheetId,
    };
  }

  /**
   * Export a spreadsheet to xlsx or csv, returning the raw buffer and metadata.
   *
   * @param opts - file_id, export format, optional sheet_name for CSV.
   */
  async exportFile(opts: ExportFileOpts): Promise<ExportFileResult> {
    const token = await this.authManager.getToken();
    const endpoint =
      opts.format === 'xlsx'
        ? `/spreadsheets/${opts.file_id}/xlsx`
        : `/spreadsheets/${opts.file_id}/sheet/csv?sheetId=${encodeURIComponent(opts.sheet_name || 'Sheet1')}`;

    const response = await this.fetchBinary(token, endpoint);
    return response;
  }

  /**
   * Get cell styles for a range.
   *
   * @param opts - file_id, sheet_name, and range to query.
   */
  async getStyles(opts: GetStylesOpts): Promise<GetStylesResult> {
    const response = await this.fetchJson<GetStyleResponse>(
      `GET`,
      `/spreadsheets/${opts.file_id}/styles/${encodeURIComponent(opts.range)}?sheet=${encodeURIComponent(opts.sheet_name)}`,
    );

    return {
      sheet: response.sheet,
      range: response.range,
      styles: response.styles,
    };
  }

  /**
   * Rename a sheet tab.
   *
   * @param opts - file_id, sheet_id, and new_name.
   */
  async renameSheet(opts: RenameSheetOpts): Promise<{ success: boolean }> {
    await this.fetchJson<unknown>(
      `POST`,
      `/spreadsheets/${opts.file_id}/sheet/rename`,
      { sheetId: opts.sheet_id, name: opts.new_name },
    );

    return { success: true };
  }

  /**
   * Delete a sheet tab.
   *
   * @param opts - file_id and sheet_id.
   */
  async deleteSheet(opts: DeleteSheetOpts): Promise<{ success: boolean }> {
    await this.fetchJson<unknown>(
      `POST`,
      `/spreadsheets/${opts.file_id}/sheet/delete`,
      { sheetId: opts.sheet_id },
    );

    return { success: true };
  }

  /**
   * Perform batch operations (insert/delete rows or columns).
   *
   * @param opts - file_id, sheet_id, action, index, and count.
   */
  async batchUpdate(opts: BatchUpdateOpts): Promise<BatchUpdateResult> {
    const body = {
      sheetId: opts.sheet_id,
      action: opts.action,
      index: opts.index,
      count: opts.count,
    };

    await this.fetchJson<BatchUpdateResult>(
      `POST`,
      `/spreadsheets/${opts.file_id}/batchUpdate`,
      body,
    );

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Build base URL for Spreadsheet API */
  private buildBaseUrl(): string {
    const proto = this.config.spreadsheetHttps ? 'https' : 'http';
    return `${proto}://${this.config.host}:${this.config.spreadsheetPort}`;
  }

  /** Fetch JSON response from API */
  private async fetchJson<T>(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const token = await this.authManager.getToken();
    const url = this.buildBaseUrl() + path;

    const init: Record<string, unknown> = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    };

    if (body) {
      init.body = JSON.stringify(body);
    }

    let response: FetchResponse;
    try {
      response = await httpFetch(url, init, this.dispatcher);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new NetworkError(`Failed to reach Spreadsheet API: ${msg}`);
    }

    if (response.status === 401) {
      this.authManager.invalidate();
      throw new SynologyMcpError('AUTH_FAILED', 'Spreadsheet API token expired', 401, true);
    }

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorBody = (await response.json()) as Record<string, unknown>;
        if (typeof errorBody.error === 'string') {
          errorMsg = errorBody.error;
        } else if (typeof errorBody.error_description === 'string') {
          errorMsg = errorBody.error_description;
        }
      } catch {
        // Failed to parse error response, use HTTP status only
      }
      throw new SynologyMcpError('API_ERROR', errorMsg, undefined, true);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new NetworkError('Spreadsheet API returned non-JSON response');
    }
  }

  /** Fetch binary response (for export) */
  private async fetchBinary(token: string, path: string): Promise<ExportFileResult> {
    const url = this.buildBaseUrl() + path;

    const init: Record<string, unknown> = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    };

    let response: FetchResponse;
    try {
      response = await httpFetch(url, init, this.dispatcher);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new NetworkError(`Failed to export from Spreadsheet API: ${msg}`);
    }

    if (response.status === 401) {
      this.authManager.invalidate();
      throw new SynologyMcpError('AUTH_FAILED', 'Spreadsheet API token expired', 401, true);
    }

    if (!response.ok) {
      throw new SynologyMcpError('API_ERROR', `Export failed with HTTP ${response.status}`, response.status, true);
    }

    const disposition = response.headers.get('content-disposition') ?? '';
    const nameMatch = /filename="([^"]+)"/.exec(disposition);
    const file_name = nameMatch?.[1] ?? 'export.bin';
    const mime_type = response.headers.get('content-type') ?? 'application/octet-stream';

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return { buffer, file_name, mime_type };
  }

  /** Map REST API response to internal SynoSpreadsheetInfo type */
  private mapSpreadsheetDataToInfo(data: SpreadsheetDataV2): SynoSpreadsheetInfo {
    return {
      file_id: data.id,
      name: data.name,
      sheets: data.sheets.map((sheet) => this.mapSheetDataV2ToSheetInfo(sheet)),
    };
  }

  /** Map REST API sheet data to internal SynoSheetInfo type */
  private mapSheetDataV2ToSheetInfo(sheet: SheetDataV2): SynoSheetInfo {
    return {
      sheet_id: sheet.sheetId,
      name: sheet.name,
      row_count: sheet.rowCount,
      col_count: sheet.columnCount,
      hidden: sheet.isHidden,
    };
  }

  /** Calculate the end cell given a start cell and values grid dimensions */
  private calculateEndCell(startCell: string, values: Array<Array<unknown>>): string {
    // Parse start cell (e.g. "A1" -> { col: 1, row: 1 })
    const startMatch = /^([A-Z]+)(\d+)$/.exec(startCell);
    if (!startMatch || startMatch[1] === undefined || startMatch[2] === undefined) {
      return startCell; // Fallback if unparseable
    }

    const startCol = this.colNameToIndex(startMatch[1]);
    const startRow = parseInt(startMatch[2], 10);

    // Calculate end position
    const endRow = startRow + values.length - 1;
    const maxCols = Math.max(...values.map((row) => row.length), 1);
    const endCol = startCol + maxCols - 1;

    return `${this.indexToColName(endCol)}${endRow}`;
  }

  /** Convert column letter(s) to 0-based index (A=0, Z=25, AA=26) */
  private colNameToIndex(name: string): number {
    let index = 0;
    for (let i = 0; i < name.length; i++) {
      index = index * 26 + (name.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  /** Convert 0-based column index to letter(s) (0=A, 25=Z, 26=AA) */
  private indexToColName(index: number): string {
    let name = '';
    let idx = index + 1;
    while (idx > 0) {
      idx -= 1;
      name = String.fromCharCode((idx % 26) + 65) + name;
      idx = Math.floor(idx / 26);
    }
    return name;
  }
}
