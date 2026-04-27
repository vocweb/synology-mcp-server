/**
 * Aggregates all Calendar tool definitions into a single exported array.
 * Import `calendarTools` in the MCP server registration (phase 06).
 */

import { calendarListCalendarsTool } from './list-calendars.js';
import { calendarListEventsTool } from './list-events.js';
import { calendarGetEventTool } from './get-event.js';
import { calendarCreateEventTool } from './create-event.js';
import { calendarUpdateEventTool } from './update-event.js';
import { calendarDeleteEventTool } from './delete-event.js';
import { calendarCreateCalendarTool } from './create-calendar.js';
import type { ToolDefinition } from '../types.js';

/** All 7 Calendar tool definitions, ready for MCP server registration. */
export const calendarTools: ToolDefinition[] = [
  calendarListCalendarsTool,
  calendarListEventsTool,
  calendarGetEventTool,
  calendarCreateEventTool,
  calendarUpdateEventTool,
  calendarDeleteEventTool,
  calendarCreateCalendarTool,
];
