import { describe, it, expect } from 'vitest';
import { verifyBearer } from '../../src/utils/bearer-auth.js';

describe('verifyBearer', () => {
  const TOKEN = 's3cret-shared-token-xyz';

  it('returns true when no expected token is configured (auth disabled)', () => {
    expect(verifyBearer('Bearer anything', undefined)).toBe(true);
    expect(verifyBearer(null, '')).toBe(true);
  });

  it('rejects missing Authorization header when token is required', () => {
    expect(verifyBearer(null, TOKEN)).toBe(false);
    expect(verifyBearer(undefined, TOKEN)).toBe(false);
    expect(verifyBearer('', TOKEN)).toBe(false);
  });

  it('accepts a correct Bearer token', () => {
    expect(verifyBearer(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
  });

  it('treats Bearer scheme case-insensitively', () => {
    expect(verifyBearer(`bearer ${TOKEN}`, TOKEN)).toBe(true);
    expect(verifyBearer(`BEARER ${TOKEN}`, TOKEN)).toBe(true);
  });

  it('rejects wrong tokens', () => {
    expect(verifyBearer(`Bearer wrong-token`, TOKEN)).toBe(false);
    expect(verifyBearer(`Bearer ${TOKEN}-extra`, TOKEN)).toBe(false);
    expect(verifyBearer(`Bearer ${TOKEN.slice(0, -1)}`, TOKEN)).toBe(false);
  });

  it('rejects malformed Authorization headers', () => {
    expect(verifyBearer(TOKEN, TOKEN)).toBe(false); // missing scheme
    expect(verifyBearer(`Basic ${TOKEN}`, TOKEN)).toBe(false);
    expect(verifyBearer(`Bearer`, TOKEN)).toBe(false);
  });

  it('rejects tokens differing only by length (no length-based bypass)', () => {
    expect(verifyBearer(`Bearer `, TOKEN)).toBe(false);
    expect(verifyBearer(`Bearer x`, TOKEN)).toBe(false);
  });
});
