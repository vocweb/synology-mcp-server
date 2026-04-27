/**
 * MCP Resources registry.
 * Exports list() and read(uri, ctx) delegating to per-pattern handlers.
 *
 * Supported URI patterns (spec §8):
 *   syno://drive/files/{path}
 *   syno://drive/folder/{path}
 *   syno://spreadsheet/{file_id}/info
 *   syno://spreadsheet/{file_id}/{sheet_name}
 *   syno://calendar/list
 *   syno://calendar/{cal_id}/today
 *   syno://calendar/{cal_id}/week
 */

import type { ToolContext } from '../tools/types.js';
import { handleDriveFiles } from './handlers/drive-files.js';
import { handleDriveFolder } from './handlers/drive-folder.js';
import { handleSpreadsheetInfo } from './handlers/spreadsheet-info.js';
import { handleSpreadsheetSheet } from './handlers/spreadsheet-sheet.js';
import { handleCalendarList } from './handlers/calendar-list.js';
import { handleCalendarToday } from './handlers/calendar-today.js';
import { handleCalendarWeek } from './handlers/calendar-week.js';

/** MCP Resource descriptor returned by list(). */
export interface ResourceDescriptor {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/** MCP Resource content returned by read(). */
export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

/** Static resource list — clients use these as entry points. */
const STATIC_RESOURCES: ResourceDescriptor[] = [
  {
    uri: 'syno://drive/files//mydrive',
    name: 'Drive files at /mydrive',
    description: 'File metadata at the /mydrive root path. Replace path segment as needed.',
    mimeType: 'application/json',
  },
  {
    uri: 'syno://drive/folder//mydrive',
    name: 'Drive folder listing at /mydrive',
    description: 'Lists files inside /mydrive. Replace path segment for other folders.',
    mimeType: 'application/json',
  },
  {
    uri: 'syno://calendar/list',
    name: 'All calendars',
    description: 'Lists all calendars accessible to the authenticated user.',
    mimeType: 'application/json',
  },
];

/**
 * Returns the static list of known resource URIs.
 * Clients may also construct dynamic URIs using the patterns in §8.
 */
export function list(): { resources: ResourceDescriptor[] } {
  return { resources: STATIC_RESOURCES };
}

/**
 * Reads a resource by URI and returns its content.
 *
 * @param uri - Resource URI matching one of the syno:// patterns.
 * @param ctx - Tool context carrying authenticated clients.
 * @returns MCP resource content envelope.
 * @throws Error when the URI pattern is not recognised.
 */
export async function read(
  uri: string,
  ctx: ToolContext,
): Promise<{ contents: ResourceContent[] }> {
  let content: ResourceContent;

  if (uri.startsWith('syno://drive/files/')) {
    content = await handleDriveFiles(uri, ctx.driveClient);
  } else if (uri.startsWith('syno://drive/folder/')) {
    content = await handleDriveFolder(uri, ctx.driveClient);
  } else if (/^syno:\/\/spreadsheet\/[^/]+\/info$/.test(uri)) {
    content = await handleSpreadsheetInfo(uri, ctx.spreadsheetClient);
  } else if (/^syno:\/\/spreadsheet\/[^/]+\/[^/]+$/.test(uri)) {
    content = await handleSpreadsheetSheet(uri, ctx.spreadsheetClient);
  } else if (uri === 'syno://calendar/list') {
    content = await handleCalendarList(uri, ctx.calendarClient);
  } else if (/^syno:\/\/calendar\/[^/]+\/today$/.test(uri)) {
    content = await handleCalendarToday(uri, ctx.calendarClient);
  } else if (/^syno:\/\/calendar\/[^/]+\/week$/.test(uri)) {
    content = await handleCalendarWeek(uri, ctx.calendarClient);
  } else {
    throw new Error(`Unsupported resource URI: ${uri}`);
  }

  return { contents: [content] };
}
