/**
 * Synology MailPlus API client.
 * Wraps SYNO.MailPlus.Folder, SYNO.MailPlus.Message, SYNO.MailPlus.Compose,
 * and SYNO.MailPlus.Attachment endpoints.
 * Availability is probed once via SYNO.API.Info and cached for the client lifetime.
 * Per spec §7.3.
 */

import FormData from 'form-data';
import { BaseClient } from './base-client.js';
import { httpFetch } from '../utils/http-fetch.js';
import type { AuthManager } from '../auth/auth-manager.js';
import type { SynologyConfig } from '../types/index.js';
import type { SynoMailFolder, SynoMailMessage } from '../types/synology-types.js';

const ENTRY = '/webapi/entry.cgi';

// ---------------------------------------------------------------------------
// Input/output types
// ---------------------------------------------------------------------------

/** Options for listMessages */
export interface ListMessagesOpts {
  folder_path?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  sort_by?: 'date' | 'subject' | 'sender' | 'size' | undefined;
  sort_direction?: 'ASC' | 'DESC' | undefined;
  unread_only?: boolean | undefined;
  search?: string | undefined;
  account?: string | undefined;
}

/** MailPlus list-messages API response */
export interface SynoMailListResponse {
  total: number;
  messages: SynoMailMessage[];
}

/** Full message detail with body and attachments */
export interface SynoMailDetail {
  id: string;
  subject: string;
  from: { name: string; address: string };
  to: Array<{ name: string; address: string }>;
  cc?: Array<{ name: string; address: string }>;
  bcc?: Array<{ name: string; address: string }>;
  date: number;
  body_text: string;
  body_html: string;
  attachments: SynoMailAttachmentMeta[];
}

/** Attachment metadata (without content) */
export interface SynoMailAttachmentMeta {
  id: string;
  name: string;
  mime_type: string;
  size: number;
}

/** Attachment including raw content */
export interface SynoMailAttachmentWithContent extends SynoMailAttachmentMeta {
  content: Buffer;
}

/** Options for getMessage */
export interface GetMessageOpts {
  message_id: string;
  include_attachments?: boolean | undefined;
}

/** Options for send */
export interface SendMessageOpts {
  to: string[];
  cc?: string[] | undefined;
  bcc?: string[] | undefined;
  subject: string;
  body: string;
  body_format?: 'text' | 'html' | undefined;
  attachments?: Array<{ name: string; content_base64: string; mime_type: string }> | undefined;
  account?: string | undefined;
}

/** Synology send response */
export interface SynoSendResult {
  message_id: string;
  sent_at: number;
}

/** Options for mark */
export interface MarkMessagesOpts {
  message_ids: string[];
  action: 'read' | 'unread' | 'flag' | 'unflag';
  account?: string | undefined;
}

/** Options for move */
export interface MoveMessagesOpts {
  message_ids: string[];
  dest_folder: string;
  account?: string | undefined;
}

/** SYNO.API.Info query response shape (partial) */
interface SynoApiInfoResult {
  [apiName: string]: { path: string; minVersion: number; maxVersion: number };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Wraps all SYNO.MailPlus operations.
 * isAvailable() probes SYNO.API.Info once and caches the result.
 */
export class MailPlusClient extends BaseClient {
  /** Cached availability result; undefined means not yet checked. */
  private _available: boolean | undefined = undefined;

  constructor(config: SynologyConfig, authManager: AuthManager) {
    super(config, authManager);
  }

  /**
   * Check whether the MailPlus Server package is installed on the NAS.
   * Result is cached for the lifetime of this client instance.
   */
  async isAvailable(): Promise<boolean> {
    if (this._available !== undefined) return this._available;

    try {
      const result = await this.request<SynoApiInfoResult>({
        endpoint: ENTRY,
        method: 'GET',
        params: {
          api: 'SYNO.API.Info',
          version: 1,
          method: 'query',
          query: 'SYNO.MailPlus.Folder',
        },
      });
      this._available = 'SYNO.MailPlus.Folder' in result;
    } catch {
      this._available = false;
    }

    return this._available;
  }

  /**
   * List all mail folders for an account.
   *
   * @param account - Optional email account; defaults to user's primary.
   */
  listFolders(account?: string): Promise<SynoMailFolder[]> {
    const params: Record<string, string | number | boolean> = {
      api: 'SYNO.MailPlus.Folder',
      version: 1,
      method: 'list',
    };
    if (account !== undefined) params['account'] = account;

    return this.request<SynoMailFolder[]>({ endpoint: ENTRY, method: 'GET', params });
  }

  /**
   * List messages in a folder with optional filtering.
   *
   * @param opts - Query options including folder, pagination, sort, and search.
   */
  listMessages(opts: ListMessagesOpts): Promise<SynoMailListResponse> {
    const params: Record<string, string | number | boolean> = {
      api: 'SYNO.MailPlus.Message',
      version: 1,
      method: 'list',
      folder_path: opts.folder_path ?? 'INBOX',
      limit: opts.limit ?? 20,
      offset: opts.offset ?? 0,
      sort_by: opts.sort_by ?? 'date',
      sort_direction: opts.sort_direction ?? 'DESC',
      unread_only: opts.unread_only ?? false,
    };
    if (opts.search !== undefined) params['search'] = opts.search;
    if (opts.account !== undefined) params['account'] = opts.account;

    return this.request<SynoMailListResponse>({ endpoint: ENTRY, method: 'GET', params });
  }

