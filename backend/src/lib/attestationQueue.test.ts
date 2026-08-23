import { describe, expect, it, vi } from "vitest";
import {
  AttestationQueue,
  DuplicateNullifierError,
  type AttestationRequest,
} from "./attestationQueue.js";

const bytes = (n: number): Uint8Array => Uint8Array.from(Array(32).fill(n));

// Claims reach the queue already blinded (issue #118): a claim key, a nullifier,
// and the salt that reopens the key for that one recipient.
const claim = (n: number): AttestationRequest => ({
  claimKey: bytes(n),
  nullifier: bytes(n + 100),
  claimSalt: n.toString(16).padStart(2, "0").repeat(32),
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
  };
}

describe("AttestationQueue", () => {
  it("flushes once the size cap is reached, without waiting for the age trigger", async () => {
    const h = harness();
    const submit = vi.fn().mockResolvedValue("tx-size");
    const q = new AttestationQueue(submit, { sizeCap: 3, latencyBudgetMs: 10_000, ...h.opts });

    const results = await Promise.all([q.enqueue(claim(1)), q.enqueue(claim(2)), q.enqueue(claim(3))]);

    // One transaction carrying all three claims.
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0]).toHaveLength(3);
    expect(results.map((r) => r.txHash)).toEqual(["tx-size", "tx-size", "tx-size"]);
    expect(q.depth).toBe(0);
  });

  it("returns each caller its own salt, not a shared one", async () => {
    const h = harness();
    const submit = vi.fn().mockResolvedValue("tx");
    const q = new AttestationQueue(submit, { sizeCap: 2, latencyBudgetMs: 10_000, ...h.opts });

    const [a, b] = await Promise.all([q.enqueue(claim(1)), q.enqueue(claim(2))]);

    // A shared salt would let anyone who claimed one link recompute the claim
    // keys of everything batched alongside it.
    expect(a.claimSalt).toBe(claim(1).claimSalt);
    expect(b.claimSalt).toBe(claim(2).claimSalt);
    expect(a.claimSalt).not.toBe(b.claimSalt);
    expect(a.txHash).toBe(b.txHash);
  });

  it("never sends the salt on-chain", async () => {
    const h = harness();
    const submit = vi.fn().mockResolvedValue("tx");
    const q = new AttestationQueue(submit, { sizeCap: 1, latencyBudgetMs: 10_000, ...h.opts });

    await q.enqueue(claim(1));

    // The salt is the secret that keeps the claim key blinded; publishing it
    // would defeat the blinding entirely.
    const sent = submit.mock.calls[0][0][0];
    expect(sent).not.toHaveProperty("claimSalt");
    expect(Object.keys(sent).sort()).toEqual(["claimKey", "emailKey", "nullifier"]);
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
    expect((await result).txHash).toBe("tx-age");
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("keys the age deadline off the oldest entry so a trickle cannot starve it", async () => {
    const h = harness();
    const submit = vi.fn().mockResolvedValue("tx");
    const q = new AttestationQueue(submit, { sizeCap: 50, latencyBudgetMs: 10_000, ...h.opts });

    const first = q.enqueue(claim(1));
    h.advance(4_000);
    q.enqueue(claim(2));
    h.advance(4_000);
    q.enqueue(claim(3));
    expect(submit).not.toHaveBeenCalled();

    h.advance(2_000); // first entry now exactly 10s old
    expect((await first).txHash).toBe("tx");
    expect(submit.mock.calls[0][0]).toHaveLength(3);
  });
});

describe("AttestationQueue replay and failure handling", () => {
  const h2 = () => harness();

  it("rejects a nullifier that is already queued instead of poisoning the batch", async () => {
    const h = h2();
    const submit = vi.fn().mockResolvedValue("tx");
    const q = new AttestationQueue(submit, { sizeCap: 50, latencyBudgetMs: 10_000, ...h.opts });

    const first = q.enqueue(claim(1));
    // Same nullifier, different claim key - the contract would revert the whole
    // batch over this, taking unrelated claims down with it.
    await expect(
      q.enqueue({ ...claim(9), nullifier: claim(1).nullifier }),
    ).rejects.toBeInstanceOf(DuplicateNullifierError);

    h.advance(10_000);
    expect((await first).txHash).toBe("tx");
    expect(submit.mock.calls[0][0]).toHaveLength(1);
  });

  it("allows a nullifier again once its batch has flushed", async () => {
    const h = h2();
    const submit = vi.fn().mockResolvedValue("tx");
    const q = new AttestationQueue(submit, { sizeCap: 1, latencyBudgetMs: 10_000, ...h.opts });

    await q.enqueue(claim(1));
    expect((await q.enqueue(claim(1))).txHash).toBe("tx");
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("rejects every caller in a batch when the submission fails", async () => {
    const h = h2();
    const submit = vi.fn().mockRejectedValue(new Error("tx failed on-chain"));
    const q = new AttestationQueue(submit, { sizeCap: 2, latencyBudgetMs: 10_000, ...h.opts });

    const a = q.enqueue(claim(1));
    const b = q.enqueue(claim(2));

    // attest_batch is atomic, so nothing landed - no caller may be told it did.
    await expect(a).rejects.toThrow("tx failed on-chain");
    await expect(b).rejects.toThrow("tx failed on-chain");
    expect(q.depth).toBe(0);
  });

  it("puts entries arriving during a flush into the next batch", async () => {
    const h = h2();
    let release: (v: string) => void = () => {};
    const submit = vi
      .fn()
      .mockImplementationOnce(() => new Promise<string>((res) => { release = res; }))
      .mockResolvedValue("tx-2");
    const q = new AttestationQueue(submit, { sizeCap: 1, latencyBudgetMs: 10_000, ...h.opts });

    const first = q.enqueue(claim(1));
    const second = q.enqueue(claim(2));

    expect(submit).toHaveBeenCalledTimes(1);
    release("tx-1");
    expect((await first).txHash).toBe("tx-1");
    expect((await second).txHash).toBe("tx-2");
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("passes the email key through only when present", async () => {
    const h = h2();
    const submit = vi.fn().mockResolvedValue("tx");
    const q = new AttestationQueue(submit, { sizeCap: 2, latencyBudgetMs: 10_000, ...h.opts });

    await Promise.all([
      q.enqueue({ ...claim(1), emailKey: bytes(7) }),
      q.enqueue(claim(2)),
    ]);

    const sent = submit.mock.calls[0][0];
    expect(sent[0].emailKey).toEqual(bytes(7));
    expect(sent[1].emailKey).toBeUndefined();
  });

  it("is a no-op when flushed empty", async () => {
    const h = h2();
    const submit = vi.fn().mockResolvedValue("tx");
    const q = new AttestationQueue(submit, { sizeCap: 5, latencyBudgetMs: 10_000, ...h.opts });

    await q.flush();
    expect(submit).not.toHaveBeenCalled();
  });
});
