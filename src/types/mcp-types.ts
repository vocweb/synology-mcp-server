/**
 * MCP tool input/output type definitions shared across tool modules.
 * These wrap Synology data in the shapes expected by MCP tool handlers.
 */

/** Standard MCP error response returned when a tool call fails */
export interface McpErrorResponse {
  error: true;
  /** Short machine-readable error code, e.g. "AUTH_FAILED" */
  code: string;
  /** Human-readable description */
  message: string;
  /** Originating Synology error code when applicable */
  syno_code?: number;
  /** Whether the caller can safely retry this request */
  retryable: boolean;
}

/** Guard response returned when a destructive op is called without confirm=true */
export interface McpConfirmationRequiredResponse {
  error: true;
  code: 'CONFIRMATION_REQUIRED';
  message: string;
  /** Description of the blocked operation */
  operation: string;
}

/** Paginated list metadata appended to list-style tool outputs */
export interface McpPaginationMeta {
  total: number;
  offset: number;
  limit: number;
}

/** A normalised Drive file entry as returned to MCP callers */
export interface McpDriveFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'dir';
  /** Size in bytes; 0 for directories */
  size: number;
  modified: string; // ISO 8601
  created: string; // ISO 8601
  owner: string;
  /** File extension without leading dot, e.g. "osheet" */
  extension: string;
  is_shared: boolean;
}
