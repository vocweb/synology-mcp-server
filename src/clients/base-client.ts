/**
 * Abstract HTTP base client for all Synology API modules.
 * Handles sid injection, response envelope unwrapping, error mapping,
 * and 401 retry logic. Per spec §6.
 */

import { Agent } from 'undici';
import { httpFetch, type FetchResponse } from '../utils/http-fetch.js';
import type { SynologyConfig } from '../types/index.js';
import type { SynologyResponse } from '../types/synology-types.js';
import type { AuthManager } from '../auth/auth-manager.js';
import { mapSynologyError } from '../utils/synology-error-map.js';
import {
  NetworkError,
  AuthError,
  ValidationError,
  NotFoundError,
  PermissionError,
} from '../errors.js';
import { withRetry } from '../utils/retry.js';

/** Options for a single Synology API request */
export interface RequestOptions {
  /** API endpoint path, e.g. "/webapi/entry.cgi" */
  endpoint: string;
  /** HTTP method; defaults to "GET" */
  method?: 'GET' | 'POST';
  /** Query-string parameters merged with sid and api/version/method */
  params?: Record<string, string | number | boolean>;
  /** POST body; either URLSearchParams or FormData */
  body?: URLSearchParams | FormData;
  /**
   * When true (default), invalidate auth and retry once on Synology
   * session-expired codes (119, 108) or HTTP 401.
   */
  retryOn401?: boolean;
}

/**
 * Abstract base for all Synology API client classes.
 * Subclasses implement module-specific methods (DriveClient, etc.) and
 * call `this.request<T>()` for every Synology API interaction.
 */
export abstract class BaseClient {
  protected readonly authManager: AuthManager;
  /** e.g. "https://192.168.1.100:5001" */
  protected readonly baseUrl: string;
  /** undici Agent for self-signed cert bypass; undefined when not needed.
   * Protected so subclasses can pass it to direct `undici.fetch` calls
   * (binary uploads/downloads that bypass `request<T>()`). */
  protected readonly dispatcher: Agent | undefined;
  private readonly requestTimeoutMs: number;

  constructor(config: SynologyConfig, authManager: AuthManager) {
    this.authManager = authManager;
    const proto = config.https ? 'https' : 'http';
    this.baseUrl = `${proto}://${config.host}:${config.port}`;
    this.requestTimeoutMs = config.requestTimeoutMs;

    if (config.ignoreCert) {
      this.dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
    }
  }

  /**
   * Performs a Synology API request, injects the session token, unwraps
   * the response envelope, and maps errors to typed exceptions.
   *
   * Network-level and HTTP 5xx failures are automatically retried with
   * exponential backoff (up to 3 times). Auth, validation, not-found, and
   * permission errors are never retried.
   *
   * @param options - Request parameters.
   * @returns Unwrapped `data` payload from the Synology response.
   * @throws {AuthError} On authentication failure.
   * @throws {NetworkError} On transport-level failure after exhausting retries.
   * @throws {SynologyMcpError} On any Synology API error code.
   */
  protected async request<T>(options: RequestOptions): Promise<T> {
    const { endpoint, method = 'GET', params = {}, body, retryOn401 = true } = options;

    const sid = await this.authManager.getToken();
    // Send _sid via Cookie header (Synology supports format=cookie sessions)
    // so the session id never lands in URL access logs / Referer headers.
    const url = this.buildUrl(endpoint, params);

    const raw = await withRetry(() => this.fetchWithTimeout(url, method, body, sid), {
      isRetryable: isRetryableError,
    });

    // Session-expired codes that warrant a single retry after re-login
    const sessionExpiredCodes = new Set([108, 119]);

    if (!raw.success) {
      const code = raw.error?.code ?? 100;

      if (retryOn401 && sessionExpiredCodes.has(code)) {
        // Invalidate stale token and retry once with a fresh login
        this.authManager.invalidate();
        return this.request<T>({ ...options, retryOn401: false });
      }

      throw mapSynologyError(code, String(params['api'] ?? endpoint));
    }

    return this.unwrap<T>(raw as SynologyResponse<T>);
  }

  /**
   * Extracts the typed data payload from a successful Synology response.
   * Throws if `data` is absent (malformed response).
   */
  protected unwrap<T>(response: SynologyResponse<T>): T {
    if (response.data === undefined) {
      throw new NetworkError('Synology API returned success=true but no data field');
    }
    return response.data;
  }

  /**
   * Convenience wrapper: returns a human-readable message for a Synology
   * error code. Useful for adding context in higher-level error handling.
   */
  protected mapError(code: number, api: string): string {
    return mapSynologyError(code, api).message;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Builds a full URL from endpoint path and merged query params. */
  private buildUrl(endpoint: string, params: Record<string, string | number | boolean>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      qs.set(k, String(v));
    }
    return `${this.baseUrl}${endpoint}?${qs.toString()}`;
  }

  /** Executes the HTTP request with AbortSignal timeout and error normalisation. */
  protected async fetchWithTimeout(
    url: string,
    method: 'GET' | 'POST',
    body: URLSearchParams | FormData | undefined,
    sid: string,
  ): Promise<SynologyResponse<unknown>> {
    let response: FetchResponse;
    try {
      // `id=<sid>` is Synology's documented session cookie name (format=cookie).
      const init: Record<string, unknown> = {
        method,
        headers: { Cookie: `id=${sid}` },
        body: method === 'POST' ? body : undefined,
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      };
      response = await httpFetch(url, init, this.dispatcher);
    } catch (err) {
      // AbortError signals a timeout; all others are network failures
      const msg = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new NetworkError(`Request timed out after ${this.requestTimeoutMs}ms`);
      }
      throw new NetworkError(`Network error: ${msg}`);
    }

    // HTTP 401 at transport level — treat same as Synology code 119
    if (response.status === 401) {
      throw new AuthError('HTTP 401 from Synology API', 401);
    }

    // Treat HTTP 5xx as a retryable network-class failure (before parsing body)
    if (response.status >= 500) {
      throw new NetworkError(`Synology API HTTP ${response.status}`);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new NetworkError(`Synology API returned non-JSON response (HTTP ${response.status})`);
    }

    return json as SynologyResponse<unknown>;
  }
}

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the error is a transient failure safe to retry.
 * Never retries: AuthError, ValidationError, NotFoundError, PermissionError.
 */
function isRetryableError(err: unknown): boolean {
  if (
    err instanceof AuthError ||
    err instanceof ValidationError ||
    err instanceof NotFoundError ||
    err instanceof PermissionError
  ) {
    return false;
  }
  // NetworkError (retryable=true) and unknown errors are retried
  if (err instanceof NetworkError) return true;
  // Fallback: retry on unrecognised errors (e.g. unexpected throws from fetch)
  return true;
}
