/**
 * Aggregates all Drive tool definitions into a single exported array.
 * Import `driveTools` in the MCP server registration (phase 06).
 */

import { listFilesTool } from './list-files.js';
import { getFileInfoTool } from './get-file-info.js';
import { searchFilesTool } from './search-files.js';
import { uploadFileTool } from './upload-file.js';
import { downloadFileTool } from './download-file.js';
import { createFolderTool } from './create-folder.js';
import { moveFileTool } from './move-file.js';
import { deleteFileTool } from './delete-file.js';
import { listLabelsTool } from './list-labels.js';
import { addLabelTool } from './add-label.js';
import { getSharingLinkTool } from './get-sharing-link.js';
import type { ToolDefinition } from '../types.js';

/** All 11 Drive tool definitions, ready for MCP server registration. */
export const driveTools: ToolDefinition[] = [
  listFilesTool,
  getFileInfoTool,
  searchFilesTool,
  uploadFileTool,
  downloadFileTool,
  createFolderTool,
  moveFileTool,
  deleteFileTool,
  listLabelsTool,
  addLabelTool,
  getSharingLinkTool,
];
