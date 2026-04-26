/**
 * Sensitive-value redaction utility.
 * Used to scrub credentials and tokens from objects before logging.
 */

/** Keys whose values are always replaced with "[REDACTED]" */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'sid',
  '_sid',
  'did',
  'token',
  'otp',
  'otp_code',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
  'apikey',
  'api_key',
  'bearer',
  'mcp_auth_token',
  'auth_token',
  'synotoken',
]);

/**
 * Deep-clones `obj` and replaces any value whose key (case-insensitive)
 * appears in the sensitive list with the string "[REDACTED]".
 *
 * Handles plain objects, arrays, and primitives.
 * Does NOT mutate the original object.
 *
 * @param obj - Any value to redact.
 * @returns A deep clone with sensitive values replaced.
 */
export function redactSensitive(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    // Recurse into every array element
    return obj.map((item) => redactSensitive(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        // Replace sensitive value — always a string so logs stay readable
        result[key] = '[REDACTED]';
      } else {
        // Recurse so nested objects are also cleaned
        result[key] = redactSensitive(value);
      }
    }
    return result;
  }

  // Primitives (string, number, boolean, null, undefined) are safe as-is
  return obj;
}
