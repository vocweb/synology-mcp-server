/**
 * Aggregates all Spreadsheet tool definitions into a single exported array.
 * Import `spreadsheetTools` in the MCP server registration (phase 06).
 */

import { spreadsheetListTool } from './list.js';
import { spreadsheetGetInfoTool } from './get-info.js';
import { spreadsheetReadSheetTool } from './read-sheet.js';
import { spreadsheetWriteCellsTool } from './write-cells.js';
import { spreadsheetAppendRowsTool } from './append-rows.js';
import { spreadsheetCreateTool } from './create.js';
import { spreadsheetAddSheetTool } from './add-sheet.js';
import { spreadsheetExportTool } from './export.js';
import { spreadsheetGetStylesTool } from './get-styles.js';
import { spreadsheetRenameSheetTool } from './rename-sheet.js';
import { spreadsheetDeleteSheetTool } from './delete-sheet.js';
import { spreadsheetBatchUpdateTool } from './batch-update.js';
import type { ToolDefinition } from '../types.js';

/** All 12 Spreadsheet tool definitions, ready for MCP server registration. */
export const spreadsheetTools: ToolDefinition[] = [
  spreadsheetListTool,
  spreadsheetGetInfoTool,
  spreadsheetReadSheetTool,
  spreadsheetWriteCellsTool,
  spreadsheetAppendRowsTool,
  spreadsheetCreateTool,
  spreadsheetAddSheetTool,
  spreadsheetExportTool,
  spreadsheetGetStylesTool,
  spreadsheetRenameSheetTool,
  spreadsheetDeleteSheetTool,
  spreadsheetBatchUpdateTool,
];
