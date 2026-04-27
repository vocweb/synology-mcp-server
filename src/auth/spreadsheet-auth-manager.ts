/**
 * Synology Spreadsheet API v3.7+ JWT authentication manager.
 * Handles login via REST API, token caching, and logout.
 * Per spec §5 (Spreadsheet auth) — separate from DSM session auth.
 */

import { Agent } from 'undici';
import type { SynologyConfig } from '../types/index.js';
import { TokenCache } from './token-cache.js';
import { AuthError, NetworkError } from '../errors.js';
import { httpFetch, type FetchResponse } from '../utils/http-fetch.js';

/** Spreadsheet API response envelope */
interface SpreadsheetAuthResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/**
 * Manages Synology Spreadsheet API v3.7+ JWT token lifecycle.
 *
 * - Logs in via `POST /spreadsheets/authorize` and caches the returned JWT.
 * - Returns cached token on subsequent `getToken()` calls until TTL elapses.
 * - Supports explicit invalidation (on 401 responses) followed by re-login.
 * - Uses an `undici.Agent` to bypass TLS validation when config.ignoreCert is true.
 *
 * Token TTL: Typically 28 days (2419200 seconds). Falls back to 23 hours if not specified.
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
      host: this.config.host,
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

    let payload: SpreadsheetAuthResponse;
    try {
      payload = (await response.json()) as SpreadsheetAuthResponse;
    } catch {
      throw new NetworkError('Synology Spreadsheet API returned non-JSON response');
    }

    const token = payload.access_token;
    if (!token) {
      const error = payload.error_description || payload.error || 'Unknown error';
      throw new AuthError(`Spreadsheet API auth failed: ${error}`);
    }

    // Use specified TTL or fall back to 28 days; convert seconds to milliseconds
    const ttlSeconds = payload.expires_in ?? (SpreadsheetAuthManager.DEFAULT_SPREADSHEET_TTL_MS / 1000);
    const ttlMs = ttlSeconds * 1000;

    this.cache.set(token, ttlMs);
    return token;
  }

  /** Builds the base URL for the Spreadsheet API container. */
  private buildBaseUrl(): string {
    const proto = this.config.spreadsheetHttps ? 'https' : 'http';
    return `${proto}://${this.config.host}:${this.config.spreadsheetPort}`;
  }
}
