/**
 * Helper that resolves a spreadsheet identifier from MCP tool input.
 * Tools accept either `file_id` (alphanumeric Spreadsheet ID, used directly)
 * or `name` + optional `path` (looked up via SpreadsheetIdCache).
 */

import type { SpreadsheetIdCache } from '../cache/spreadsheet-id-cache.js';

export interface SpreadsheetIdResolverInput {
  file_id?: string | undefined;
  name?: string | undefined;
  path?: string | undefined;
}

/**
 * Returns the alphanumeric spreadsheet ID. Prefers `file_id` when provided;
 * otherwise resolves `name` (with optional `path` disambiguator) via the cache.
 *
 * @throws Error when neither file_id nor name is provided.
 * @throws NameNotFoundError / DuplicateNameError on cache lookup failures.
 */
export async function resolveSpreadsheetId(
  input: SpreadsheetIdResolverInput,
  cache: SpreadsheetIdCache,
): Promise<string> {
  if (input.file_id !== undefined && input.file_id !== '') {
    return input.file_id;
  }
  if (input.name === undefined || input.name === '') {
    throw new Error('file_id or name is required');
  }
  return cache.resolveByName(input.name, input.path);
}
