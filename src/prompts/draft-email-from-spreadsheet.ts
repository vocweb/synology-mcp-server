/**
 * Prompt: draft-email-from-spreadsheet
 * Guides the AI to read a spreadsheet row and draft an email.
 * Per spec §9.
 */

export const draftEmailFromSpreadsheetPrompt = {
  name: 'draft-email-from-spreadsheet',
  description: 'Draft an email using data from a specific row in a Synology Spreadsheet.',
  arguments: [
    {
      name: 'file_id',
      description: 'Drive file ID of the .osheet spreadsheet file.',
      required: true,
    },
    {
      name: 'sheet_name',
      description: 'Name of the sheet containing the row.',
      required: true,
    },
    {
      name: 'row_number',
      description: 'Row number to read data from (1-based).',
      required: true,
    },
    {
      name: 'recipient_column',
      description: 'Column name or letter that contains the recipient email address.',
      required: true,
    },
    {
      name: 'template',
      description: 'Optional email template with {column_name} placeholders.',
      required: false,
    },
  ],
} as const;

/**
 * Builds the prompt messages for draft-email-from-spreadsheet.
 *
 * @param args - Prompt arguments from the MCP client.
 * @returns MCP prompt messages array.
 */
export function buildDraftEmailFromSpreadsheet(args: Record<string, string>): {
  messages: Array<{ role: string; content: { type: string; text: string } }>;
} {
  const fileId = args['file_id'] ?? '';
  const sheetName = args['sheet_name'] ?? '';
  const rowNumber = args['row_number'] ?? '1';
  const recipientColumn = args['recipient_column'] ?? '';
  const template = args['template'];

  const templateLine = template
    ? `\n4. Use this template for the email body (replace {column_name} placeholders with actual values):\n${template}`
    : '';

  const text =
    `Please use the spreadsheet_read_sheet tool to read the spreadsheet with file_id "${fileId}" ` +
    `(sheet: "${sheetName}"), then:\n` +
    `1. Extract the data from row ${rowNumber}\n` +
    `2. Identify the recipient email from the "${recipientColumn}" column\n` +
    `3. Draft a professional email to the recipient using the row data` +
    templateLine;

  return {
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
