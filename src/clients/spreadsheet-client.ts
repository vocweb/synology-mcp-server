/**
 * Synology Spreadsheet REST API client.
 *
 * Wraps the Synology Office Suite Spreadsheet API documented at
 * https://office-suite-api.synology.com/Synology-Spreadsheet/v3-3-2
 * (OpenAPI 3.3.2; requires Synology Office package >= 3.6.0; the matching
 * synology/spreadsheet-api Docker container default port is 3000).
 *
 * The MCP tool surface stays flat/internal (SynoSpreadsheetInfo/SynoCellData);
 * this client translates between the spec's nested shapes and those internal
 * structures. Authentication is handled by SpreadsheetAuthManager (JWT bearer).
 */

import { Agent } from 'undici';
import { httpFetch, type FetchResponse } from '../utils/http-fetch.js';
import type { SpreadsheetAuthManager } from '../auth/spreadsheet-auth-manager.js';
import type { SynologyConfig } from '../types/index.js';
import type {
  SynoSpreadsheetInfo,
  SynoCellData,
  SynoSheetInfo,
  SpreadsheetData,
  WorksheetData,
  GetValueResponse,
  AppendResponse,
  AddSheetResponse,
  RenameSheetResponse,
  CreateSpreadsheetResponse,
  GetStyleResponse,
  CellStyle,
  CellJSON2D,
  BatchUpdateRequest,
  BatchUpdateRequestItem,
  Dimension,
} from '../types/synology-types.js';
import { NetworkError, SynologyMcpError } from '../errors.js';

// ---------------------------------------------------------------------------
// Tool-facing input/output types (kept stable across the migration)
// ---------------------------------------------------------------------------

/** Cell scalar accepted by tool inputs (rich text not authored from tools). */
export type CellValue = string | number | boolean | null;

export interface GetCellsOpts {
  file_id: string;
  sheet_name?: string | undefined;
  range?: string | undefined;
  include_formulas?: boolean | undefined;
}

export interface SetCellsOpts {
  file_id: string;
  sheet_name: string;
  start_cell: string;
  values: CellValue[][];
}

export interface SetCellsResult {
  success: boolean;
}

export interface AppendRowsOpts {
  file_id: string;
  sheet_name: string;
  start_cell: string;
  values: CellValue[][];
}

export interface AppendRowsResult {
  success: boolean;
  updatedRows: number;
}

export interface CreateSpreadsheetOpts {
  name: string;
  /** Currently ignored — Spreadsheet API has no folder concept; use Drive API to move. */
  dest_folder_path?: string;
  /** Currently ignored — first sheet is named by the Spreadsheet API itself. */
  initial_sheet_name?: string;
}

export interface CreateSpreadsheetResult {
  file_id: string;
}

export interface AddSheetOpts {
  file_id: string;
  sheet_name: string;
  /** Ignored — spec body does not accept a position. */
  position?: number | undefined;
}

export interface AddSheetResult {
  success: boolean;
  sheet_id: string;
  index: number;
}

export interface ExportFileOpts {
  file_id: string;
  format: 'xlsx' | 'csv';
  /** For CSV: the sheetId (e.g. "sh_1") to export. For xlsx: ignored. */
  sheet_id?: string | undefined;
}

export interface ExportFileResult {
  buffer: Buffer;
  file_name: string;
  mime_type: string;
}

export interface GetStylesOpts {
  file_id: string;
  sheet_name: string;
  range: string;
}

export interface GetStylesResult {
  range: string;
  /** 2D grid of cell styles aligned with the queried range. */
  styles: CellStyle[][];
}

export interface RenameSheetOpts {
  file_id: string;
  sheet_id: string;
  new_name: string;
}

export interface DeleteSheetOpts {
  file_id: string;
  sheet_id: string;
}

export interface BatchUpdateOpts {
  file_id: string;
  sheet_id: string;
  action: 'insert_rows' | 'insert_columns' | 'delete_rows' | 'delete_columns';
  /** Starting row/column index (0-based). */
  index: number;
  /** Number of rows/columns to insert or delete. */
  count: number;
}

export interface BatchUpdateResult {
  success: boolean;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

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

  /** GET /spreadsheets/{id} */
  async getInfo(file_id: string): Promise<SynoSpreadsheetInfo> {
    const response = await this.fetchJson<SpreadsheetData>('GET', `/spreadsheets/${encodeURIComponent(file_id)}`);
    return this.mapSpreadsheetData(response);
  }

