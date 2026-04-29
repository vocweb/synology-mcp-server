/**
 * Persistent name → Spreadsheet alphanumeric ID cache.
 *
 * Synology's REST Spreadsheet API uses alphanumeric IDs (e.g. `rLEyyVwk...`)
 * that have no public mapping back to Drive numeric file_ids. To let users
 * address files by name, we maintain a local JSON cache populated by:
 *   1. `spreadsheet_create` — auto-registers the new file's name → id.
 *   2. `spreadsheet_register` — manual registration for pre-existing files.
 *
 * Cache file path defaults to `./data/spreadsheet-ids.json` (relative to CWD,
 * gitignored). Override via `SYNO_SS_ID_CACHE_PATH`.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface SpreadsheetIdEntry {
  name: string;
  /** Drive path (e.g. `/mydrive/Reports/Sales.osheet`); null when unknown. */
  path: string | null;
  spreadsheetId: string;
  source: 'create' | 'manual';
  registeredAt: string;
}

interface CacheFile {
  version: 1;
  entries: SpreadsheetIdEntry[];
}

export class DuplicateNameError extends Error {
  constructor(public readonly name: string, public readonly candidates: SpreadsheetIdEntry[]) {
    super(
      `Multiple spreadsheets registered with name "${name}". Provide "path" to disambiguate. Candidates: ${candidates
        .map((e) => e.path ?? '(no path)')
        .join(', ')}`,
    );
    this.name = 'DuplicateNameError';
  }
}

export class NameNotFoundError extends Error {
  constructor(public readonly query: string) {
    super(
      `Spreadsheet "${query}" is not registered. Use spreadsheet_register to map a name to a Spreadsheet ID (found in the URL /oo/r/{id}).`,
    );
    this.name = 'NameNotFoundError';
  }
}

export class SpreadsheetIdCache {
  private readonly filePath: string;
  private cache: CacheFile | null = null;

  constructor(filePath?: string) {
    this.filePath =
      filePath ?? process.env['SYNO_SS_ID_CACHE_PATH'] ?? path.resolve(process.cwd(), 'data', 'spreadsheet-ids.json');
  }

  /** Resolve a spreadsheet name (with optional path disambiguator) to its alphanumeric ID. */
  async resolveByName(name: string, drivePath?: string): Promise<string> {
    const data = await this.load();
    const matches = data.entries.filter((e) => e.name === name);
    if (matches.length === 0) {
      throw new NameNotFoundError(name);
    }
    if (matches.length === 1) {
      return matches[0]!.spreadsheetId;
    }
    if (drivePath !== undefined) {
      const exact = matches.find((e) => e.path === drivePath);
      if (exact) return exact.spreadsheetId;
      throw new NameNotFoundError(`${name} @ ${drivePath}`);
    }
    throw new DuplicateNameError(name, matches);
  }

  /** Register a name → spreadsheetId mapping. Updates existing entry by (name, path) tuple. */
  async register(
    name: string,
    drivePath: string | null,
    spreadsheetId: string,
    source: 'create' | 'manual',
  ): Promise<SpreadsheetIdEntry> {
    const data = await this.load();
    const idx = data.entries.findIndex((e) => e.name === name && e.path === drivePath);
    const entry: SpreadsheetIdEntry = {
      name,
      path: drivePath,
      spreadsheetId,
      source,
      registeredAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      data.entries[idx] = entry;
    } else {
      data.entries.push(entry);
    }
    await this.save(data);
    return entry;
  }

  /** List all registered entries. */
  async list(): Promise<SpreadsheetIdEntry[]> {
    const data = await this.load();
    return [...data.entries];
  }

  /** Remove an entry by spreadsheetId. Returns true when an entry was removed. */
  async unregister(spreadsheetId: string): Promise<boolean> {
    const data = await this.load();
    const before = data.entries.length;
    data.entries = data.entries.filter((e) => e.spreadsheetId !== spreadsheetId);
    if (data.entries.length === before) return false;
    await this.save(data);
    return true;
  }

  // ---------------------------------------------------------------------------
  // File IO
  // ---------------------------------------------------------------------------

  private async load(): Promise<CacheFile> {
    if (this.cache !== null) return this.cache;
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as CacheFile;
      if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
        this.cache = { version: 1, entries: [] };
      } else {
        this.cache = parsed;
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cache = { version: 1, entries: [] };
      } else {
        throw err;
      }
    }
    return this.cache;
  }

  private async save(data: CacheFile): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    this.cache = data;
  }
}
