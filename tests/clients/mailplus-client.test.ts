/**
 * Tests for MailPlusClient — covers availability probe, listFolders,
 * listMessages, getMessage (with/without attachments), send, mark, move.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { allHandlers, setMailplusAvailable } from '../mocks/synology-handlers.js';
import { createTestMailPlusClient } from '../mocks/test-client-factory.js';

const server = setupServer(...allHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  setMailplusAvailable(true);
});
afterAll(() => server.close());

describe('MailPlusClient.isAvailable', () => {
  it('returns true when MailPlus package is installed', async () => {
    const client = createTestMailPlusClient();
    expect(await client.isAvailable()).toBe(true);
  });

  it('returns false when MailPlus package is not installed', async () => {
    setMailplusAvailable(false);
    const client = createTestMailPlusClient();
    expect(await client.isAvailable()).toBe(false);
  });

  it('caches the result across multiple calls', async () => {
    const client = createTestMailPlusClient();
    const first = await client.isAvailable();
    // Toggle after first call — cached value should still return first result
    setMailplusAvailable(!first);
    const second = await client.isAvailable();
    expect(first).toBe(second);
  });
});

describe('MailPlusClient.listFolders', () => {
  it('returns folder list', async () => {
    const client = createTestMailPlusClient();
    const folders = await client.listFolders();
    expect(Array.isArray(folders)).toBe(true);
    expect(folders.length).toBeGreaterThan(0);
    expect(folders[0]).toHaveProperty('id');
    expect(folders[0]).toHaveProperty('path');
  });

  it('accepts optional account parameter', async () => {
    const client = createTestMailPlusClient();
    const folders = await client.listFolders('user@example.com');
    expect(Array.isArray(folders)).toBe(true);
  });
});

describe('MailPlusClient.listMessages', () => {
  it('returns paginated message list', async () => {
    const client = createTestMailPlusClient();
    const result = await client.listMessages({ folder_path: 'INBOX' });
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.messages)).toBe(true);
  });

  it('applies default options when none provided', async () => {
    const client = createTestMailPlusClient();
    const result = await client.listMessages({});
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('messages');
  });
});

describe('MailPlusClient.getMessage', () => {
  it('returns message detail without attachment content by default', async () => {
    const client = createTestMailPlusClient();
    const msg = await client.getMessage({ message_id: 'msg-001' });
    expect(msg.id).toBe('msg-001');
    expect(msg.body_text).toBeTruthy();
    expect(msg.attachments[0]?.content_base64).toBeNull();
  });

  it('fetches attachment content when include_attachments=true', async () => {
    const client = createTestMailPlusClient();
    const msg = await client.getMessage({ message_id: 'msg-001', include_attachments: true });
    expect(msg.attachments[0]?.content_base64).not.toBeNull();
    // Must be valid base64 string
    expect(typeof msg.attachments[0]?.content_base64).toBe('string');
  });

  it('throws on not-found message', async () => {
    const client = createTestMailPlusClient();
    await expect(client.getMessage({ message_id: 'not-found' })).rejects.toThrow();
  });
});

describe('MailPlusClient.send', () => {
  it('returns message_id and sent_at on success', async () => {
    const client = createTestMailPlusClient();
    const result = await client.send({
      to: ['recipient@example.com'],
      subject: 'Test',
      body: 'Hello',
    });
    expect(result.message_id).toBe('sent-msg-001');
    expect(result.sent_at).toBe(1700001000);
  });

  it('includes attachment buffer in multipart body', async () => {
    const client = createTestMailPlusClient();
    const result = await client.send({
      to: ['recipient@example.com'],
      subject: 'With attachment',
      body: 'See attached',
      attachments: [
        {
          name: 'test.txt',
          content_base64: Buffer.from('hello').toString('base64'),
          mime_type: 'text/plain',
        },
      ],
    });
    expect(result.message_id).toBeDefined();
  });
});

describe('MailPlusClient.mark', () => {
  it('resolves without error for valid mark action', async () => {
    const client = createTestMailPlusClient();
    await expect(
      client.mark({ message_ids: ['msg-001'], action: 'read' }),
    ).resolves.toBeUndefined();
  });
});

describe('MailPlusClient.move', () => {
  it('resolves without error for valid move', async () => {
    const client = createTestMailPlusClient();
    await expect(
      client.move({ message_ids: ['msg-001'], dest_folder: 'Archive' }),
    ).resolves.toBeUndefined();
  });
});
