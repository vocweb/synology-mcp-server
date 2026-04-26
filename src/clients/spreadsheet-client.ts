/**
 * Synology Spreadsheet API client.
 * Wraps SYNO.Spreadsheet v1 endpoints: getInfo, getCells, setCells,
 * create, addSheet, exportFile.
 * Per spec §7.2.
 */

import { BaseClient } from './base-client.js';
import type { AuthManager } from '../auth/auth-manager.js';
import type { SynologyConfig } from '../types/index.js';
import type { SynoSpreadsheetInfo, SynoCellData } from '../types/synology-types.js';

/** SYNO.Spreadsheet entry.cgi endpoint path */
const ENTRY = '/webapi/entry.cgi';
/** API name used in every request */
const API = 'SYNO.Spreadsheet';

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

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Wraps all SYNO.Spreadsheet operations.
 * Binary export bypasses request<T>() and uses direct fetch.
 */
export class SpreadsheetClient extends BaseClient {
  constructor(config: SynologyConfig, authManager: AuthManager) {
    super(config, authManager);
  }

  /**
   * Fetch metadata (sheet names, dimensions) for a spreadsheet file.
   *
   * @param file_id - Drive file ID of the .osheet file.
   */
  getInfo(file_id: string): Promise<SynoSpreadsheetInfo> {
    return this.request<SynoSpreadsheetInfo>({
      endpoint: ENTRY,
      method: 'GET',
      params: { api: API, version: 1, method: 'get_info', file_id },
    });
  }

  /**
   * Read cell values from a sheet.
   *
   * @param opts - Query options: file_id, optional sheet_name, range, include_formulas.
   */
  getCells(opts: GetCellsOpts): Promise<SynoCellData> {
    const params: Record<string, string | number | boolean> = {
      api: API,
      version: 1,
      method: 'get_cells',
      file_id: opts.file_id,
    };
    if (opts.sheet_name !== undefined) params['sheet_name'] = opts.sheet_name;
    if (opts.range !== undefined) params['range'] = opts.range;
    if (opts.include_formulas !== undefined) params['include_formulas'] = opts.include_formulas;

    return this.request<SynoCellData>({ endpoint: ENTRY, method: 'GET', params });
  }

  /**
   * Write a 2D array of values into a sheet starting at a given cell.
   *
   * @param opts - Target file_id, sheet_name, start_cell, and values grid.
   */
  async setCells(opts: SetCellsOpts): Promise<SetCellsResult> {
    const params: Record<string, string | number | boolean> = {
      api: API,
      version: 1,
      method: 'set_cells',
      file_id: opts.file_id,
      sheet_name: opts.sheet_name,
      start_cell: opts.start_cell,
    };
    const body = new URLSearchParams();
    body.set('values', JSON.stringify(opts.values));

    await this.request<unknown>({ endpoint: ENTRY, method: 'POST', params, body });
    return { success: true };
  }

  /**
   * Create a new empty spreadsheet file in Drive.
   *
   * @param opts - Name, destination folder path, and initial sheet name.
   */
  create(opts: CreateSpreadsheetOpts): Promise<CreateSpreadsheetResult> {
    const params: Record<string, string | number | boolean> = {
      api: API,
      version: 1,
      method: 'create',
      name: opts.name,
      dest_folder_path: opts.dest_folder_path,
      sheet_name: opts.initial_sheet_name,
    };
    return this.request<CreateSpreadsheetResult>({ endpoint: ENTRY, method: 'POST', params });
  }

  /**
   * Add a new sheet tab to an existing spreadsheet.
   *
   * @param opts - file_id, new sheet_name, optional position.
   */
  addSheet(opts: AddSheetOpts): Promise<AddSheetResult> {
    const params: Record<string, string | number | boolean> = {
      api: API,
      version: 1,
      method: 'add_sheet',
      file_id: opts.file_id,
      sheet_name: opts.sheet_name,
    };
    if (opts.position !== undefined) params['position'] = opts.position;

    return this.request<AddSheetResult>({ endpoint: ENTRY, method: 'POST', params });
  }

  /**
   * Export a spreadsheet to xlsx or csv, returning the raw buffer and metadata.
   * Uses a direct fetch instead of request<T>() because the response is binary.
   *
   * @param opts - file_id, export format, optional sheet_name for CSV.
   */
  async exportFile(opts: ExportFileOpts): Promise<ExportFileResult> {
    const sid = await this.authManager.getToken();
    const qs = new URLSearchParams({
      api: API,
      version: '1',
      method: 'export',
      file_id: opts.file_id,
      format: opts.format,
    });
    if (opts.sheet_name !== undefined) qs.set('sheet_name', opts.sheet_name);

    const url = `${this.baseUrl}${ENTRY}?${qs.toString()}`;
    const response = await fetch(url, {
      headers: { Cookie: `id=${sid}` },
    });

    if (!response.ok) {
      throw new Error(`Export failed with HTTP ${response.status}`);
    }

    const disposition = response.headers.get('content-disposition') ?? '';
    const nameMatch = /filename="([^"]+)"/.exec(disposition);
    const file_name = nameMatch?.[1] ?? `export.${opts.format}`;
    const mime_type = response.headers.get('content-type') ?? 'application/octet-stream';

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return { buffer, file_name, mime_type };
  }
}
