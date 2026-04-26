/**
 * Origin header validator for MCP SSE / Streamable-HTTP transport.
 *
 * MCP spec (2025-06-18, Streamable HTTP §Security Warning):
 *   Servers MUST validate the `Origin` header on all incoming connections
 *   to prevent DNS rebinding attacks.
 *
 * Wire this into the SSE server before any JSON-RPC handler runs.
 */

/**
 * Returns true when the request's Origin is allowed.
 *
 * Rules:
 * - Missing Origin → allowed only when the server is bound to a loopback host
 *   (CLI clients, curl, and same-host MCP clients often omit Origin).
 * - Present Origin → must match the configured allowlist exactly
 *   (scheme + host + port). Wildcards are not supported on purpose.
 *
 * @param origin - Value of the incoming `Origin` header (or null/undefined).
 * @param allowedOrigins - Exact origin strings permitted, e.g. ["http://127.0.0.1:3100"].
 * @param boundHost - Host the SSE server is bound to (used to allow no-Origin on loopback).
 */
export function isOriginAllowed(
  origin: string | null | undefined,
  allowedOrigins: readonly string[],
  boundHost: string,
): boolean {
  if (origin === null || origin === undefined || origin === '') {
    // No Origin header — only safe when server is loopback-bound, since
    // browsers always send Origin and only same-host CLIs would omit it.
    return isLoopback(boundHost);
  }

  // Exact-match allowlist; case-insensitive on scheme+host per RFC 3986
  const normalized = origin.trim().toLowerCase();
  return allowedOrigins.some((a) => a.trim().toLowerCase() === normalized);
}

/** True for IPv4 127/8, IPv6 ::1, and the literal "localhost". */
function isLoopback(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (h === 'localhost' || h === '::1' || h === '[::1]') return true;
  return /^127(\.\d{1,3}){3}$/.test(h);
}
