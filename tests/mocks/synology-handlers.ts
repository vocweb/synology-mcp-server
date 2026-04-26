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
  id: 'file-001',
  name: 'report.osheet',
  path: '/mydrive/report.osheet',
  real_path: '/volume1/homes/admin/Drive/report.osheet',
  type: 'file' as const,
  size: 2048,
  additional: {
    owner: { user: 'admin' },
    time: { atime: 1700000000, ctime: 1700000000, crtime: 1699000000, mtime: 1700000000 },
    perm: {
      acl: { append: true, del: true, exec: false, read: true, write: true },
      is_owner: true,
    },
  },
};

const FOLDER_FIXTURE = {
  id: 'dir-001',
  name: 'projects',
  path: '/mydrive/projects',
  type: 'dir' as const,
  size: 0,
  additional: {
    owner: { user: 'admin' },
    time: { atime: 1700000000, ctime: 1700000000, crtime: 1699000000, mtime: 1700000000 },
    perm: {
      acl: { append: true, del: true, exec: false, read: true, write: true },
      is_owner: true,
    },
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

  // --- SYNO.Drive.Files ---
  if (api === 'SYNO.Drive.Files') {
    if (method === 'list') {
      return ok({ total: 2, offset: 0, files: [FILE_FIXTURE, FOLDER_FIXTURE] });
    }
    if (method === 'get') {
      const path = url.searchParams.get('path');
      if (path === '/mydrive/notfound') return synoError(408);
      return ok({ ...FILE_FIXTURE, labels: ['Important'] });
    }
    if (method === 'search') {
      return ok({ total: 1, offset: 0, files: [FILE_FIXTURE] });
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

  // --- SYNO.Spreadsheet ---
  if (api === 'SYNO.Spreadsheet') {
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
    if (method === 'export') {
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
  }

  // --- SYNO.API.Info (MailPlus availability probe) ---
  if (api === 'SYNO.API.Info' && method === 'query') {
    if (!mailplusAvailable) {
      return ok({});
    }
    return ok({
      'SYNO.MailPlus.Folder': { path: 'entry.cgi', minVersion: 1, maxVersion: 1 },
      'SYNO.MailPlus.Message': { path: 'entry.cgi', minVersion: 1, maxVersion: 1 },
      'SYNO.MailPlus.Compose': { path: 'entry.cgi', minVersion: 1, maxVersion: 1 },
      'SYNO.MailPlus.Attachment': { path: 'entry.cgi', minVersion: 1, maxVersion: 1 },
    });
  }

  // --- SYNO.MailPlus.Folder ---
  if (api === 'SYNO.MailPlus.Folder' && method === 'list') {
    return ok(MAIL_FOLDER_FIXTURE);
  }

  // --- SYNO.MailPlus.Message ---
  if (api === 'SYNO.MailPlus.Message') {
    if (method === 'list') {
      return ok({ total: 1, messages: [MAIL_MESSAGE_FIXTURE] });
    }
    if (method === 'get') {
      const messageId = url.searchParams.get('message_id');
      if (messageId === 'not-found') return synoError(408);
      return ok(MAIL_DETAIL_FIXTURE);
    }
  }

  // --- SYNO.MailPlus.Attachment ---
  if (api === 'SYNO.MailPlus.Attachment' && method === 'get') {
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

  // --- SYNO.Drive.Files ---
  if (api === 'SYNO.Drive.Files') {
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

  // --- SYNO.Drive.Sharing ---
  if (api === 'SYNO.Drive.Sharing' && method === 'create') {
    return ok({ link: 'https://nas.local/d/abc123', permission: 'view', expire_time: null });
  }

  // --- SYNO.Spreadsheet ---
  if (api === 'SYNO.Spreadsheet') {
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

  // --- SYNO.MailPlus.Message (mark / move) ---
  if (api === 'SYNO.MailPlus.Message') {
    if (method === 'mark') return ok({});
    if (method === 'move') return ok({});
  }

  // --- SYNO.MailPlus.Compose ---
  if (api === 'SYNO.MailPlus.Compose' && method === 'send') {
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
export const allHandlers = [...authHandlers, ...driveHandlers];
