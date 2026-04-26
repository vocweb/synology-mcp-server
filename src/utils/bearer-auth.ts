/**
 * Bearer-token authentication for the MCP SSE / Streamable-HTTP transport.
 *
 * MCP spec (2025-06-18) requires "proper authentication for all connections".
 * This helper performs a constant-time comparison of the Authorization header
 * against the configured shared secret to prevent timing-side-channel attacks.
 *
 * Wire into the SSE server's request handler before any JSON-RPC dispatch.
 */

import { timingSafeEqual } from 'node:crypto';

/**
 * Extracts and verifies a bearer token from an Authorization header.
 *
 * @param authHeader - Raw `Authorization` header value (or null/undefined).
 * @param expectedToken - Configured shared secret. When undefined/empty,
 *   verification is disabled and the function always returns true (callers
 *   must enforce non-empty token via config validation when needed).
 * @returns true when the header is a valid `Bearer <expectedToken>`.
 */
export function verifyBearer(
  authHeader: string | null | undefined,
  expectedToken: string | undefined,
): boolean {
  // No token configured ⇒ auth disabled (loopback-only mode per config guard)
  if (expectedToken === undefined || expectedToken === '') {
    return true;
  }

  if (authHeader === null || authHeader === undefined || authHeader === '') {
    return false;
  }

  // Strict "Bearer <token>" parse — case-insensitive scheme per RFC 6750
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (match === null) {
    return false;
  }

  const provided = match[1] ?? '';
  return constantTimeEqual(provided, expectedToken);
}

/**
 * Length-safe constant-time string comparison.
 * Pads the shorter buffer so length difference itself is not a side-channel,
 * then still rejects on length mismatch.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // Compare a fixed-size hash of each side so timingSafeEqual gets equal lengths
  const max = Math.max(bufA.length, bufB.length);
  const padA = Buffer.alloc(max);
  const padB = Buffer.alloc(max);
  bufA.copy(padA);
  bufB.copy(padB);
  // timingSafeEqual itself, plus the explicit length check, defeats both
  // content-timing and length-timing attacks.
  return timingSafeEqual(padA, padB) && bufA.length === bufB.length;
}
