/**
 * Prompt: schedule-from-list
 * Guides the AI to read a spreadsheet and create calendar events from each row.
 * Per spec §9.
 */

export const scheduleFromListPrompt = {
  name: 'schedule-from-list',
  description: 'Create calendar events from rows in a Synology Spreadsheet list.',
  arguments: [
    {
      name: 'file_id',
      description: 'Drive file ID of the .osheet spreadsheet file.',
      required: true,
    },
    {
      name: 'sheet_name',
      description: 'Name of the sheet containing the event list.',
      required: true,
    },
    {
      name: 'calendar_id',
      description: 'Target calendar ID where events will be created.',
      required: true,
    },
    {
      name: 'title_column',
      description: 'Column name or letter containing the event title.',
      required: true,
    },
    {
      name: 'date_column',
      description: 'Column name or letter containing the event date/time.',
      required: true,
    },
    {
      name: 'description_column',
      description: 'Optional column name or letter containing the event description.',
      required: false,
    },
  ],
} as const;

/**
 * Builds the prompt messages for schedule-from-list.
 *
 * @param args - Prompt arguments from the MCP client.
 * @returns MCP prompt messages array.
 */
export function buildScheduleFromList(args: Record<string, string>): {
  messages: Array<{ role: string; content: { type: string; text: string } }>;
} {
  const fileId = args['file_id'] ?? '';
  const sheetName = args['sheet_name'] ?? '';
  const calendarId = args['calendar_id'] ?? '';
  const titleColumn = args['title_column'] ?? '';
  const dateColumn = args['date_column'] ?? '';
  const descriptionColumn = args['description_column'];

  const descLine = descriptionColumn
    ? `\n   - Description: from column "${descriptionColumn}"`
    : '';

  const text =
    `Please use the spreadsheet_read_sheet tool to read the spreadsheet with file_id "${fileId}" ` +
    `(sheet: "${sheetName}"), then for each data row:\n` +
    `1. Extract the event details:\n` +
    `   - Title: from column "${titleColumn}"\n` +
    `   - Date/Time: from column "${dateColumn}"` +
    descLine +
    `\n2. Use the calendar_create_event tool to create each event in calendar "${calendarId}"\n` +
    `3. Report a summary of all events created, including any rows that were skipped due to missing or invalid data`;

  return {
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
