import { describe, it, expect } from 'vitest';
import { isOriginAllowed } from '../../src/utils/origin-guard.js';

describe('isOriginAllowed', () => {
  const allowed = ['http://127.0.0.1:3100', 'http://localhost:3100'];

  it('allows missing Origin when server is loopback-bound', () => {
    expect(isOriginAllowed(null, allowed, '127.0.0.1')).toBe(true);
    expect(isOriginAllowed(undefined, allowed, 'localhost')).toBe(true);
    expect(isOriginAllowed('', allowed, '::1')).toBe(true);
  });

  it('rejects missing Origin when server is bound to non-loopback', () => {
    expect(isOriginAllowed(null, allowed, '0.0.0.0')).toBe(false);
    expect(isOriginAllowed(undefined, allowed, '192.168.1.10')).toBe(false);
  });

  it('allows exact-match origins (case-insensitive)', () => {
    expect(isOriginAllowed('http://127.0.0.1:3100', allowed, '0.0.0.0')).toBe(true);
    expect(isOriginAllowed('HTTP://LOCALHOST:3100', allowed, '0.0.0.0')).toBe(true);
  });

  it('rejects unknown origins', () => {
    expect(isOriginAllowed('https://evil.example.com', allowed, '127.0.0.1')).toBe(false);
    expect(isOriginAllowed('http://127.0.0.1:9999', allowed, '127.0.0.1')).toBe(false);
  });

  it('does not perform wildcard matching', () => {
    expect(isOriginAllowed('http://127.0.0.1:3100/extra', allowed, '127.0.0.1')).toBe(false);
  });
});