  /** GET /spreadsheets/{id}/values/{range} — sheet name encoded in range as `Sheet1!A1:Z1000`. */
  async getCells(opts: GetCellsOpts): Promise<SynoCellData> {
    const sheetName = opts.sheet_name ?? 'Sheet1';
    const a1 = opts.range ?? 'A1:Z1000';
    const range = this.qualifiedRange(sheetName, a1);

    const response = await this.fetchJson<GetValueResponse>(
      'GET',
      `/spreadsheets/${encodeURIComponent(opts.file_id)}/values/${encodeURIComponent(range)}`,
    );

    return {
      sheet_name: sheetName,
      range: response.range,
      values: this.cellGridToScalar(response.values),
    };
  }

  /** PUT /spreadsheets/{id}/values/{range} */
  async setCells(opts: SetCellsOpts): Promise<SetCellsResult> {
    const a1 = `${opts.start_cell}:${this.calculateEndCell(opts.start_cell, opts.values)}`;
    const range = this.qualifiedRange(opts.sheet_name, a1);

    await this.fetchJson<unknown>(
      'PUT',
      `/spreadsheets/${encodeURIComponent(opts.file_id)}/values/${encodeURIComponent(range)}`,
      { values: opts.values },
    );

    return { success: true };
  }

  /** PUT /spreadsheets/{id}/values/{range}/append */
  async appendRows(opts: AppendRowsOpts): Promise<AppendRowsResult> {
    const a1 = `${opts.start_cell}:${this.calculateEndCell(opts.start_cell, opts.values)}`;
    const range = this.qualifiedRange(opts.sheet_name, a1);

    const response = await this.fetchJson<AppendResponse>(
      'PUT',
      `/spreadsheets/${encodeURIComponent(opts.file_id)}/values/${encodeURIComponent(range)}/append`,
      { values: opts.values },
    );

    return {
      success: true,
      updatedRows: response.updates?.updateRows ?? 0,
    };
  }

  /** POST /spreadsheets/create */
  async create(opts: CreateSpreadsheetOpts): Promise<CreateSpreadsheetResult> {
    const response = await this.fetchJson<CreateSpreadsheetResponse>(
      'POST',
      '/spreadsheets/create',
      { name: opts.name },
    );
    return { file_id: response.spreadsheetId };
  }

  /** POST /spreadsheets/{id}/sheet/add */
  async addSheet(opts: AddSheetOpts): Promise<AddSheetResult> {
    const response = await this.fetchJson<AddSheetResponse>(
      'POST',
      `/spreadsheets/${encodeURIComponent(opts.file_id)}/sheet/add`,
      { sheetName: opts.sheet_name },
    );
    const props = response.addSheet?.properties;
    return {
      success: true,
      sheet_id: props?.sheetId ?? '',
      index: props?.index ?? 0,
    };
  }

  /** GET /spreadsheets/{id}/xlsx OR GET /spreadsheets/{id}/sheet/csv?sheetId=... */
  async exportFile(opts: ExportFileOpts): Promise<ExportFileResult> {
    const token = await this.authManager.getToken();
    let endpoint: string;
    if (opts.format === 'xlsx') {
      endpoint = `/spreadsheets/${encodeURIComponent(opts.file_id)}/xlsx`;
    } else {
      const sheetId = opts.sheet_id ?? 'sh_1';
      endpoint = `/spreadsheets/${encodeURIComponent(opts.file_id)}/sheet/csv?sheetId=${encodeURIComponent(sheetId)}`;
    }
    return this.fetchBinary(token, endpoint);
  }

  /** GET /spreadsheets/{id}/styles/{range} */
  async getStyles(opts: GetStylesOpts): Promise<GetStylesResult> {
    const range = this.qualifiedRange(opts.sheet_name, opts.range);
    const response = await this.fetchJson<GetStyleResponse>(
      'GET',
      `/spreadsheets/${encodeURIComponent(opts.file_id)}/styles/${encodeURIComponent(range)}`,
    );
    return {
      range: response.range,
      styles: (response.rows ?? []).map((row) => row.values ?? []),
    };
  }

  /** POST /spreadsheets/{id}/sheet/rename */
  async renameSheet(opts: RenameSheetOpts): Promise<{ success: boolean }> {
    await this.fetchJson<RenameSheetResponse>(
      'POST',
      `/spreadsheets/${encodeURIComponent(opts.file_id)}/sheet/rename`,
      { sheetId: opts.sheet_id, sheetName: opts.new_name },
    );
    return { success: true };
  }

