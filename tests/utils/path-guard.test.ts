import { describe, it, expect } from 'vitest';
import { sanitizePath } from '../../src/utils/path-guard.js';
import { ValidationError } from '../../src/errors.js';

describe('sanitizePath', () => {
  it('returns safe absolute paths unchanged', () => {
    expect(sanitizePath('/mydrive')).toBe('/mydrive');
    expect(sanitizePath('/team-folders/reports')).toBe('/team-folders/reports');
  });

  it('normalises redundant separators', () => {
    // path.normalize collapses double slashes
    const result = sanitizePath('/mydrive//docs');
    expect(result).not.toContain('//');
  });

  it('throws ValidationError for traversal with double-dot segment', () => {
    expect(() => sanitizePath('/mydrive/../../etc/passwd')).toThrow(ValidationError);
    expect(() => sanitizePath('../sibling')).toThrow(ValidationError);
  });

  it('throws with code PATH_TRAVERSAL for traversal attempts', () => {
    try {
      sanitizePath('/a/../../../b');
      expect.fail('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).code).toBe('PATH_TRAVERSAL');
    }
  });

  it('throws ValidationError for empty string', () => {
    expect(() => sanitizePath('')).toThrow(ValidationError);
  });

  it('throws ValidationError for whitespace-only string', () => {
    expect(() => sanitizePath('   ')).toThrow(ValidationError);
  });

  it('accepts relative paths without traversal', () => {
    // Relative paths without .. are safe even if unusual for Drive
    expect(() => sanitizePath('reports/q1')).not.toThrow();
  });
});
