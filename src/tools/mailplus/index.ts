/**
 * Aggregates all MailPlus tool definitions into a single exported array.
 * Import `mailplusTools` in the MCP server registration (phase 06).
 */

import { mailplusListFoldersTool } from './list-folders.js';
import { mailplusListMessagesTool } from './list-messages.js';
import { mailplusGetMessageTool } from './get-message.js';
import { mailplusSendMessageTool } from './send-message.js';
import { mailplusMarkMessagesTool } from './mark-messages.js';
import { mailplusMoveMessagesTool } from './move-messages.js';
import type { ToolDefinition } from '../types.js';

/** All 6 MailPlus tool definitions, ready for MCP server registration. */
export const mailplusTools: ToolDefinition[] = [
  mailplusListFoldersTool,
  mailplusListMessagesTool,
  mailplusGetMessageTool,
  mailplusSendMessageTool,
  mailplusMarkMessagesTool,
  mailplusMoveMessagesTool,
];
