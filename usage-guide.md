# Usage Guide

Sample natural-language prompts for invoking each **synology-office-mcp** tool from an MCP-aware agent (Claude Code / Claude Desktop / Cursor / etc.). The agent maps these prompts to the underlying tool calls listed in [`tool-reference.md`](./tool-reference.md) — you do not have to name the tool yourself.

> **Confirm pattern:** prompts that trigger destructive or write actions (move, delete, send mail, write cells, …) need an explicit confirmation. The agent will ask before submitting `confirm: true`. Reply "yes, confirm" (or similar) to proceed.

---

## Drive

### `drive_list_files`
- "List the files in `/mydrive/Reports` sorted by modified date, newest first."
- "Show the first 50 items under `/team-folders/Finance/2026/Q1`."
- "List only `.osheet` files in `/mydrive/Budget`."

### `drive_search_files`
- "Search Drive for files containing `quarterly forecast`."
- "Find every document with `invoice` in the name modified this month."

### `drive_get_file_info`
- "Get metadata for `/mydrive/Reports/Q1.osheet` — size, owner, last modified."
- "Who owns the folder `/team-folders/Legal/Contracts`?"

### `drive_download_file`
- "Download `/mydrive/Reports/summary.pdf` and return it as base64."
- "Fetch the contents of `/mydrive/notes/meeting.md` so I can read it."

### `drive_upload_file`
- "Upload this base64 PDF to `/mydrive/Reports/2026-Q1.pdf`."
- "Save the attached CSV at `/mydrive/Imports/leads.csv`, create the folder if missing."

### `drive_create_folder`
- "Create a folder `/mydrive/Reports/2026-Q2`."
- "Make a new folder `Archive/Old` under `/team-folders/Engineering`."

### `drive_move_file` *(confirm)*
- "Move `/mydrive/draft.osheet` to `/mydrive/Reports/Q1-final.osheet`."
- "Rename `/mydrive/notes/old.md` to `/mydrive/notes/2026-archive.md`."

### `drive_delete_file` *(confirm)*
- "Delete `/mydrive/tmp/scratch.txt` permanently."
- "Remove the empty folder `/mydrive/old-drafts`."

### `drive_get_sharing_link`
- "Generate a public sharing link for `/mydrive/Reports/Q1.osheet`."
- "Create a password-protected share for `/team-folders/Finance/2026/budget.osheet`."

### `drive_list_labels`
- "List every Drive label I have access to."

### `drive_add_label`
- "Tag the file with id `12345` using the `Confidential` label (id `7`)."

---

## Spreadsheet

> Most tools accept either `file_id` (the alphanumeric ID from the URL `/oo/r/{id}`) or a `name` previously bound via `spreadsheet_register`.

### `spreadsheet_list`
- "List `.osheet` files in Drive, 50 per page."

### `spreadsheet_register`
- "Register the spreadsheet at `https://nas/.../oo/r/aB3xYz` as `Q1-Budget` so I can refer to it by name."

### `spreadsheet_get_info`
- "How many sheets does `Q1-Budget` have, and what are the row/column counts?"
- "Get metadata for spreadsheet id `aB3xYz`."

### `spreadsheet_read_sheet`
- "Read cells `A1:D20` from sheet `Summary` in `Q1-Budget`."
- "Show the entire `Forecast` sheet of spreadsheet id `aB3xYz`."

### `spreadsheet_get_styles`
- "Get the cell styling for range `A1:F1` on sheet `Summary` of `Q1-Budget` — fonts, colors, alignment, number formats."

### `spreadsheet_write_cells` *(confirm)*
- "Write the values `[['Name','Total'],['Alice',1200]]` into `A1:B2` of sheet `Summary` in `Q1-Budget`."

### `spreadsheet_append_rows` *(confirm)*
- "Append these rows to the `Leads` sheet of `Q1-Budget`: …"

### `spreadsheet_batch_update` *(confirm)*
- "Insert 3 rows starting at index 5 in sheet `Summary` of `Q1-Budget`."
- "Delete columns 4-6 from sheet `Forecast`."

