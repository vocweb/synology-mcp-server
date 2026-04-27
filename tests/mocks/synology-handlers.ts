/**
 * MSW request handlers simulating Synology DSM API responses.
 * All SYNO.* endpoints are handled in a single consolidated GET + POST
 * handler to avoid MSW "first match wins" ordering conflicts across
 * handler arrays. Import `driveHandlers` or `allHandlers` in tests.
 */

import { http, HttpResponse } from 'msw';

const ENTRY_CGI = 'http://nas.local:5000/webapi/entry.cgi';

/** Minimal Synology success envelope */
function ok<T>(data: T) {
  return HttpResponse.json({ success: true, data });
}

/** Synology error envelope */
function synoError(code: number) {
  return HttpResponse.json({ success: false, error: { code } });
}

// ---------------------------------------------------------------------------
// MailPlus availability toggle (set false to simulate missing package)
// ---------------------------------------------------------------------------

/** Set to false in tests to simulate MailPlus Server not installed. */
export let mailplusAvailable = true;

/** Toggle MailPlus availability for a test. Restore via afterEach. */
export function setMailplusAvailable(value: boolean): void {
  mailplusAvailable = value;
}

// ---------------------------------------------------------------------------
// Fixture data — must be declared before handler functions that reference them
// ---------------------------------------------------------------------------

const FILE_FIXTURE = {
  file_id: 'file-001',
  name: 'report.osheet',
  path: '/report.osheet',
  display_path: '/mydrive/report.osheet',
  dsm_path: '/volume1/homes/admin/Drive/report.osheet',
  type: 'file' as const,
  content_type: 'application/vnd.synology.spreadsheet',
  size: 2048,
  access_time: 1700000000,
  modified_time: 1700000000,
  created_time: 1699000000,
  owner: { name: 'admin', uid: 1024 },
  shared: false,
  capabilities: {
    can_read: true,
    can_write: true,
    can_delete: true,
    can_organize: true,
  },
  labels: [{ label_id: 'label-1', name: 'Important' }],
};

const FOLDER_FIXTURE = {
  file_id: 'dir-001',
  name: 'projects',
  path: '/projects',
  display_path: '/mydrive/projects',
  type: 'dir' as const,
  content_type: 'dir',
  size: 0,
  access_time: 1700000000,
  modified_time: 1700000000,
  created_time: 1699000000,
  owner: { name: 'admin', uid: 1024 },
  shared: false,
  capabilities: {
    can_read: true,
    can_write: true,
    can_delete: true,
    can_organize: true,
  },
};

const LABEL_FIXTURE = { id: 'label-1', name: 'Important', color: 'red' as const };

const SHEET_INFO_FIXTURE = {
  file_id: 'sheet-001',
  name: 'Budget.osheet',
  sheets: [
    { sheet_id: 's1', name: 'Sheet1', row_count: 10, col_count: 4, hidden: false },
    { sheet_id: 's2', name: 'Summary', row_count: 5, col_count: 2, hidden: false },
  ],
};

const CELL_DATA_FIXTURE = {
  sheet_name: 'Sheet1',
  range: 'A1:D3',
  values: [
    ['Name', 'Age', 'City', 'Score'],
    ['Alice', 30, 'NYC', 95],
    ['Bob', 25, 'LA', 87],
  ],
};

const MAIL_FOLDER_FIXTURE = [
  { id: 'folder-inbox', name: 'INBOX', path: 'INBOX', unread: 3, total: 10, has_children: false },
  { id: 'folder-sent', name: 'Sent', path: 'Sent', unread: 0, total: 5, has_children: false },
];

const MAIL_MESSAGE_FIXTURE = {
  id: 'msg-001',
  subject: 'Hello World',
  from: { name: 'Alice', address: 'alice@example.com' },
  to: [{ name: 'Bob', address: 'bob@example.com' }],
  date: 1700000000,
  size: 1024,
  flags: ['\\Seen'],
  preview: 'This is a preview of the message body.',
};

