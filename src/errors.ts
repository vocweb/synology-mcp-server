/**
 * Error class hierarchy for synology-office-mcp.
 * All errors extend SynologyMcpError so callers can use a single catch.
 * Per spec §10.
 */

/**
 * Base error for all synology-office-mcp failures.
 * Carries a short machine-readable `code`, an optional Synology numeric
 * `synoCode`, and a `retryable` flag for transient failures.
 */
export class SynologyMcpError extends Error {
  /** Short machine-readable identifier, e.g. "AUTH_FAILED" */
  public readonly code: string;
  /** Originating Synology error code when the failure came from the NAS API */
  public readonly synoCode: number | undefined;
  /** True when the operation may succeed if retried without changes */
  public readonly retryable: boolean;

  constructor(code: string, message: string, synoCode?: number, retryable = false) {
    super(message);
    this.name = 'SynologyMcpError';
    this.code = code;
    this.synoCode = synoCode;
    this.retryable = retryable;
    // Maintains proper prototype chain in transpiled ES5 targets
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Authentication or session failure.
 * Thrown on invalid credentials, disabled accounts, 2FA issues, or
 * expired/invalid session IDs (Synology codes 400, 401, 403, 404, 406,
 * 108, 119).
 */
export class AuthError extends SynologyMcpError {
  constructor(message: string, synoCode?: number) {
    super('AUTH_FAILED', message, synoCode, false);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Resource not found on the NAS.
 * Thrown when the requested file, folder, API, or resource does not exist
 * (Synology codes 102, 408).
 */
export class NotFoundError extends SynologyMcpError {
  constructor(message: string, synoCode?: number) {
    super('NOT_FOUND', message, synoCode, false);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Permission denied on the NAS.
 * Thrown when the authenticated user lacks access to the resource
 * (Synology codes 105, 414).
 */
export class PermissionError extends SynologyMcpError {
  constructor(message: string, synoCode?: number) {
    super('PERMISSION_DENIED', message, synoCode, false);
    this.name = 'PermissionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Input validation failure.
 * Thrown before any network call when Zod schema validation fails or
 * a path traversal attempt is detected.
 */
export class ValidationError extends SynologyMcpError {
  constructor(code: string, message: string) {
    super(code, message, undefined, false);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Network-level failure (timeout, DNS, TLS, connection refused).
 * These are always marked retryable=true since the NAS may be temporarily
 * unreachable.
 */
export class NetworkError extends SynologyMcpError {
  constructor(message: string, synoCode?: number) {
    super('NETWORK_ERROR', message, synoCode, true);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
