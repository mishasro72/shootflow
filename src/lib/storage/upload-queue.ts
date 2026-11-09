/**
 * Small helpers for sending many files: a pool that runs a few at a time, and retries
 * for the network hiccups that happen on a phone at a shoot. No React, so it is easy to test.
 */

/** Runs `worker` for every item, at most `concurrency` at once. Never rejects. */
export async function runPool<T>(items: T[], worker: (item: T) => Promise<void>, concurrency = 4): Promise<void> {
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const item = items[next] as T;
      next += 1;
      try {
        await worker(item);
      } catch {
        // The worker reports its own errors; one failure must not stop the other files.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
}

/** An error that retrying will not fix, e.g. an expired signature (HTTP 403). */
export class PermanentError extends Error {}

/**
 * Calls `task` until it succeeds, up to `attempts` times, waiting a little longer before
 * each new try (0.5 s, 1 s, 2 s...). A PermanentError stops at once.
 */
export async function withRetry<T>(task: () => Promise<T>, attempts = 3, baseDelayMs = 500): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (error instanceof PermanentError || attempt === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastError;
}
