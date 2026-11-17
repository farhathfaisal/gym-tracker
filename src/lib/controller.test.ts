import { describe, expect, it } from "vitest";
import { createController } from "@/lib/controller";
import { melbourneToday, progressOf } from "@/lib/domain";
import { buildSeed } from "@/lib/mock-seed";
import { createMockRepository } from "@/lib/mock-repository";
import { memoryKv } from "@/lib/storage";

function harness(options?: { failTimes?: number; online?: boolean }) {
  const now = new Date("2026-11-16T22:30:00.000Z");
  const today = melbourneToday(now);
  const repo = createMockRepository(buildSeed(today));
  if (options?.failTimes) repo.failNext(options.failTimes);
  let online = options?.online ?? true;
  const scheduled: (() => void)[] = [];
  const controller = createController({
    repo,
    storage: memoryKv(),
    storageKey: "test",
    now: () => now,
    online: () => online,
    debounceMs: 400,
    schedule: (_ms, fn) => {
      scheduled.push(fn);
      return () => {
        const index = scheduled.indexOf(fn);
        if (index >= 0) scheduled.splice(index, 1);
      };
    },
  });
  return {
    controller,
    repo,
    today,
    scheduled,
    setOnline(value: boolean) {
      online = value;
    },
    async runScheduled() {
      const jobs = scheduled.splice(0, scheduled.length);
      for (const job of jobs) job();
      await controller.settled();
    },
  };
}

describe("controller", () => {
  it("repeats a day onto today with the same order and weights, unticked", async () => {
    const { controller, repo, today } = harness();
    await controller.load();
    repo.failNext(0);
    const source = controller.getState().days.find((day) => day.focus === "Legs")!;
    expect(source.entries.some((entry) => entry.notes === "Belt on")).toBe(true);
    const copy = controller.repeatDay(source.id);
    expect(copy).not.toBeNull();
    expect(copy!.date).toBe(today);
    expect(copy!.entries.map((entry) => entry.done)).toEqual(copy!.entries.map(() => false));
    expect(copy!.entries.map((entry) => entry.notes)).toEqual(copy!.entries.map(() => null));
    expect(copy!.entries.map((entry) => [entry.name, entry.weight, entry.sxr])).toEqual(
      [...source.entries]
        .sort((a, b) => a.position - b.position)
        .map((entry) => [entry.name, entry.weight, entry.sxr]),
    );
    expect(progressOf(copy!).done).toBe(0);
    await controller.settled();
    const stored = repo.peek().days.find((day) => day.id === copy!.id);
    expect(stored?.entries.every((entry) => entry.done === false)).toBe(true);
  });

  it("ticks immediately and keeps the tick if the network fails, then retries", async () => {
    const { controller, repo, runScheduled } = harness();
    await controller.load();
    repo.failNext(1);
    const entry = controller.getState().days[0].entries.find((item) => !item.done)!;
    controller.setDone(entry.id, true);
    expect(controller.getState().days[0].entries.find((item) => item.id === entry.id)?.done).toBe(
      true,
    );
    await controller.settled();
    expect(repo.peek().days.flatMap((day) => day.entries).find((item) => item.id === entry.id)?.done).toBe(
      false,
    );
    expect(controller.getState().pending).toBe(1);
    expect(controller.getState().sync).toBe("error");
    await runScheduled();
    expect(repo.peek().days.flatMap((day) => day.entries).find((item) => item.id === entry.id)?.done).toBe(
      true,
    );
    expect(controller.getState().pending).toBe(0);
    expect(controller.getState().sync).toBe("idle");
  });

  it("keeps a weight edit offline and syncs it later", async () => {
    const { controller, repo, setOnline } = harness();
    await controller.load();
    setOnline(false);
    const entry = controller.getState().days[0].entries[0];
    controller.setWeight(entry.id, 32.5);
    controller.setWeight(entry.id, 35);
    await controller.flush();
    expect(controller.getState().sync).toBe("offline");
    expect(controller.getState().pending).toBe(1);
    expect(repo.peek().days.flatMap((day) => day.entries).find((item) => item.id === entry.id)?.weight).not.toBe(
      35,
    );
    setOnline(true);
    controller.refreshConnectivity();
    await controller.settled();
    expect(repo.peek().days.flatMap((day) => day.entries).find((item) => item.id === entry.id)?.weight).toBe(
      35,
    );
  });

  it("reloads a pending edit from storage before the server has it", async () => {
    const now = new Date("2026-11-16T22:30:00.000Z");
    const today = melbourneToday(now);
    const repo = createMockRepository(buildSeed(today));
    const storage = memoryKv();
    const first = createController({
      repo,
      storage,
      storageKey: "persist",
      now: () => now,
      online: () => false,
      debounceMs: 10_000,
      schedule: () => () => {},
    });
    await first.load();
    const entry = first.getState().days[0].entries[0];
    first.setWeight(entry.id, 42.5);
    const second = createController({
      repo,
      storage,
      storageKey: "persist",
      now: () => now,
      online: () => true,
      schedule: () => () => {},
    });
    await second.load();
    expect(second.getState().days.flatMap((day) => day.entries).find((item) => item.id === entry.id)?.weight).toBe(
      42.5,
    );
    expect(repo.peek().days.flatMap((day) => day.entries).find((item) => item.id === entry.id)?.weight).toBe(
      42.5,
    );
  });

  it("reorders, deletes, and adds an exercise with the last weight", async () => {
    const { controller, repo } = harness();
    await controller.load();
    const day = controller.getState().days.find((item) => item.id === "day-today")!;
    const ids = [...day.entries].sort((a, b) => a.position - b.position).map((entry) => entry.id);
    const reversed = [...ids].reverse();
    controller.reorder(day.id, reversed);
    await controller.settled();
    expect(
      repo
        .peek()
        .days.find((item) => item.id === day.id)!
        .entries.sort((a, b) => a.position - b.position)
        .map((entry) => entry.id),
    ).toEqual(reversed);

    controller.deleteEntry(reversed[0]);
    await controller.settled();
    expect(repo.peek().days.find((item) => item.id === day.id)!.entries.some((entry) => entry.id === reversed[0])).toBe(
      false,
    );

    const press = controller.getState().exercises.find((exercise) => exercise.name === "DB Shoulder Press")!;
    const added = controller.addEntry(day.id, press);
    expect(added?.weight).toBe(30);
    expect(added?.sxr).toBe("3 x 8-10");
    expect(added?.done).toBe(false);
    const created = controller.createExerciseAndAdd(day.id, "Face Pull", "Shoulder");
    expect(created?.name).toBe("Face Pull");
    expect(created?.sxr).toBe("3 x 8-10");
    await controller.settled();
    expect(repo.peek().exercises.some((exercise) => exercise.name === "Face Pull")).toBe(true);
  });
});
