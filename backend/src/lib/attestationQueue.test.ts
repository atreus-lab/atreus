import { describe, expect, it, vi } from "vitest";
import {
  AttestationQueue,
  DuplicateNullifierError,
  type AttestationRequest,
} from "./attestationQueue.js";

const bytes = (n: number): Uint8Array => Uint8Array.from(Array(32).fill(n));

const claim = (n: number): AttestationRequest => ({
  linkHash: bytes(n),
  recipient: `GRECIPIENT${n}`,
  nullifier: bytes(n + 100),
});

/**
 * Controllable clock + timer so age-based flushing is tested deterministically
 * rather than by sleeping.
 */
function harness() {
  let now = 0;
  const timers: Array<{ fn: () => void; due: number }> = [];
  return {
    opts: {
      now: () => now,
      setTimer: (fn: () => void, ms: number) => {
        const handle = { fn, due: now + ms };
        timers.push(handle);
        return handle;
      },
      clearTimer: (handle: any) => {
        const i = timers.indexOf(handle);
        if (i >= 0) timers.splice(i, 1);
      },
    },
    advance(ms: number) {
      now += ms;
      const due = timers.filter((t) => t.due <= now);
      for (const t of due) {
        timers.splice(timers.indexOf(t), 1);
        t.fn();
      }
    },
    get pending() {
      return timers.length;
    },
  };
}

describe("AttestationQueue", () => {
  it("flushes once the size cap is reached, without waiting for the age trigger", async () => {
    const h = harness();
    const submit = vi.fn().mockResolvedValue("tx-size");
    const q = new AttestationQueue(submit, { sizeCap: 3, latencyBudgetMs: 10_000, ...h.opts });

    const results = [q.enqueue(claim(1)), q.enqueue(claim(2)), q.enqueue(claim(3))];
    await expect(Promise.all(results)).resolves.toEqual(["tx-size", "tx-size", "tx-size"]);

    // One transaction carrying all three claims.
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0]).toHaveLength(3);
    expect(q.depth).toBe(0);
  });

  it("flushes on age when the batch never fills", async () => {
    const h = harness();
    const submit = vi.fn().mockResolvedValue("tx-age");
    const q = new AttestationQueue(submit, { sizeCap: 50, latencyBudgetMs: 10_000, ...h.opts });

    const result = q.enqueue(claim(1));
    expect(submit).not.toHaveBeenCalled();

    h.advance(9_999);
    expect(submit).not.toHaveBeenCalled();

    h.advance(1);
    await expect(result).resolves.toBe("tx-age");
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("keys the age deadline off the oldest entry so a trickle cannot starve it", async () => {
    const h = harness();
    const submit = vi.fn().mockResolvedValue("tx");
    const q = new AttestationQueue(submit, { sizeCap: 50, latencyBudgetMs: 10_000, ...h.opts });

    const first = q.enqueue(claim(1));
    // A steady stream of later arrivals must not push the first entry's
    // deadline out.
    h.advance(4_000);
    q.enqueue(claim(2));
    h.advance(4_000);
    q.enqueue(claim(3));
    expect(submit).not.toHaveBeenCalled();

    h.advance(2_000); // first entry now exactly 10s old
    await expect(first).resolves.toBe("tx");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0]).toHaveLength(3);
  });

  it("rejects a nullifier that is already queued instead of poisoning the batch", async () => {
    const h = harness();
    const submit = vi.fn().mockResolvedValue("tx");
    const q = new AttestationQueue(submit, { sizeCap: 50, latencyBudgetMs: 10_000, ...h.opts });

    const first = q.enqueue(claim(1));
    // Same nullifier, different link — the contract would revert the entire
    // batch over this, taking unrelated claims down with it.
    await expect(q.enqueue({ ...claim(9), nullifier: claim(1).nullifier })).rejects.toBeInstanceOf(
      DuplicateNullifierError,
    );

    h.advance(10_000);
    await expect(first).resolves.toBe("tx");
    expect(submit.mock.calls[0][0]).toHaveLength(1);
  });

  it("allows a nullifier again once its batch has flushed", async () => {
    const h = harness();
    const submit = vi.fn().mockResolvedValue("tx");
    const q = new AttestationQueue(submit, { sizeCap: 1, latencyBudgetMs: 10_000, ...h.opts });

    await q.enqueue(claim(1));
    await expect(q.enqueue(claim(1))).resolves.toBe("tx");
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("rejects every caller in a batch when the submission fails", async () => {
    const h = harness();
    const submit = vi.fn().mockRejectedValue(new Error("tx failed on-chain"));
    const q = new AttestationQueue(submit, { sizeCap: 2, latencyBudgetMs: 10_000, ...h.opts });

    const a = q.enqueue(claim(1));
    const b = q.enqueue(claim(2));

    // attest_batch is atomic, so nothing landed — no caller may be told it did.
    await expect(a).rejects.toThrow("tx failed on-chain");
    await expect(b).rejects.toThrow("tx failed on-chain");
    expect(q.depth).toBe(0);
  });

  it("puts entries arriving during a flush into the next batch", async () => {
    const h = harness();
    let release: (v: string) => void = () => {};
    const submit = vi
      .fn()
      .mockImplementationOnce(() => new Promise<string>((res) => { release = res; }))
      .mockResolvedValue("tx-2");
    const q = new AttestationQueue(submit, { sizeCap: 1, latencyBudgetMs: 10_000, ...h.opts });

    const first = q.enqueue(claim(1)); // triggers flush, which now hangs
    const second = q.enqueue(claim(2)); // must not join the in-flight batch

    expect(submit).toHaveBeenCalledTimes(1);
    release("tx-1");
    await expect(first).resolves.toBe("tx-1");
    await expect(second).resolves.toBe("tx-2");
    expect(submit).toHaveBeenCalledTimes(2);
    expect(submit.mock.calls[1][0]).toHaveLength(1);
  });

  it("passes the email hash through only when present", async () => {
    const h = harness();
    const submit = vi.fn().mockResolvedValue("tx");
    const q = new AttestationQueue(submit, { sizeCap: 2, latencyBudgetMs: 10_000, ...h.opts });

    await Promise.all([
      q.enqueue({ ...claim(1), emailHash: bytes(7) }),
      q.enqueue(claim(2)),
    ]);

    const sent = submit.mock.calls[0][0];
    expect(sent[0].emailHash).toEqual(bytes(7));
    expect(sent[1].emailHash).toBeUndefined();
  });

  it("is a no-op when flushed empty", async () => {
    const h = harness();
    const submit = vi.fn().mockResolvedValue("tx");
    const q = new AttestationQueue(submit, { sizeCap: 5, latencyBudgetMs: 10_000, ...h.opts });

    await q.flush();
    expect(submit).not.toHaveBeenCalled();
  });
});
