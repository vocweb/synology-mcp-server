/**
 * Maps Synology numeric error codes to typed MCP error instances.
 * Per spec §10 error code table.
 */

import { SynologyMcpError, AuthError, NotFoundError, PermissionError } from '../errors.js';

/** Lookup entry for a single Synology error code */
interface ErrorMapEntry {
  /** Factory that builds the appropriate typed error */
  factory: (synoCode: number) => SynologyMcpError;
  /** Default human-readable message */
  message: string;
}

/** Complete mapping from Synology numeric code → error factory + message */
const ERROR_MAP: Record<number, ErrorMapEntry> = {
  100: {
    factory: (c) => new SynologyMcpError('SYNO_UNKNOWN', 'Unknown error', c),
    message: 'Unknown error',
  },
  101: {
    factory: (c) => new SynologyMcpError('SYNO_INVALID_PARAM', 'Invalid parameter', c),
    message: 'Invalid parameter',
  },
  102: {
    factory: (c) => new NotFoundError('API does not exist', c),
    message: 'API does not exist',
  },
  103: {
    factory: (c) => new SynologyMcpError('SYNO_NO_METHOD', 'Method does not exist', c),
    message: 'Method does not exist',
  },
  104: {
    factory: (c) =>
      new SynologyMcpError('SYNO_VERSION_UNSUPPORTED', 'API version not supported', c),
    message: 'API version not supported',
  },
  105: {
    factory: (c) => new PermissionError('Insufficient permissions', c),
    message: 'Insufficient permissions',
  },
  106: {
    factory: (c) => new SynologyMcpError('SYNO_SESSION_TIMEOUT', 'Session timeout', c),
    message: 'Session timeout',
  },
  107: {
    factory: (c) => new SynologyMcpError('SYNO_DUPLICATE_LOGIN', 'Duplicate login', c),
    message: 'Duplicate login',
  },
  // 108 and 119 are session-interruption codes — treated as auth failures
  108: {
    factory: (c) => new AuthError('Session interrupted', c),
    message: 'Session interrupted',
  },
  119: {
    factory: (c) => new AuthError('SID not found — re-login required', c),
    message: 'SID not found — re-login required',
  },
  400: {
    factory: (c) => new AuthError('Account does not exist or bad password', c),
    message: 'Account does not exist or bad password',
  },
  401: {
    factory: (c) => new AuthError('Account disabled', c),
    message: 'Account disabled',
  },
  403: {
    factory: (c) => new AuthError('Permission denied', c),
    message: 'Permission denied',
  },
  404: {
    factory: (c) => new AuthError('2FA code required', c),
    message: '2FA code required',
  },
  406: {
    factory: (c) => new AuthError('2FA enrollment required', c),
    message: '2FA enrollment required',
  },
  408: {
    factory: (c) => new NotFoundError('File not found', c),
    message: 'File not found',
  },
  414: {
    factory: (c) => new PermissionError('No write permission', c),
    message: 'No write permission',
  },
  417: {
    factory: (c) => new SynologyMcpError('SYNO_FILE_EXISTS', 'File already exists', c),
    message: 'File already exists',
  },
  418: {
    factory: (c) => new SynologyMcpError('SYNO_QUOTA_EXCEEDED', 'Disk quota exceeded', c),
    message: 'Disk quota exceeded',
  },
};

/**
 * Builds a typed error from a Synology numeric error code.
 * Falls back to a generic `SynologyMcpError` for unmapped codes.
 *
 * @param code - Synology numeric error code from response envelope.
 * @param api  - API name for context in fallback message, e.g. "SYNO.SynologyDrive.Files".
 * @returns Typed error instance ready to throw.
 */
export function mapSynologyError(code: number, api: string): SynologyMcpError {
  const entry = ERROR_MAP[code];
  if (entry) {
    return entry.factory(code);
  }
  // Unknown code — surface raw info so caller can diagnose
  return new SynologyMcpError(
    'SYNO_UNKNOWN_CODE',
    `Synology API '${api}' returned unknown error code ${code}`,
    code,
  );
}
