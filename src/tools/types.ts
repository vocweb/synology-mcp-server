/**
 * Shared type definitions for MCP tool definitions and handler context.
 * All tool modules import ToolDefinition and ToolContext from here.
 */

import type { ZodTypeAny } from 'zod';
import type { McpErrorResponse, McpConfirmationRequiredResponse } from '../types/mcp-types.js';
import type { DriveClient } from '../clients/drive-client.js';
import type { SpreadsheetClient } from '../clients/spreadsheet-client.js';
import type { MailPlusClient } from '../clients/mailplus-client.js';
import type { CalendarClient } from '../clients/calendar-client.js';

/** Runtime context injected into every tool handler call. */
export interface ToolContext {
  /** Authenticated Drive client; available when drive feature is enabled. */
  driveClient: DriveClient;
  /** Authenticated Spreadsheet client; available when spreadsheet feature is enabled. */
  spreadsheetClient: SpreadsheetClient;
  /** Authenticated MailPlus client; availability checked via isAvailable(). */
  mailplusClient: MailPlusClient;
  /** Authenticated Calendar client; available when calendar feature is enabled. */
  calendarClient: CalendarClient;
}

/** Union of all possible non-success responses a handler may return. */
export type ToolErrorResult = McpErrorResponse | McpConfirmationRequiredResponse;

/**
 * Descriptor for a single MCP tool.
 * The base (unparameterized) form uses `ZodTypeAny` so typed tool objects can be
 * collected into a `ToolDefinition[]` array without losing assignability.
 *
 * @typeParam S - Zod schema for the tool's input.
 */
export interface ToolDefinition<S extends ZodTypeAny = ZodTypeAny> {
  /** Unique tool name as registered with the MCP server, e.g. "drive_list_files". */
  name: string;
  /** Human-readable description shown to the AI model. */
  description: string;
  /** Zod schema used to parse and validate raw MCP input arguments. */
  inputSchema: S;
  /**
   * Executes the tool logic.
   * Returns success payload or a typed error response — never throws to the MCP layer.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (input: any, ctx: ToolContext) => Promise<unknown>;
}

/**
 * Build a MODULE_UNAVAILABLE error response for tools that require MailPlus Server.
 * Return this when `ctx.mailplusClient.isAvailable()` resolves false.
 */
export function moduleUnavailableResponse(): McpErrorResponse {
  return {
    error: true,
    code: 'MODULE_UNAVAILABLE',
    message: 'MailPlus Server is not installed on this NAS.',
    retryable: false,
  };
}

/**
 * Build a confirmation-required guard response.
 * Call this at the TOP of handlers that perform destructive operations.
 */
export function confirmRequiredResponse(operation: string): McpConfirmationRequiredResponse {
  return {
    error: true,
    code: 'CONFIRMATION_REQUIRED',
    message: `This operation requires confirm=true to execute: ${operation}`,
    operation,
  };
}

/**
 * Convert a caught SynologyMcpError (or unknown) into an McpErrorResponse.
 * Prevents unhandled exceptions from escaping tool handlers to the MCP layer.
 */
export function toMcpError(err: unknown): McpErrorResponse {
  // Inline import-free — avoids circular deps; cast is safe since errors.ts
  // ensures SynologyMcpError always has code/retryable.
  const e = err as { code?: string; message?: string; synoCode?: number; retryable?: boolean };
  return {
    error: true,
    code: e.code ?? 'UNKNOWN_ERROR',
    message: e.message ?? 'An unexpected error occurred',
    ...(e.synoCode !== undefined ? { syno_code: e.synoCode } : {}),
    retryable: e.retryable ?? false,
  };
}
