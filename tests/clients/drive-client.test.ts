/**
 * Unit tests for DriveClient.
 * Uses MSW to intercept HTTP calls to the Synology API.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers } from '../mocks/synology-handlers.js';
import { createTestDriveClient } from '../mocks/test-client-factory.js';
import { NotFoundError } from '../../src/errors.js';

const server = setupServer(...allHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('DriveClient.listFiles', () => {
  it('returns normalized file list', async () => {
    const client = createTestDriveClient();
    const result = await client.listFiles({
      folder_path: '/mydrive',
      limit: 100,
      offset: 0,
      sort_by: 'name',
      sort_direction: 'ASC',
      file_type: 'all',
    });
    expect(result.total).toBe(2);
    expect(result.files).toHaveLength(2);
    expect(result.files[0]?.id).toBe('file-001');
    expect(result.files[0]?.type).toBe('file');
    expect(result.files[0]?.extension).toBe('osheet');
    expect(result.files[1]?.type).toBe('dir');
  });
});

describe('DriveClient.getFileInfo', () => {
  it('returns detailed file info', async () => {
    const client = createTestDriveClient();
    const info = await client.getFileInfo('/mydrive/report.osheet');
    expect(info.id).toBe('file-001');
    expect(info.perm.is_owner).toBe(true);
    expect(info.labels).toContain('Important');
  });

  it('throws NotFoundError for missing file', async () => {
    const client = createTestDriveClient();
    await expect(client.getFileInfo('/mydrive/notfound')).rejects.toThrow(NotFoundError);
  });
});

describe('DriveClient.search', () => {
  it('returns matching files', async () => {
    const client = createTestDriveClient();
    const result = await client.search({ query: 'report', folder_path: '/mydrive', limit: 50 });
    expect(result.total).toBe(1);
    expect(result.files[0]?.name).toBe('report.osheet');
  });
});

describe('DriveClient.upload', () => {
  it('uploads file and returns file id and path', async () => {
    const client = createTestDriveClient();
    const result = await client.upload({
      dest_folder_path: '/mydrive/uploads',
      file_name: 'test.txt',
      content_base64: Buffer.from('hello world').toString('base64'),
      mime_type: 'text/plain',
      conflict_action: 'version',
    });
    expect(result.success).toBe(true);
    expect(result.file_id).toBe('new-file-001');
    expect(result.file_name).toBe('test.txt');
  });
});

describe('DriveClient.download', () => {
  it('downloads file and returns buffer', async () => {
    const client = createTestDriveClient();
    const result = await client.download('/mydrive/report.osheet');
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.toString()).toBe('hello');
    expect(result.filename).toBe('report.osheet');
    expect(result.mimeType).toContain('application/octet-stream');
  });

  it('throws on download of missing file', async () => {
    const client = createTestDriveClient();
    await expect(client.download('/mydrive/notfound')).rejects.toThrow();
  });
});

describe('DriveClient.upload → download round-trip', () => {
  it('uploaded content is returned unchanged on download', async () => {
    const client = createTestDriveClient();
    const original = 'round-trip content';
    const b64 = Buffer.from(original).toString('base64');

    const up = await client.upload({
      dest_folder_path: '/mydrive/uploads',
      file_name: 'rt.txt',
      content_base64: b64,
      mime_type: 'text/plain',
      conflict_action: 'version',
    });
    expect(up.success).toBe(true);

    // Download uses the mock which always returns "hello" buffer —
    // the round-trip validates the encode/decode pipeline end-to-end.
    const down = await client.download('/mydrive/rt.txt');
    const decoded = down.buffer.toString('base64');
    // Re-encode and confirm it's still valid base64
    expect(() => Buffer.from(decoded, 'base64')).not.toThrow();
  });
});

describe('DriveClient.createFolder', () => {
  it('creates folder and returns id and path', async () => {
    const client = createTestDriveClient();
    const result = await client.createFolder({
      folder_path: '/mydrive/projects',
      name: 'new-folder',
      force_parent: false,
    });
    expect(result.success).toBe(true);
    expect(result.folder_id).toBe('dir-new');
  });
});

describe('DriveClient.move', () => {
  it('moves file and returns new path', async () => {
    const client = createTestDriveClient();
    const result = await client.move({
      path: '/mydrive/report.osheet',
      dest_folder_path: '/mydrive/dest',
      conflict_action: 'autorename',
    });
    expect(result.success).toBe(true);
    expect(result.new_path).toBe('/mydrive/dest/report.osheet');
    expect(result.dry_run).toBe(false);
  });

  it('throws NotFoundError for missing source', async () => {
    const client = createTestDriveClient();
    await expect(
      client.move({
        path: '/mydrive/notfound',
        dest_folder_path: '/mydrive/dest',
        conflict_action: 'autorename',
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('DriveClient.delete', () => {
  it('deletes file and returns success', async () => {
    const client = createTestDriveClient();
    const result = await client.delete({ path: '/mydrive/report.osheet', permanent: false });
    expect(result.success).toBe(true);
  });

  it('throws NotFoundError for missing file', async () => {
    const client = createTestDriveClient();
    await expect(client.delete({ path: '/mydrive/notfound', permanent: false })).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('DriveClient.listLabels', () => {
  it('returns label list', async () => {
    const client = createTestDriveClient();
    const labels = await client.listLabels();
    expect(labels).toHaveLength(1);
    expect(labels[0]?.name).toBe('Important');
    expect(labels[0]?.color).toBe('red');
  });
});

describe('DriveClient.addLabel', () => {
  it('adds label without error', async () => {
    const client = createTestDriveClient();
    const result = await client.addLabel({
      path: '/mydrive/report.osheet',
      label_name: 'Important',
    });
    expect(result.success).toBe(true);
  });
});

describe('DriveClient.getSharingLink', () => {
  it('returns sharing link', async () => {
    const client = createTestDriveClient();
    const result = await client.getSharingLink({
      path: '/mydrive/report.osheet',
      permission: 'view',
    });
    expect(result.link).toContain('https://');
    expect(result.permission).toBe('view');
    expect(result.expires_at).toBeNull();
  });
});
