/**
 * Bidirectional conversion between ISO 8601 strings and Unix seconds.
 * Used by Calendar tools to bridge MCP ISO input/output and Synology unix-second storage.
 *
 * Timezone semantics:
 * - ISO strings WITH offset (Z or ±HH:MM) are converted at face value.
 * - ISO strings WITHOUT offset (e.g. "2024-03-15T09:00:00") are interpreted as NAS
 *   local time (i.e. the JS process timezone, which should match the NAS timezone).
 * - Date-only strings ("YYYY-MM-DD") are treated as midnight local time (00:00:00).
 */

/**
 * Convert an ISO 8601 string to Unix seconds (integer).
 *
 * Accepts:
 * - Date-only: `"2024-03-15"` → midnight local time
 * - Local datetime: `"2024-03-15T09:00:00"` → local time
 * - UTC datetime: `"2024-03-15T09:00:00Z"` → UTC
 * - Offset datetime: `"2024-03-15T09:00:00+05:30"` → exact moment
 *
 * @param iso - ISO 8601 date or datetime string.
 * @returns Unix timestamp in whole seconds.
 * @throws {Error} When the string cannot be parsed as a valid date.
 */
export function isoToUnixSeconds(iso: string): number {
  // Date-only: treat as midnight LOCAL time by appending T00:00:00 (no Z)
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso;

  const ms = Date.parse(normalized);
  if (isNaN(ms)) {
    throw new Error(`Invalid ISO 8601 date string: "${iso}"`);
  }

  return Math.floor(ms / 1000);
}

/**
 * Convert Unix seconds to an ISO 8601 string in UTC.
 *
 * @param seconds - Unix timestamp in seconds.
 * @returns ISO 8601 string with Z suffix, e.g. `"2024-03-15T09:00:00.000Z"`.
 */
export function unixSecondsToIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}