  /** POST /spreadsheets/{id}/sheet/delete */
  async deleteSheet(opts: DeleteSheetOpts): Promise<{ success: boolean }> {
    await this.fetchJson<unknown>(
      'POST',
      `/spreadsheets/${encodeURIComponent(opts.file_id)}/sheet/delete`,
      { sheetId: opts.sheet_id },
    );
    return { success: true };
  }

  /** POST /spreadsheets/{id}/batchUpdate */
  async batchUpdate(opts: BatchUpdateOpts): Promise<BatchUpdateResult> {
    const dimension: Dimension = opts.action.endsWith('rows') ? 'ROWS' : 'COLUMNS';
    const range = {
      sheetId: opts.sheet_id,
      dimension,
      startIndex: opts.index,
      endIndex: opts.index + opts.count,
    };
    const item: BatchUpdateRequestItem = opts.action.startsWith('insert')
      ? { insertDimension: { range, inheritFromBefore: true } }
      : { deleteDimension: { range } };
    const body: BatchUpdateRequest = { requests: [item] };

    await this.fetchJson<unknown>(
      'POST',
      `/spreadsheets/${encodeURIComponent(opts.file_id)}/batchUpdate`,
      body as unknown as Record<string, unknown>,
    );
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildBaseUrl(): string {
    const proto = this.config.spreadsheetHttps ? 'https' : 'http';
    return `${proto}://${this.config.host}:${this.config.spreadsheetPort}`;
  }

  /** Encode `Sheet1!A1:B2` if a sheet name is provided; otherwise raw range. */
  private qualifiedRange(sheetName: string | undefined, a1: string): string {
    if (!sheetName) return a1;
    return `${sheetName}!${a1}`;
  }

  /** Coerce CellJSON values into the flat scalar grid the tool layer expects. */
  private cellGridToScalar(grid: CellJSON2D | undefined): CellValue[][] {
    if (!grid) return [];
    return grid.map((row) =>
      row.map((cell): CellValue => {
        if (cell === null || cell === undefined) return null;
        if (typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') {
          return cell;
        }
        // Rich text: collapse to plain text.
        if (cell.t === 'r' && Array.isArray(cell.v)) {
          return cell.v.map((seg) => seg.tx).join('');
        }
        return null;
      }),
    );
  }

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
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    };

    if (body !== undefined) {
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
        } else if (typeof errorBody.message === 'string') {
          errorMsg = errorBody.message;
        }
      } catch {
        // ignore non-JSON error body
      }
      throw new SynologyMcpError('API_ERROR', errorMsg, response.status, true);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new NetworkError('Spreadsheet API returned non-JSON response');
    }
  }

  private async fetchBinary(token: string, path: string): Promise<ExportFileResult> {
    const url = this.buildBaseUrl() + path;

    const init: Record<string, unknown> = {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
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
    return { buffer: Buffer.from(arrayBuffer), file_name, mime_type };
  }

  /** Map spec SpreadsheetData -> internal flat SynoSpreadsheetInfo. */
  private mapSpreadsheetData(data: SpreadsheetData): SynoSpreadsheetInfo {
    return {
      file_id: data.id,
      name: data.properties?.title ?? '',
      sheets: (data.sheets ?? []).map((sheet) => this.mapWorksheetData(sheet)),
    };
  }

  private mapWorksheetData(sheet: WorksheetData): SynoSheetInfo {
    return {
      sheet_id: sheet.properties?.sheetId ?? '',
      name: sheet.properties?.title ?? '',
      row_count: sheet.rowCount ?? 0,
      col_count: sheet.colCount ?? 0,
      hidden: sheet.properties?.hidden ?? false,
    };
  }

  /** Calculate the end cell given a start cell and values grid dimensions. */
  private calculateEndCell(startCell: string, values: unknown[][]): string {
    const startMatch = /^([A-Z]+)(\d+)$/.exec(startCell);
    if (!startMatch || startMatch[1] === undefined || startMatch[2] === undefined) {
      return startCell;
    }
    const startCol = this.colNameToIndex(startMatch[1]);
    const startRow = parseInt(startMatch[2], 10);

    const endRow = startRow + values.length - 1;
    const maxCols = Math.max(...values.map((row) => row.length), 1);
    const endCol = startCol + maxCols - 1;

    return `${this.indexToColName(endCol)}${endRow}`;
  }

  /** Convert column letter(s) to 0-based index (A=0, Z=25, AA=26). */
  private colNameToIndex(name: string): number {
    let index = 0;
    for (let i = 0; i < name.length; i++) {
      index = index * 26 + (name.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  /** Convert 0-based column index to letter(s) (0=A, 25=Z, 26=AA). */
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
