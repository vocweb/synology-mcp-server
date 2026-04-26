/**
 * In-memory session token cache with TTL expiry.
 * Holds the Synology `sid` for reuse across requests until it expires.
 */

/**
 * Thread-local (single-process) token store.
 * `set()` starts the TTL clock; `get()` returns null once expired.
 */
export class TokenCache {
  private token: string | null = null;
  /** Absolute expiry time in milliseconds since epoch; null when no token stored */
  private expiresAt: number | null = null;

  /**
   * Store a new token with the given TTL.
   *
   * @param token - The Synology session ID (`sid`) string.
   * @param ttlMs - Lifetime in milliseconds from now (e.g. 82_800_000 for 23 h).
   */
  set(token: string, ttlMs: number): void {
    this.token = token;
    // Record absolute expiry so get() doesn't need the original ttl
    this.expiresAt = Date.now() + ttlMs;
  }

  /**
   * Retrieve the cached token if it is still valid.
   *
   * @returns The token string, or `null` when absent or expired.
   */
  get(): string | null {
    if (this.token === null || this.expiresAt === null) {
      return null;
    }
    // Expired tokens are evicted lazily on first read
    if (Date.now() >= this.expiresAt) {
      this.clear();
      return null;
    }
    return this.token;
  }

  /**
   * Evict the cached token immediately.
   * Called on explicit logout or after a 401 response.
   */
  clear(): void {
    this.token = null;
    this.expiresAt = null;
  }

  /**
   * Check whether a non-expired token is currently held.
   *
   * @returns `true` when `get()` would return a non-null value.
   */
  isValid(): boolean {
    return this.get() !== null;
  }
}
