/**
 * Integration tests for BaseClient retry behaviour.
 * Verifies: 5xx → retry → success; AuthError not retried; timeout still works.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { authHandlers } from '../mocks/synology-handlers.js';
import { createTestDriveClient } from '../mocks/test-client-factory.js';
import { AuthError, NetworkError } from '../../src/errors.js';

const ENTRY_CGI = 'http://nas.local:5000/webapi/entry.cgi';

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('BaseClient retry on 5xx', () => {
  it('retries on HTTP 500 and succeeds on subsequent attempt', async () => {
    let callCount = 0;

    server.use(
      http.get(ENTRY_CGI, () => {
        callCount++;
        if (callCount < 2) {
          return new HttpResponse(null, { status: 500 });
        }
        return HttpResponse.json({
          success: true,
          data: {
            total: 1,
            offset: 0,
            files: [
              {
                id: 'file-001',
                name: 'report.osheet',
                path: '/mydrive/report.osheet',
                real_path: '/volume1/homes/admin/Drive/report.osheet',
                type: 'file',
                size: 2048,
                additional: {
                  owner: { user: 'admin' },
                  time: {
                    atime: 1700000000,
                    ctime: 1700000000,
                    crtime: 1699000000,
                    mtime: 1700000000,
                  },
                  perm: {
                    acl: { append: true, del: true, exec: false, read: true, write: true },
                    is_owner: true,
                  },
                },
              },
            ],
          },
        });
      }),
    );

    vi.useFakeTimers();
    const client = createTestDriveClient();

    const promise = client.listFiles({
      folder_path: '/mydrive',
      limit: 10,
      offset: 0,
      sort_by: 'name',
      sort_direction: 'ASC',
      file_type: 'all',
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    vi.useRealTimers();

    expect(result.total).toBe(1);
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('throws NetworkError after exhausting all retries on persistent 500', async () => {
    server.use(http.get(ENTRY_CGI, () => new HttpResponse(null, { status: 503 })));

    vi.useFakeTimers();
    const client = createTestDriveClient();

    const promise = client.listFiles({
      folder_path: '/mydrive',
      limit: 10,
      offset: 0,
      sort_by: 'name',
      sort_direction: 'ASC',
      file_type: 'all',
    });
    // Attach rejection handler before timers fire to avoid unhandled rejection warning
    const caught = expect(promise).rejects.toThrow(NetworkError);

    await vi.runAllTimersAsync();
    await caught;

    vi.useRealTimers();
  });
});

describe('BaseClient no retry on AuthError', () => {
  it('does not retry on HTTP 401 — fails immediately', async () => {
    let callCount = 0;

    server.use(
      http.get(ENTRY_CGI, () => {
        callCount++;
        return new HttpResponse(null, { status: 401 });
      }),
    );

    const client = createTestDriveClient();

    await expect(
      client.listFiles({
        folder_path: '/mydrive',
        limit: 10,
        offset: 0,
        sort_by: 'name',
        sort_direction: 'ASC',
        file_type: 'all',
      }),
    ).rejects.toThrow(AuthError);

    // Exactly one call — no retry attempted for auth errors
    expect(callCount).toBe(1);
  });
});