const MAIL_DETAIL_FIXTURE = {
  id: 'msg-001',
  subject: 'Hello World',
  from: { name: 'Alice', address: 'alice@example.com' },
  to: [{ name: 'Bob', address: 'bob@example.com' }],
  cc: [],
  bcc: [],
  date: 1700000000,
  body_text: 'Hello, this is the message body.',
  body_html: '<p>Hello, this is the message body.</p>',
  attachments: [{ id: 'att-001', name: 'file.txt', mime_type: 'text/plain', size: 100 }],
};

// ---------------------------------------------------------------------------
// Calendar fixture data
// ---------------------------------------------------------------------------

const CALENDAR_FIXTURE = {
  cal_id: 'cal-001',
  name: 'Personal',
  color: '#4A90E2',
  is_owner: true,
  is_shared: false,
  description: 'My personal calendar',
};

const EVENT_FIXTURE = {
  evt_id: 'evt-001',
  cal_id: 'cal-001',
  cal_name: 'Personal',
  title: 'Team Meeting',
  desc: 'Weekly sync',
  location: 'Conference Room A',
  dtstart: 1700000000,
  dtend: 1700003600,
  is_all_day: false,
  rrule: undefined as string | undefined,
  attendee: [{ email: 'alice@example.com', name: 'Alice', status: 'accepted' }],
};

// ---------------------------------------------------------------------------
// Consolidated request handlers
// ---------------------------------------------------------------------------

/**
 * Handles all GET requests to entry.cgi, routing by api + method query params.
 * Consolidated to avoid MSW "first match wins" issues when multiple handler
 * arrays are registered.
 */
