# Tool Reference

All 37 MCP tools exposed by synology-office-mcp.

`confirm` column: tools marked **yes** require `"confirm": true` in the input or they return an error without performing the action.

---

## Drive (11 tools)

| Tool | Confirm | Summary |
|---|---|---|
| `drive_list_files` | no | List files and folders in a Synology Drive path with pagination, sorting, and glob filtering |
| `drive_search_files` | no | Full-text search across Drive files; returns name, path, modified date, size |
| `drive_get_file_info` | no | Get metadata (size, owner, MIME type, modified date) for a single file or folder |
| `drive_download_file` | no | Download file content as base64-encoded string; use for files ≤ 50 MB |
| `drive_upload_file` | no | Upload base64-encoded content to a path; creates parent folders as needed |
| `drive_create_folder` | no | Create a new folder at the specified path |
| `drive_move_file` | **yes** | Move or rename a file or folder to a new path |
| `drive_delete_file` | **yes** | Permanently delete a file or folder |
| `drive_get_sharing_link` | no | Generate a sharing link for a file (public or password-protected) |
| `drive_list_labels` | no | List all Drive labels available to the authenticated user |
| `drive_add_label` | no | Apply a label to a file by file ID and label ID |

---

## Spreadsheet (13 tools)

Most spreadsheet tools accept either `file_id` or a previously registered `name` (see `spreadsheet_register`).

| Tool | Confirm | Summary |
|---|---|---|
| `spreadsheet_list` | no | List `.osheet` files in Drive with pagination |
| `spreadsheet_register` | no | Register a spreadsheet by alphanumeric ID (from URL `/oo/r/{id}`) under a display name for reuse in other tools |
| `spreadsheet_get_info` | no | Get spreadsheet metadata: sheet names, row/column counts, last modified |
| `spreadsheet_read_sheet` | no | Read cell values from a named sheet; supports A1 range notation |
| `spreadsheet_get_styles` | no | Get cell styling (fonts, colors, alignment, number formats) for a range |
| `spreadsheet_write_cells` | **yes** | Write values to a cell range; overwrites existing content |
| `spreadsheet_append_rows` | **yes** | Append rows of values to the end of a sheet |
| `spreadsheet_batch_update` | **yes** | Insert or delete rows/columns at a given index |
| `spreadsheet_add_sheet` | no | Add a new sheet tab to an existing spreadsheet |
| `spreadsheet_rename_sheet` | **yes** | Rename a sheet tab |
| `spreadsheet_delete_sheet` | **yes** | Permanently delete a sheet tab (cannot be undone) |
| `spreadsheet_create` | no | Create a new blank spreadsheet at a given Drive path |
| `spreadsheet_export` | no | Export spreadsheet to XLSX or CSV; returns base64-encoded file content |

---

## MailPlus (6 tools)

| Tool | Confirm | Summary |
|---|---|---|
| `mailplus_list_folders` | no | List all mail folders (Inbox, Sent, custom folders) for the authenticated user |
| `mailplus_list_messages` | no | List messages in a folder with pagination, unread filter, and date range |
| `mailplus_get_message` | no | Get full message content including body and attachment metadata |
| `mailplus_send_message` | **yes** | Send an email; supports To/Cc/Bcc, plain text or HTML body, reply-to |
| `mailplus_move_messages` | **yes** | Move one or more messages to a target folder by message ID list |
| `mailplus_mark_messages` | no | Mark messages as read or unread |

---

## Calendar (7 tools)

| Tool | Confirm | Summary |
|---|---|---|
| `calendar_list_calendars` | no | List all calendars accessible to the authenticated user |
| `calendar_list_events` | no | List events in a date range across one or all calendars |
| `calendar_get_event` | no | Get full event details by calendar ID and event ID |
| `calendar_create_calendar` | no | Create a new personal calendar with name and optional color |
| `calendar_create_event` | **yes** | Create a calendar event; supports recurrence, all-day, and reminders |
| `calendar_update_event` | **yes** | Update an existing event's fields (title, time, description, etc.) |
| `calendar_delete_event` | **yes** | Delete an event by calendar ID and event ID |

---

## Input conventions

- All path inputs for Drive tools are absolute Drive paths, e.g. `/mydrive/Reports/Q1.osheet` or `/team-folders/Finance`.
- Date/time fields use ISO 8601: `"2026-04-26"` or `"2026-04-26T09:00:00"`.
- Pagination: most list tools accept `limit` (default 100, max 1000) and `offset`.
- Confirm pattern: `{ ..., "confirm": true }` — the field must be `true` (boolean), not the string `"true"`.

## Resources

| URI | Description |
|---|---|
| `drive://files` | Drive file tree rooted at `/mydrive` |
| `mailplus://folders` | MailPlus folder list |
| `calendar://calendars` | Calendar list |

## Prompts

| Name | Description |
|---|---|
| `summarize_drive_folder` | Summarize contents of a Drive folder |
| `draft_email` | Draft an email from a subject and bullet points |
| `weekly_agenda` | Generate a weekly agenda from calendar events |
