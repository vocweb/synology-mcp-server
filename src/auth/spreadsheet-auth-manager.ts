/**
 * Synology Spreadsheet API JWT authentication manager.
 * OpenAPI 3.3.2 — POST /spreadsheets/authorize, POST /spreadsheets/authorize/token/revoke.
 * Separate from DSM session auth: the JWT is tied to a DSM session via the
 * `host` body field, but is issued/served by the synology/spreadsheet-api container.
 */

import { Agent } from 'undici';
import type { SynologyConfig } from '../types/index.js';
import { TokenCache } from './token-cache.js';
import { AuthError, NetworkError } from '../errors.js';
import { httpFetch, type FetchResponse } from '../utils/http-fetch.js';

/** POST /spreadsheets/authorize success body. */
interface AuthorizeOkBody {
  token: string;
}

interface AuthorizeErrorBody {
  error?: string;
  message?: string;
}

/**
 * Manages Synology Spreadsheet API JWT token lifecycle.
 *
 * - Logs in via `POST /spreadsheets/authorize` and caches the returned JWT.
 * - Returns cached token on subsequent `getToken()` calls until TTL elapses.
 * - Supports explicit invalidation (on 401 responses) followed by re-login.
 * - Uses an `undici.Agent` to bypass TLS validation when config.ignoreCert is true.
 *
 * Token TTL: 28 days per spec — token is tied to the DSM session, so it
 * also becomes invalid if DSM restarts or the user is forcibly logged out.
 * The server does not return an explicit expiry, so we cache locally for 28 days.
 */
export class SpreadsheetAuthManager {
  private readonly cache: TokenCache;
  private readonly config: SynologyConfig;
  private readonly dispatcher: Agent | undefined;

  /** 28 days in milliseconds */
  private static readonly DEFAULT_SPREADSHEET_TTL_MS = 28 * 24 * 60 * 60 * 1000;

  constructor(config: SynologyConfig) {
    this.config = config;
    this.cache = new TokenCache();

    if (config.ignoreCert) {
      this.dispatcher = new Agent({
        connect: { rejectUnauthorized: false },
      });
    }
  }

  /**
   * Returns a valid JWT token, logging in if necessary.
   * On first call (or after invalidation) performs a blocking login request.
   *
   * @returns The JWT token (without "Bearer " prefix).
   * @throws {AuthError} When credentials are wrong or service misconfigured.
   * @throws {NetworkError} When the Spreadsheet API is unreachable.
   */
  async getToken(): Promise<string> {
    const cached = this.cache.get();
    if (cached !== null) {
      return cached;
    }
    return this.login();
  }

  /**
   * Evicts the cached token so the next `getToken()` call triggers re-login.
   * Call this when a Spreadsheet API returns error 401 (Unauthorized).
   */
  invalidate(): void {
    this.cache.clear();
  }

  /**
   * Performs an explicit logout and clears the cached token.
   * Best-effort — errors are swallowed so shutdown is never blocked.
   */
  async logout(): Promise<void> {
    const token = this.cache.get();
    this.cache.clear();

    if (token === null) {
      return;
    }

    try {
      const url = this.buildBaseUrl() + '/spreadsheets/authorize/token/revoke';
      const init: Record<string, unknown> = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      };
      await httpFetch(url, init, this.dispatcher);
    } catch {
      // Intentionally silenced — logout is best-effort
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Performs a login request and stores the returned JWT in the cache. */
  private async login(): Promise<string> {
    const url = this.buildBaseUrl() + '/spreadsheets/authorize';
    const body = JSON.stringify({
      username: this.config.username,
      password: this.config.password,
      host: this.buildDsmHostField(),
      protocol: this.config.https ? 'https' : 'http',
    });

    let response: FetchResponse;
    try {
      const init: Record<string, unknown> = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      };
      response = await httpFetch(url, init, this.dispatcher);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new NetworkError(`Failed to reach Synology Spreadsheet API: ${msg}`);
    }

    if (response.status === 401 || !response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errBody = (await response.json()) as AuthorizeErrorBody;
        detail = errBody.error || errBody.message || detail;
      } catch {
        // ignore
      }
      // 401 from the Spreadsheet container almost always means the container's
      // own back-call to DSM was rejected — surface the diagnostic vector so
      // operators don't chase ghosts in the MCP layer.
      const dsmTarget = `${this.config.https ? 'https' : 'http'}://${this.buildDsmHostField()}`;
      const hint =
        response.status === 401
          ? ` — Spreadsheet container could not authenticate '${this.config.username}' against DSM at ${dsmTarget}. ` +
            `Common causes: (1) wrong DSM credentials, (2) 2FA account without an app-specific password ` +
            `(the Spreadsheet authorize endpoint does not accept OTP), (3) the container cannot reach DSM at ` +
            `that URL (TLS / port / firewall), (4) DSM auto-block triggered after repeated failed logins.`
          : '';
      throw new AuthError(`Spreadsheet API auth failed: ${detail}${hint}`);
    }

    let payload: AuthorizeOkBody;
    try {
      payload = (await response.json()) as AuthorizeOkBody;
    } catch {
      throw new NetworkError('Synology Spreadsheet API returned non-JSON response');
    }

    if (!payload.token) {
      throw new AuthError('Spreadsheet API auth failed: empty token in response');
    }

    this.cache.set(payload.token, SpreadsheetAuthManager.DEFAULT_SPREADSHEET_TTL_MS);
    return payload.token;
  }

  /**
   * DSM host field for the authorize body. Per spec, must include port if
   * non-default for the protocol. We always include it to be safe.
   * Examples: "office.synology.com", "test.local:5001".
   */
  private buildDsmHostField(): string {
    const isDefault =
      (this.config.https && this.config.port === 443) ||
      (!this.config.https && this.config.port === 80);
    return isDefault ? this.config.host : `${this.config.host}:${this.config.port}`;
  }

  /** Builds the base URL for the Spreadsheet API container. */
  private buildBaseUrl(): string {
    const proto = this.config.spreadsheetHttps ? 'https' : 'http';
    return `${proto}://${this.config.spreadsheetHost}:${this.config.spreadsheetPort}`;
  }
}