### `spreadsheet_add_sheet`
- "Add a new sheet called `2026-Q2` to `Q1-Budget`."

### `spreadsheet_rename_sheet` *(confirm)*
- "Rename sheet `Sheet3` to `Backlog` in `Q1-Budget`."

### `spreadsheet_delete_sheet` *(confirm)*
- "Delete the sheet with id `7` from `Q1-Budget` — I know it cannot be undone."

### `spreadsheet_create`
- "Create a blank spreadsheet at `/mydrive/Reports/2026-Q2-budget.osheet`."

### `spreadsheet_export`
- "Export `Q1-Budget` as XLSX and return base64."
- "Export sheet `Summary` of spreadsheet id `aB3xYz` as CSV."

---

## MailPlus

### `mailplus_list_folders`
- "List my MailPlus folders, including custom ones."

### `mailplus_list_messages`
- "Show unread messages in `Inbox` from the last 7 days."
- "List the 30 most recent messages in `Sent`."

### `mailplus_get_message`
- "Open message id `4821` and show body + attachment list."

### `mailplus_send_message` *(confirm)*
- "Send an email to `alice@example.com` cc `bob@example.com` with subject `Q1 report` and attach the PDF I just downloaded."
- "Reply to message id `4821` with: `Thanks, will review tomorrow.`"

### `mailplus_move_messages` *(confirm)*
- "Move messages `[101, 102, 103]` to folder `Archive/2026`."

### `mailplus_mark_messages`
- "Mark messages `[201, 202]` as read."
- "Mark message id `301` as unread."

---

## Calendar

### `calendar_list_calendars`
- "List every calendar I can access on the NAS."

### `calendar_list_events`
- "List events between `2026-05-01` and `2026-05-07` across all calendars."
- "Show events on calendar id `personal` for next week."

### `calendar_get_event`
- "Get full details for event id `evt_998` on calendar id `work`."

### `calendar_create_calendar`
- "Create a personal calendar called `Side Projects` with a blue color."

### `calendar_create_event` *(confirm)*
- "Create an event on calendar `work`: title `Sprint planning`, on `2026-05-04` from `10:00` to `11:00`, with a 10-minute reminder."
- "Schedule a recurring weekly all-day event `Team retro` on calendar `work` every Friday."

### `calendar_update_event` *(confirm)*
- "Move event id `evt_998` to `2026-05-06 14:00` and change the title to `Sprint planning (rescheduled)`."

### `calendar_delete_event` *(confirm)*
- "Delete event id `evt_998` from calendar `work`."

---

## Composite workflows

Combine tools in a single prompt — the agent will chain them automatically.

- "Find every `.osheet` file in `/mydrive/Reports` modified this week, export each to XLSX, and email them to `team@example.com`."
- "List unread messages in `Inbox`, summarize them, and drop the summary as a new sheet `2026-05-Inbox-Digest` in spreadsheet `Q1-Budget`."
- "From calendar `work`, list every event next week and create a Drive document `/mydrive/Reports/weekly-agenda.md` with the agenda."
- "Search Drive for `invoice 2026`, label every match with `Finance`, and reply to message id `4821` listing the file paths."

---

## Tips

- **Refer to spreadsheets by name** after `spreadsheet_register` — easier than passing IDs around.
- **Always provide absolute Drive paths** (start with `/mydrive/...` or `/team-folders/...`).
- **Use ISO 8601** for all date/time inputs — `2026-05-04` or `2026-05-04T10:00:00`.
- **Pagination** — `limit` (default 100, max 1000) and `offset` work on every list tool.
- **Confirm replies** — when the agent asks to confirm a destructive action, a short "yes" is enough; the tool layer enforces `confirm: true`.

---

## Related documentation

- [`tool-reference.md`](./tool-reference.md) — full tool schemas, confirm-required column.
- [`integration-guide.md`](./integration-guide.md) — wiring the server into MCP-aware clients.
- [`troubleshooting.md`](./troubleshooting.md) — Synology error codes + fixes.
