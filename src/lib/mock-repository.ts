import { type Snapshot } from "@/lib/domain";
import { applyOp, type Op } from "@/lib/ops";
import type { GymRepository } from "@/lib/repository";

export type MockRepository = GymRepository & {
  failNext(times: number): void;
  peek(): Snapshot;
};

export function createMockRepository(
  initial: Snapshot,
  options?: { latencyMs?: number },
): MockRepository {
  let snapshot: Snapshot = structuredClone(initial);
  let failuresLeft = 0;
  const latency = options?.latencyMs ?? 0;

  async function gate() {
    if (latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }
    if (failuresLeft > 0) {
      failuresLeft -= 1;
      throw new Error("network");
    }
  }

  return {
    failNext(times: number) {
      failuresLeft = times;
    },
    peek() {
      return structuredClone(snapshot);
    },
    async load() {
      await gate();
      return structuredClone(snapshot);
    },
    async apply(op: Op) {
      await gate();
      snapshot = applyOp(snapshot, op);
    },
  };
}