function handleGet(request: Request): Response {
  const url = new URL(request.url);
  const api = url.searchParams.get('api');
  const method = url.searchParams.get('method');

  // --- SYNO.SynologyDrive.Files ---
  if (api === 'SYNO.SynologyDrive.Files') {
    if (method === 'list') {
      return ok({ total: 2, items: [FILE_FIXTURE, FOLDER_FIXTURE] });
    }
    if (method === 'get') {
      const path = url.searchParams.get('path');
      if (path === '/mydrive/notfound') return synoError(408);
      return ok({ ...FILE_FIXTURE, labels: [{ label_id: 'label-1', name: 'Important' }] });
    }
    if (method === 'search') {
      return ok({ total: 1, items: [FILE_FIXTURE] });
    }
    if (method === 'download') {
      const path = url.searchParams.get('path');
      if (path === '/mydrive/notfound') {
        return HttpResponse.json({ success: false, error: { code: 408 } });
      }
      const buf = Buffer.from('hello');
      return new HttpResponse(buf, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="report.osheet"',
        },
      });
    }
    if (method === 'list_labels') {
      return ok({ labels: [LABEL_FIXTURE] });
    }
  }

  // --- SYNO.Office.Sheet.Snapshot ---
  if (api === 'SYNO.Office.Sheet.Snapshot') {
    if (method === 'get_info') {
      const file_id = url.searchParams.get('file_id');
      if (file_id === 'not-found') return synoError(408);
      return ok(SHEET_INFO_FIXTURE);
    }
    if (method === 'get_cells') {
      const file_id = url.searchParams.get('file_id');
      if (file_id === 'not-found') return synoError(408);
      return ok(CELL_DATA_FIXTURE);
    }
  }

  // --- SYNO.Office.Export ---
  if (api === 'SYNO.Office.Export' && method === 'export') {
    const file_id = url.searchParams.get('file_id');
    // HTTP 404 so exportFile sees response.ok=false and throws
    if (file_id === 'not-found') return new HttpResponse(null, { status: 404 });
    const buf = Buffer.from('PK mock xlsx content');
    return new HttpResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Budget.xlsx"',
      },
    });
  }

  // --- SYNO.API.Info (MailPlus availability probe) ---
  if (api === 'SYNO.API.Info' && method === 'query') {
    if (!mailplusAvailable) {
      return ok({});
    }
    return ok({
      'SYNO.MailClient.Mailbox': { path: 'entry.cgi', minVersion: 1, maxVersion: 1 },
      'SYNO.MailClient.Message': { path: 'entry.cgi', minVersion: 1, maxVersion: 1 },
      'SYNO.MailClient.Draft': { path: 'entry.cgi', minVersion: 1, maxVersion: 1 },
      'SYNO.MailClient.Attachment': { path: 'entry.cgi', minVersion: 1, maxVersion: 1 },
    });
  }

  // --- SYNO.MailClient.Mailbox ---
  if (api === 'SYNO.MailClient.Mailbox' && method === 'list') {
    return ok(MAIL_FOLDER_FIXTURE);
  }

  // --- SYNO.MailClient.Message ---
  if (api === 'SYNO.MailClient.Message') {
    if (method === 'list') {
      return ok({ total: 1, messages: [MAIL_MESSAGE_FIXTURE] });
    }
    if (method === 'get') {
      const messageId = url.searchParams.get('message_id');
      if (messageId === 'not-found') return synoError(408);
      return ok(MAIL_DETAIL_FIXTURE);
    }
  }

  // --- SYNO.MailClient.Attachment ---
  if (api === 'SYNO.MailClient.Attachment' && method === 'get') {
    const buf = Buffer.from('attachment content');
    return new HttpResponse(buf, {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  }

  // --- SYNO.Cal.Cal ---
  if (api === 'SYNO.Cal.Cal' && method === 'list') {
    return ok([CALENDAR_FIXTURE]);
  }

  // --- SYNO.Cal.Event ---
  if (api === 'SYNO.Cal.Event') {
    if (method === 'list') {
      return ok({ total: 1, events: [EVENT_FIXTURE] });
    }
    if (method === 'get') {
      const evtId = url.searchParams.get('evt_id');
      if (evtId === 'not-found') return synoError(408);
      return ok(EVENT_FIXTURE);
    }
  }

  return synoError(103); // unknown api/method fallback
}

/**
 * Handles all POST requests to entry.cgi, routing by api + method query params.
 */
function handlePost(request: Request): Response {
  const url = new URL(request.url);
  const api = url.searchParams.get('api');
  const method = url.searchParams.get('method');

  // --- SYNO.SynologyDrive.Files ---
  if (api === 'SYNO.SynologyDrive.Files') {
    if (method === 'upload') {
      return ok({ file_id: 'new-file-001', path: '/mydrive/uploads/test.txt', name: 'test.txt' });
    }
    if (method === 'create_folder') {
      return ok({ id: 'dir-new', path: '/mydrive/projects/new-folder' });
    }
    if (method === 'move') {
      const path = url.searchParams.get('path');
      if (path === '/mydrive/notfound') return synoError(408);
      return ok({ path: '/mydrive/dest/report.osheet' });
    }
    if (method === 'delete') {
      const path = url.searchParams.get('path');
      if (path === '/mydrive/notfound') return synoError(408);
      return ok({});
    }
    if (method === 'add_label') return ok({});
  }

  // --- SYNO.SynologyDrive.Sharing ---
  if (api === 'SYNO.SynologyDrive.Sharing' && method === 'create') {
    return ok({ link: 'https://nas.local/d/abc123', permission: 'view', expire_time: null });
  }

  // --- SYNO.Office.Sheet.Snapshot ---
  if (api === 'SYNO.Office.Sheet.Snapshot') {
    if (method === 'set_cells') {
      const file_id = url.searchParams.get('file_id');
      if (file_id === 'not-found') return synoError(408);
      return ok({});
    }
    if (method === 'create') {
      return ok({ file_id: 'new-sheet-001', file_path: '/mydrive/NewSheet.osheet' });
    }
    if (method === 'add_sheet') {
      const file_id = url.searchParams.get('file_id');
      if (file_id === 'not-found') return synoError(408);
      return ok({ success: true, sheet_id: 'new-sheet-tab-001' });
    }
  }

  // --- SYNO.MailClient.Message (mark / move) ---
  if (api === 'SYNO.MailClient.Message') {
    if (method === 'mark') return ok({});
    if (method === 'move') return ok({});
  }

  // --- SYNO.MailClient.Draft ---
  if (api === 'SYNO.MailClient.Draft' && method === 'send') {
    return ok({ message_id: 'sent-msg-001', sent_at: 1700001000 });
  }

  // --- SYNO.Cal.Event (mutations) ---
  if (api === 'SYNO.Cal.Event') {
    if (method === 'create') {
      return ok({ evt_id: 'evt-new-001', cal_id: url.searchParams.get('cal_id') ?? 'cal-001' });
    }
    if (method === 'edit') {
      return ok({
        evt_id: url.searchParams.get('evt_id') ?? 'evt-001',
        cal_id: url.searchParams.get('cal_id') ?? 'cal-001',
      });
    }
    if (method === 'delete') {
      return ok({});
    }
  }

  // --- SYNO.Cal.Cal (create) ---
  if (api === 'SYNO.Cal.Cal' && method === 'create') {
    return ok({ cal_id: 'cal-new-001' });
  }

  return synoError(103);
}

// ---------------------------------------------------------------------------
// Spreadsheet API v3.7+ REST handlers
// ---------------------------------------------------------------------------

/** Spreadsheet API auth handler */
const spreadsheetAuthHandler = http.post('http://nas.local:3000/spreadsheets/authorize', () => {
  return HttpResponse.json({
    access_token: 'test-jwt-token-xyz',
    token_type: 'Bearer',
    expires_in: 2419200, // 28 days
  });
});

/** Spreadsheet API getInfo handler */
const spreadsheetGetInfoHandler = http.get('http://nas.local:3000/spreadsheets/:id', ({ params }) => {
  const id = params.id as string;
  if (id === 'sheet-001' || id === 'file123') {
    return HttpResponse.json({
      id,
      name: 'Budget.osheet',
      sheets: [
        { sheetId: 's1', name: 'Sheet1', rowCount: 10, columnCount: 4, isHidden: false },
        { sheetId: 's2', name: 'Summary', rowCount: 5, columnCount: 2, isHidden: false },
      ],
      createdTime: 1700000000,
      modifiedTime: 1700000000,
    });
  }
  return HttpResponse.json({ error: 'Not found' }, { status: 404 });
});

/** Spreadsheet API getCells handler */
const spreadsheetGetCellsHandler = http.get('http://nas.local:3000/spreadsheets/:id/values/:range', ({ params }) => {
  if (params.id === 'not-found') {
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return HttpResponse.json({
    sheet: 'Sheet1',
    range: 'A1:D3',
    values: [
      ['Name', 'Age', 'City', 'Score'],
      ['Alice', 30, 'NYC', 95],
      ['Bob', 25, 'LA', 87],
    ],
  });
});

/** Spreadsheet API setCells handler */
const spreadsheetSetCellsHandler = http.put('http://nas.local:3000/spreadsheets/:id/values/:range', ({ params }) => {
  if (params.id === 'not-found') {
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return HttpResponse.json({});
});

/** Spreadsheet API appendRows handler */
const spreadsheetAppendRowsHandler = http.put(
  'http://nas.local:3000/spreadsheets/:id/values/:range/append',
  ({ params }) => {
    if (params.id === 'not-found') {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({
      updatedRows: 2,
      updatedColumns: 4,
      updatedCells: 8,
    });
  },
);

/** Spreadsheet API create handler */
const spreadsheetCreateHandler = http.post('http://nas.local:3000/spreadsheets/create', () => {
  return HttpResponse.json({
    id: 'new-sheet-001',
    filePath: '/mydrive/NewSheet.osheet',
  });
});

/** Spreadsheet API addSheet handler */
const spreadsheetAddSheetHandler = http.post(
  'http://nas.local:3000/spreadsheets/:id/sheet/add',
  ({ params }) => {
    if (params.id === 'not-found') {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({
      sheetId: 'new-sheet-tab-001',
      index: 1,
    });
  },
);

/** Spreadsheet API export (XLSX) handler */
const spreadsheetExportXlsxHandler = http.get('http://nas.local:3000/spreadsheets/:id/xlsx', ({ params }) => {
  if (params.id === 'not-found') {
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const buffer = Buffer.from('PK\x03\x04'); // Minimal ZIP header
  return HttpResponse.arrayBuffer(buffer, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': 'attachment; filename="Budget.xlsx"',
    },
  });
});

/** Spreadsheet API export (CSV) handler */
const spreadsheetExportCsvHandler = http.get('http://nas.local:3000/spreadsheets/:id/sheet/csv', ({ params }) => {
  if (params.id === 'not-found') {
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const csv = 'Name,Age,City,Score\nAlice,30,NYC,95\nBob,25,LA,87';
  return HttpResponse.text(csv, {
    headers: {
      'content-type': 'text/csv',
      'content-disposition': 'attachment; filename="data.csv"',
    },
  });
});

/** Spreadsheet API getStyles handler */
const spreadsheetGetStylesHandler = http.get(
  'http://nas.local:3000/spreadsheets/:id/styles/:range',
  () => {
    return HttpResponse.json({
      sheet: 'Sheet1',
      range: 'A1:B2',
      styles: [
        [
          { fontName: 'Arial', fontSize: 12, fontWeight: 700, italic: false },
          { fontName: 'Arial', fontSize: 12, fontWeight: 400, italic: false },
        ],
        [
          { fontName: 'Arial', fontSize: 11, fontWeight: 400, italic: false },
          { fontName: 'Arial', fontSize: 11, fontWeight: 400, italic: false },
        ],
      ],
    });
  },
);

/** Spreadsheet API renameSheet handler */
const spreadsheetRenameSheetHandler = http.post(
  'http://nas.local:3000/spreadsheets/:id/sheet/rename',
  () => {
    return HttpResponse.json({});
  },
);

/** Spreadsheet API deleteSheet handler */
const spreadsheetDeleteSheetHandler = http.post(
  'http://nas.local:3000/spreadsheets/:id/sheet/delete',
  () => {
    return HttpResponse.json({});
  },
);

/** Spreadsheet API batchUpdate handler */
const spreadsheetBatchUpdateHandler = http.post(
  'http://nas.local:3000/spreadsheets/:id/batchUpdate',
  () => {
    return HttpResponse.json({});
  },
);

/** All Spreadsheet API v3.7+ handlers */
const spreadsheetHandlers = [
  spreadsheetAuthHandler,
  spreadsheetGetInfoHandler,
  spreadsheetGetCellsHandler,
  spreadsheetSetCellsHandler,
  spreadsheetAppendRowsHandler,
  spreadsheetCreateHandler,
  spreadsheetAddSheetHandler,
  spreadsheetExportXlsxHandler,
  spreadsheetExportCsvHandler,
  spreadsheetGetStylesHandler,
  spreadsheetRenameSheetHandler,
  spreadsheetDeleteSheetHandler,
  spreadsheetBatchUpdateHandler,
];

// ---------------------------------------------------------------------------
// Exported handler arrays
// ---------------------------------------------------------------------------

/**
 * All Synology API handlers for entry.cgi in a single GET + POST pair.
 * Named `driveHandlers` for backward compatibility with existing test imports.
 */
export const driveHandlers = [
  http.get(ENTRY_CGI, ({ request }) => handleGet(request)),
  http.post(ENTRY_CGI, ({ request }) => handlePost(request)),
];

/** Auth handlers used to bootstrap test clients that need a valid sid. */
export const authHandlers = [
  http.post('http://nas.local:5000/webapi/auth.cgi', () => {
    return HttpResponse.json({ success: true, data: { sid: 'test-sid-abc' } });
  }),
];

/** All handlers combined — use in setupServer(...allHandlers) for full coverage. */
export const allHandlers = [...authHandlers, ...driveHandlers, ...spreadsheetHandlers];
