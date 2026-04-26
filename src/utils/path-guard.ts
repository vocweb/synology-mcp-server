/**
 * Path traversal protection utility.
 * All user-supplied file paths must pass through sanitizePath() before use.
 */

import path from 'node:path';
import { ValidationError } from '../errors.js';

/**
 * Sanitizes a Drive path by normalising it and rejecting any traversal attempt.
 *
 * Rules enforced:
 * - Rejects paths containing `..` segments after normalization.
 * - Rejects empty strings.
 * - Preserves leading `/` (Drive paths are absolute).
 *
 * @param p - Raw path string from user input.
 * @returns Normalized, safe path.
 * @throws {ValidationError} When traversal or empty input is detected.
 */
export function sanitizePath(p: string): string {
  if (!p || p.trim() === '') {
    throw new ValidationError('INVALID_PATH', 'Path must not be empty');
  }

  // Check raw input for `..` segments BEFORE normalize: `path.normalize`
  // resolves `..` and would silently let a traversal escape the parent dir.
  const segments = p.split(/[\\/]+/);
  if (segments.some((seg) => seg === '..')) {
    throw new ValidationError(
      'PATH_TRAVERSAL',
      "Path traversal not allowed: path must not contain '..' segments",
    );
  }

  // Safe to normalize once traversal segments are rejected
  return path.normalize(p);
}
