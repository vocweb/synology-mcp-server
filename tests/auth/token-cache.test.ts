import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenCache } from '../../src/auth/token-cache.js';

describe('TokenCache', () => {
  let cache: TokenCache;

  beforeEach(() => {
    cache = new TokenCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when empty', () => {
    expect(cache.get()).toBeNull();
    expect(cache.isValid()).toBe(false);
  });

  it('returns token immediately after set', () => {
    cache.set('sid_abc', 60_000);
    expect(cache.get()).toBe('sid_abc');
    expect(cache.isValid()).toBe(true);
  });

  it('returns null after TTL has elapsed', () => {
    cache.set('sid_abc', 60_000);
    // Advance time past TTL
    vi.advanceTimersByTime(60_001);
    expect(cache.get()).toBeNull();
    expect(cache.isValid()).toBe(false);
  });

  it('returns token just before TTL elapses', () => {
    cache.set('sid_abc', 60_000);
    vi.advanceTimersByTime(59_999);
    expect(cache.get()).toBe('sid_abc');
  });

  it('clear() evicts token immediately', () => {
    cache.set('sid_abc', 60_000);
    cache.clear();
    expect(cache.get()).toBeNull();
    expect(cache.isValid()).toBe(false);
  });

  it('overwrites previous token on second set', () => {
    cache.set('sid_first', 60_000);
    cache.set('sid_second', 120_000);
    expect(cache.get()).toBe('sid_second');
  });

  it('evicted token clears internal state (no phantom after re-set)', () => {
    cache.set('sid_abc', 1_000);
    vi.advanceTimersByTime(2_000);
    // Token should be gone
    expect(cache.get()).toBeNull();
    // Set a new token and verify it works
    cache.set('sid_new', 60_000);
    expect(cache.get()).toBe('sid_new');
  });
});
