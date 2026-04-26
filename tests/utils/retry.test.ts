/**
 * Tests for src/utils/retry.ts
 * Covers: success after partial failures, exhaustion, non-retryable bypass, backoff timing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '../../src/utils/retry.js';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns immediately when fn succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { isRetryable: () => true });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('succeeds after 2 failures then success', async () => {
    const err = new Error('transient');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValue('recovered');

    const promise = withRetry(fn, {
      isRetryable: () => true,
      baseMs: 10,
      maxMs: 100,
    });

    // Advance timers through both retry delays
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('rethrows last error after exhausting maxRetries', async () => {
    const err = new Error('persistent failure');
    const fn = vi.fn().mockRejectedValue(err);

    // Attach rejection handler BEFORE timers fire to avoid unhandled rejection
    const promise = withRetry(fn, {
      maxRetries: 3,
      isRetryable: () => true,
      baseMs: 10,
      maxMs: 100,
    });
    const caught = expect(promise).rejects.toThrow('persistent failure');

    await vi.runAllTimersAsync();
    await caught;

    // initial attempt + 3 retries = 4 calls
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('does not retry when isRetryable returns false', async () => {
    const err = new Error('auth failure');
    const fn = vi.fn().mockRejectedValue(err);

    await expect(withRetry(fn, { isRetryable: () => false })).rejects.toThrow('auth failure');

    // Only one attempt — no retries
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry callback with attempt number and error', async () => {
    const err = new Error('boom');
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('done');
    const onRetry = vi.fn();

    const promise = withRetry(fn, {
      isRetryable: () => true,
      onRetry,
      baseMs: 10,
      maxMs: 100,
    });

    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, err);
  });

  it('respects maxRetries default of 3', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('x'));

    const promise = withRetry(fn, { isRetryable: () => true, baseMs: 1, maxMs: 10 });
    // Attach handler before timers fire to prevent unhandled rejection
    const caught = expect(promise).rejects.toThrow();
    await vi.runAllTimersAsync();
    await caught;

    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it('applies backoff delay before each retry', async () => {
    const err = new Error('slow');
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const promise = withRetry(fn, {
      isRetryable: () => true,
      baseMs: 500,
      maxMs: 5000,
    });

    await vi.runAllTimersAsync();
    await promise;

    // setTimeout should have been called for the backoff delay
    expect(setTimeoutSpy).toHaveBeenCalled();
    const delayArg = setTimeoutSpy.mock.calls[0]?.[1] as number;
    // Jitter is ±20% of baseMs (500ms * 2^0 = 500ms) → [400, 600]
    expect(delayArg).toBeGreaterThanOrEqual(400);
    expect(delayArg).toBeLessThanOrEqual(600);
  });

  it('caps delay at maxMs', async () => {
    const err = new Error('capped');
    // Fail enough times to hit the cap: attempt 3 → base = 500 * 2^2 = 2000ms (within maxMs=500)
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const promise = withRetry(fn, {
      isRetryable: () => true,
      baseMs: 500,
      maxMs: 500, // Force cap to kick in on attempt 2+
    });

    await vi.runAllTimersAsync();
    await promise;

    // All delays should be ≤ maxMs * 1.2 (upper jitter boundary)
    for (const call of setTimeoutSpy.mock.calls) {
      const delay = call[1] as number;
      expect(delay).toBeLessThanOrEqual(500 * 1.2 + 1); // +1 for rounding
    }
  });
});
