/**
 * Prompt: summarize-spreadsheet
 * Guides the AI to read and summarize spreadsheet content.
 * Per spec §9.
 */

/** Arguments accepted by the summarize-spreadsheet prompt. */
export interface SummarizeSpreadsheetArgs {
  file_id: string;
  sheet_name?: string;
  focus?: string;
}

export const summarizeSpreadsheetPrompt = {
  name: 'summarize-spreadsheet',
  description: 'Summarize the content of a Synology Spreadsheet file, with optional focus area.',
  arguments: [
    {
      name: 'file_id',
      description: 'Drive file ID of the .osheet spreadsheet file.',
      required: true,
    },
    {
      name: 'sheet_name',
      description: 'Name of the sheet to read (defaults to the first sheet).',
      required: false,
    },
    {
      name: 'focus',
      description: 'Specific aspect to focus on, e.g. "sales numbers" or "anomalies".',
      required: false,
    },
  ],
} as const;

/**
 * Builds the prompt messages for summarize-spreadsheet.
 *
 * @param args - Prompt arguments from the MCP client.
 * @returns MCP prompt messages array.
 */
export function buildSummarizeSpreadsheet(args: Record<string, string>): {
  messages: Array<{ role: string; content: { type: string; text: string } }>;
} {
  const fileId = args['file_id'] ?? '';
  const sheetName = args['sheet_name'] ?? 'first sheet';
  const focus = args['focus'];

  const focusLine = focus ? `\n3. Specific insights about: ${focus}` : '';

  const text =
    `Please use the spreadsheet_read_sheet tool to read the spreadsheet with file_id "${fileId}" ` +
    `(sheet: ${sheetName}), then provide:\n` +
    `1. A summary of what the data contains\n` +
    `2. Key statistics (row count, column names, data types)` +
    focusLine;

  return {
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
