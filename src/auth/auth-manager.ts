/**
 * Synology session authentication manager.
 * Handles login, token caching, on-401 invalidation, and logout.
 * Per spec §5 authentication layer.
 */

import { Agent } from 'undici';
import type { SynologyConfig } from '../types/index.js';
import { TokenCache } from './token-cache.js';
import { AuthError, NetworkError } from '../errors.js';
import { mapSynologyError } from '../utils/synology-error-map.js';
import { httpFetch, type FetchResponse } from '../utils/http-fetch.js';

/** Shape of a successful SYNO.API.Auth login response data object */
interface AuthLoginData {
  sid: string;
}

/** Synology API response envelope used for auth calls */
interface AuthResponse {
  success: boolean;
  data?: AuthLoginData;
  error?: { code: number };
}

/**
 * Manages the Synology DSM session lifecycle.
 *
 * - Logs in via `SYNO.API.Auth` and caches the returned `sid`.
 * - Returns the cached token on subsequent `getToken()` calls until TTL elapses.
 * - Supports explicit invalidation (on 401 responses) followed by re-login.
 * - Uses an `undici.Agent` to bypass TLS certificate validation when
 *   `config.ignoreCert` is `true` (common in home NAS setups with self-signed certs).
 */
export class AuthManager {
  private readonly cache: TokenCache;
  private readonly config: SynologyConfig;
  /** Undici dispatcher — bypasses cert validation when ignoreCert=true */
  private readonly dispatcher: Agent | undefined;

  constructor(config: SynologyConfig) {
    this.config = config;
    this.cache = new TokenCache();

    if (config.ignoreCert) {
      // undici.Agent with rejectUnauthorized=false allows self-signed NAS certs
      this.dispatcher = new Agent({
        connect: { rejectUnauthorized: false },
      });
    }
  }

  /**
   * Returns a valid session token, logging in if necessary.
   * On the first call (or after invalidation) performs a blocking login request.
   *
   * @returns The current Synology session ID (`sid`).
   * @throws {AuthError} When credentials are wrong or account is disabled.
   * @throws {NetworkError} When the NAS is unreachable.
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
   * Call this when a Synology API returns error code 119 or 108.
   */
  invalidate(): void {
    this.cache.clear();
  }

  /**
   * Performs an explicit DSM logout and clears the cached token.
   * Best-effort — errors are swallowed so shutdown is never blocked.
   */
  async logout(): Promise<void> {
    const token = this.cache.get();
    this.cache.clear(); // clear first so a failed logout doesn't leave a stale token

    if (token === null) {
      return; // nothing to log out
    }

    try {
      const { url, body: formBody } = this.buildLogoutRequest(token);
      const init: Record<string, unknown> = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody,
      };
      await httpFetch(url, init, this.dispatcher);
    } catch {
      // Intentionally silenced — logout is best-effort on shutdown
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Performs a login request and stores the returned sid in the cache. */
  private async login(): Promise<string> {
    const { url, body: formBody } = this.buildLoginRequest();

    let response: FetchResponse;
    try {
      // POST credentials in form body so passwd never appears in URL/access logs.
      const init: Record<string, unknown> = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody,
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      };
      response = await httpFetch(url, init, this.dispatcher);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new NetworkError(`Failed to reach Synology NAS: ${msg}`);
    }

    let payload: AuthResponse;
    try {
      payload = (await response.json()) as AuthResponse;
    } catch {
      throw new NetworkError('Synology auth endpoint returned non-JSON response');
    }

    if (!payload.success) {
      const code = payload.error?.code ?? 100;
      // mapSynologyError returns SynologyMcpError; auth codes always yield AuthError
      throw mapSynologyError(code, 'SYNO.API.Auth');
    }

    const sid = payload.data?.sid;
    if (!sid) {
      throw new AuthError('Login succeeded but response contained no sid');
    }

    this.cache.set(sid, this.config.tokenTtlMs);
    return sid;
  }

  /**
   * Builds the login URL (clean, no creds) and the form-urlencoded POST body
   * carrying account/passwd/otp. Keeps credentials out of access logs and
   * `Referer` headers.
   */
  private buildLoginRequest(): { url: string; body: URLSearchParams } {
    const proto = this.config.https ? 'https' : 'http';
    const url = `${proto}://${this.config.host}:${this.config.port}/webapi/auth.cgi`;

    const body = new URLSearchParams({
      api: 'SYNO.API.Auth',
      version: '6',
      method: 'login',
      account: this.config.username,
      passwd: this.config.password,
      format: 'sid',
    });

    // Only append otp_code when the user has configured 2FA
    if (this.config.otpCode) {
      body.set('otp_code', this.config.otpCode);
    }

    return { url, body };
  }

  /**
   * Builds a logout request: clean URL plus form body carrying api/version/
   * method and _sid. Keeps the session id out of URL access logs.
   */
  private buildLogoutRequest(sid: string): { url: string; body: URLSearchParams } {
    const proto = this.config.https ? 'https' : 'http';
    const url = `${proto}://${this.config.host}:${this.config.port}/webapi/auth.cgi`;
    const body = new URLSearchParams({
      api: 'SYNO.API.Auth',
      version: '6',
      method: 'logout',
      _sid: sid,
    });
    return { url, body };
  }
}
