import { describe, expect, it } from "vitest";

import { PermanentError, runPool, withRetry } from "./upload-queue";

describe("runPool", () => {
  it("handles every item and never runs more than the limit at once", async () => {
    let running = 0;
    let peak = 0;
    const done: number[] = [];
    await runPool(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      async (n) => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        done.push(n);
        running -= 1;
      },
      4,
    );
    expect(done.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(peak).toBe(4);
  });

  it("keeps going when one item fails", async () => {
    const done: number[] = [];
    await runPool([1, 2, 3], async (n) => {
      if (n === 2) throw new Error("boom");
      done.push(n);
    });
    expect(done).toEqual([1, 3]);
  });
});

describe("withRetry", () => {
  it("tries again after a temporary failure", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error("network");
        return "ok";
      },
      3,
      0,
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("gives up after the last attempt", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error("network");
        },
        3,
        0,
      ),
    ).rejects.toThrow("network");
    expect(calls).toBe(3);
  });

  it("does not retry a permanent error", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new PermanentError("forbidden");
        },
        3,
        0,
      ),
    ).rejects.toThrow("forbidden");
    expect(calls).toBe(1);
  });
});
