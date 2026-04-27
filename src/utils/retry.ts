/**
 * Exponential backoff retry helper.
 * Retries an async function on transient failures with configurable backoff and jitter.
 */

/** Configuration for withRetry behavior. */
export interface RetryOpts {
  /** Maximum number of retry attempts after the first failure. Default: 3. */
  maxRetries?: number;
  /** Base delay in milliseconds for the first retry. Default: 500. */
  baseMs?: number;
  /** Maximum delay cap in milliseconds. Default: 5000. */
  maxMs?: number;
  /**
   * Predicate that decides whether the error is worth retrying.
   * Return true to retry, false to rethrow immediately.
   */
  isRetryable: (err: unknown) => boolean;
  /**
   * Optional callback invoked before each retry attempt.
   * Useful for logging or resetting state between retries.
   *
   * @param attempt - 1-based attempt number (1 = first retry).
   * @param err - The error that triggered the retry.
   */
  onRetry?: (attempt: number, err: unknown) => void;
}

/**
 * Executes `fn`, retrying on retryable errors with exponential backoff + ±20% jitter.
 *
 * Backoff formula: `min(baseMs * 2^attempt, maxMs)` ± 20% random jitter.
 * If all attempts are exhausted, the last error is rethrown.
 *
 * @param fn - Async function to execute and retry.
 * @param opts - Retry configuration.
 * @returns Result of `fn` on success.
 * @throws Last encountered error after exhausting retries.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOpts): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  const baseMs = opts.baseMs ?? 500;
  const maxMs = opts.maxMs ?? 5_000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Non-retryable — propagate immediately without delay
      if (!opts.isRetryable(err)) {
        throw err;
      }

      // Exhausted all retries
      if (attempt >= maxRetries) {
        break;
      }

      // Notify caller before sleeping
      opts.onRetry?.(attempt + 1, err);

      // Exponential backoff: baseMs * 2^attempt, capped at maxMs
      const base = Math.min(baseMs * Math.pow(2, attempt), maxMs);
      // ±20% jitter: multiply by a value in [0.8, 1.2)
      const jitter = base * (0.8 + Math.random() * 0.4);
      await sleep(Math.round(jitter));
    }
  }

  throw lastError;
}

/** Resolves after `ms` milliseconds. Extracted so tests can spy/stub it. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
