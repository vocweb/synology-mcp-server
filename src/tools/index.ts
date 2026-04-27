/**
 * Tool aggregator — combines per-module tool arrays based on feature flags.
 * Only tools for enabled modules are included in the returned array.
 */

import { driveTools } from './drive/index.js';
import { spreadsheetTools } from './spreadsheet/index.js';
import { mailplusTools } from './mailplus/index.js';
import { calendarTools } from './calendar/index.js';
import type { ToolDefinition } from './types.js';
import type { FeatureFlags } from '../types/index.js';

/**
 * Returns the flat list of tool definitions for all enabled feature modules.
 *
 * @param features - Feature flag config; modules with flag=false are excluded.
 * @returns Array of ToolDefinition ready for MCP server registration.
 */
export function aggregateTools(features: FeatureFlags): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  if (features.drive) {
    tools.push(...driveTools);
  }
  if (features.spreadsheet) {
    tools.push(...spreadsheetTools);
  }
  if (features.mailplus) {
    tools.push(...mailplusTools);
  }
  if (features.calendar) {
    tools.push(...calendarTools);
  }

  return tools;
}
