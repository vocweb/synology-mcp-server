/**
 * Tests for src/utils/logger.ts
 * Covers: level filtering, sensitive-field redaction, ISO timestamp presence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../../src/utils/logger.js';

/** Parse one line of JSON from stderr write calls. */
function captureLog(fn: () => void): Array<Record<string, unknown>> {
  const lines: Array<Record<string, unknown>> = [];
  const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    const str = typeof chunk === 'string' ? chunk : chunk.toString();
    for (const line of str.split('\n').filter(Boolean)) {
      try {
        lines.push(JSON.parse(line) as Record<string, unknown>);
      } catch {
        // ignore non-JSON lines
      }
    }
    return true;
  });

  try {
    fn();
  } finally {
    spy.mockRestore();
  }

  return lines;
}

describe('createLogger', () => {
  describe('level filtering', () => {
    it('emits messages at or above configured level', () => {
      const logger = createLogger('warn');
      const logs = captureLog(() => {
        logger.debug('ignored');
        logger.info('also ignored');
        logger.warn('included');
        logger.error('also included');
      });
      expect(logs).toHaveLength(2);
      expect(logs[0]?.level).toBe('warn');
      expect(logs[1]?.level).toBe('error');
    });

    it('emits all levels when configured to debug', () => {
      const logger = createLogger('debug');
      const logs = captureLog(() => {
        logger.debug('d');
        logger.info('i');
        logger.warn('w');
        logger.error('e');
      });
      expect(logs).toHaveLength(4);
    });

    it('emits only error when configured to error', () => {
      const logger = createLogger('error');
      const logs = captureLog(() => {
        logger.debug('no');
        logger.info('no');
        logger.warn('no');
        logger.error('yes');
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.level).toBe('error');
    });
  });

  describe('output format', () => {
    it('includes ts, level, and msg fields', () => {
      const logger = createLogger('info');
      const logs = captureLog(() => logger.info('hello world'));
      expect(logs).toHaveLength(1);
      const entry = logs[0]!;
      expect(entry.msg).toBe('hello world');
      expect(entry.level).toBe('info');
      // ts must be an ISO 8601 date string
      expect(typeof entry.ts).toBe('string');
      expect(() => new Date(entry.ts as string).toISOString()).not.toThrow();
    });

    it('omits meta field when no meta provided', () => {
      const logger = createLogger('info');
      const logs = captureLog(() => logger.info('no meta'));
      expect(logs[0]).not.toHaveProperty('meta');
    });

    it('includes meta field when meta is provided', () => {
      const logger = createLogger('info');
      const logs = captureLog(() => logger.info('with meta', { key: 'value' }));
      expect(logs[0]).toHaveProperty('meta');
      expect((logs[0]!.meta as Record<string, unknown>).key).toBe('value');
    });
  });

  describe('sensitive field redaction', () => {
    it('redacts password in meta', () => {
      const logger = createLogger('info');
      const logs = captureLog(() =>
        logger.info('login attempt', { user: 'admin', password: 'secret123' }),
      );
      const meta = logs[0]!.meta as Record<string, unknown>;
      expect(meta.password).toBe('[REDACTED]');
      expect(meta.user).toBe('admin');
    });

    it('redacts sid in meta', () => {
      const logger = createLogger('info');
      const logs = captureLog(() => logger.warn('session', { sid: 'abc-def-123' }));
      const meta = logs[0]!.meta as Record<string, unknown>;
      expect(meta.sid).toBe('[REDACTED]');
    });

    it('redacts token in meta', () => {
      const logger = createLogger('info');
      const logs = captureLog(() => logger.error('auth', { token: 'bearer-xyz' }));
      const meta = logs[0]!.meta as Record<string, unknown>;
      expect(meta.token).toBe('[REDACTED]');
    });

    it('redacts nested sensitive fields', () => {
      const logger = createLogger('debug');
      const logs = captureLog(() =>
        logger.debug('deep', { outer: { password: 'hidden', safe: 'ok' } }),
      );
      const meta = logs[0]!.meta as Record<string, unknown>;
      const outer = meta.outer as Record<string, unknown>;
      expect(outer.password).toBe('[REDACTED]');
      expect(outer.safe).toBe('ok');
    });

    it('does not mutate the original meta object', () => {
      const logger = createLogger('info');
      const meta = { password: 'my-password', user: 'alice' };
      captureLog(() => logger.info('test', meta));
      // Original must be untouched
      expect(meta.password).toBe('my-password');
    });
  });
});