  /**
   * Fetch full message content; optionally fetch attachment content.
   *
   * @param opts - message_id and include_attachments flag.
   */
  async getMessage(opts: GetMessageOpts): Promise<
    SynoMailDetail & {
      attachments: Array<SynoMailAttachmentMeta & { content_base64: string | null }>;
    }
  > {
    const detail = await this.request<SynoMailDetail>({
      endpoint: ENTRY,
      method: 'GET',
      params: {
        api: 'SYNO.MailPlus.Message',
        version: 1,
        method: 'get',
        message_id: opts.message_id,
      },
    });

    if (!opts.include_attachments || detail.attachments.length === 0) {
      return {
        ...detail,
        attachments: detail.attachments.map((a) => ({ ...a, content_base64: null })),
      };
    }

    // Fetch attachment content for each attachment
    const attachmentsWithContent = await Promise.all(
      detail.attachments.map(async (att) => {
        try {
          const content = await this.fetchAttachmentContent(att.id, opts.message_id);
          return { ...att, content_base64: content.toString('base64') };
        } catch {
          return { ...att, content_base64: null };
        }
      }),
    );

    return { ...detail, attachments: attachmentsWithContent };
  }

  /**
   * Fetch raw attachment bytes from SYNO.MailPlus.Attachment.
   *
   * @param attachment_id - Attachment ID.
   * @param message_id - Parent message ID.
   */
  private async fetchAttachmentContent(attachment_id: string, message_id: string): Promise<Buffer> {
    const sid = await this.authManager.getToken();
    const qs = new URLSearchParams({
      api: 'SYNO.MailPlus.Attachment',
      version: '1',
      method: 'get',
      attachment_id,
      message_id,
    });
    const url = `${this.baseUrl}${ENTRY}?${qs.toString()}`;
    const response = await httpFetch(url, { headers: { Cookie: `id=${sid}` } }, this.dispatcher);

    if (!response.ok) {
      throw new Error(`Attachment fetch failed with HTTP ${response.status}`);
    }

    const buf = await response.arrayBuffer();
    return Buffer.from(buf);
  }

  /**
   * Send an email message using SYNO.MailPlus.Compose.
   * Attachments are decoded from base64 to Buffer and sent as multipart.
   *
   * @param opts - Recipient lists, subject, body, and optional attachments.
   */
  /**
   * Send an email message using SYNO.MailPlus.Compose.
   * api/version/method go on the query string (matching all other POST handlers);
   * message fields and attachments go in the multipart body.
   *
   * @param opts - Recipient lists, subject, body, and optional attachments.
   */
  async send(opts: SendMessageOpts): Promise<SynoSendResult> {
    const form = new FormData();
    form.append('to', JSON.stringify(opts.to));
    form.append('subject', opts.subject);
    form.append('body', opts.body);
    form.append('body_format', opts.body_format ?? 'text');

    if (opts.cc !== undefined) form.append('cc', JSON.stringify(opts.cc));
    if (opts.bcc !== undefined) form.append('bcc', JSON.stringify(opts.bcc));
    if (opts.account !== undefined) form.append('account', opts.account);

    if (opts.attachments !== undefined) {
      for (const att of opts.attachments) {
        const buf = Buffer.from(att.content_base64, 'base64');
        form.append('attachment', buf, { filename: att.name, contentType: att.mime_type });
      }
    }

    const sid = await this.authManager.getToken();
    const qs = new URLSearchParams({
      api: 'SYNO.MailPlus.Compose',
      version: '1',
      method: 'send',
    });
    const url = `${this.baseUrl}${ENTRY}?${qs.toString()}`;

    const response = await httpFetch(
      url,
      {
        method: 'POST',
        headers: {
          Cookie: `id=${sid}`,
          ...form.getHeaders(),
        },
        body: form.getBuffer(),
      },
      this.dispatcher,
    );

    if (!response.ok) {
      throw new Error(`Send failed with HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      success: boolean;
      data?: SynoSendResult;
      error?: { code: number };
    };
    if (!json.success || json.data === undefined) {
      const code = json.error?.code ?? 100;
      throw new Error(`Send failed with Synology error code ${code}`);
    }

    return json.data;
  }

  /**
   * Mark messages as read/unread/flagged/unflagged.
   *
   * @param opts - message_ids and action.
   */
  async mark(opts: MarkMessagesOpts): Promise<void> {
    const params: Record<string, string | number | boolean> = {
      api: 'SYNO.MailPlus.Message',
      version: 1,
      method: 'mark',
      message_ids: JSON.stringify(opts.message_ids),
      action: opts.action,
    };
    if (opts.account !== undefined) params['account'] = opts.account;

    await this.request<unknown>({ endpoint: ENTRY, method: 'POST', params });
  }

  /**
   * Move messages to a destination folder.
   *
   * @param opts - message_ids and dest_folder path.
   */
  async move(opts: MoveMessagesOpts): Promise<void> {
    const params: Record<string, string | number | boolean> = {
      api: 'SYNO.MailPlus.Message',
      version: 1,
      method: 'move',
      message_ids: JSON.stringify(opts.message_ids),
      dest_folder: opts.dest_folder,
    };
    if (opts.account !== undefined) params['account'] = opts.account;

    await this.request<unknown>({ endpoint: ENTRY, method: 'POST', params });
  }
}
