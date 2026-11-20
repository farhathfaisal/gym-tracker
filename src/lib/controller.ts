import {
  arrangeSnapshot,
  arrangeWorkout,
  defaultSxr,
  findEntry,
  melbourneToday,
  previousSxr,
  previousWeight,
  type Day,
  type Entry,
  type Exercise,
  type Snapshot,
} from "@/lib/domain";
import { applyOp, mergeQueue, type Op } from "@/lib/ops";
import type { GymRepository } from "@/lib/repository";
import type { Kv } from "@/lib/storage";

export type SyncStatus = "idle" | "saving" | "offline" | "error";

export type GymState = Snapshot & {
  status: "loading" | "ready" | "error";
  pending: number;
  sync: SyncStatus;
  error: string | null;
};

type Schedule = (ms: number, fn: () => void) => () => void;

export type ControllerOptions = {
  repo: GymRepository;
  storage: Kv;
  storageKey: string;
  now?: () => Date;
  online?: () => boolean;
  schedule?: Schedule;
  debounceMs?: number;
};

export type GymController = {
  getState: () => GymState;
  subscribe: (listener: () => void) => () => void;
  load: () => Promise<void>;
  flush: () => Promise<void>;
  settled: () => Promise<void>;
  refreshConnectivity: () => void;
  clearLocal: () => void;
  repeatDay: (sourceId: string) => Day | null;
  createDay: (date: string, focus: string | null) => Day | null;
  setDone: (entryId: string, done: boolean) => void;
  setWeight: (entryId: string, weight: number | null) => void;
  setSxr: (entryId: string, sxr: string | null) => void;
  setNote: (entryId: string, notes: string | null) => void;
  updateExercise: (exerciseId: string, patch: { name?: string; focus?: string | null }) => void;
  reorder: (dayId: string, ids: string[]) => void;
  deleteEntry: (entryId: string) => void;
  replaceEntry: (entryId: string, exercise: Exercise) => void;
  addEntry: (dayId: string, exercise: Exercise) => Entry | null;
  createExercise: (name: string, focus: string | null) => Exercise | null;
  createExerciseAndAdd: (dayId: string, name: string, focus: string | null) => Entry | null;
  updateDay: (dayId: string, patch: { date?: string; focus?: string | null }) => void;
  deleteDay: (dayId: string) => void;
};

export const initialGymState: GymState = {
  status: "loading",
  days: [],
  exercises: [],
  pending: 0,
  sync: "idle",
  error: null,
};

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function createController(options: ControllerOptions): GymController {
  const now = options.now ?? (() => new Date());
  const online = options.online ?? (() => true);
  const schedule: Schedule =
    options.schedule ??
    ((ms, fn) => {
      const id = setTimeout(fn, ms);
      return () => clearTimeout(id);
    });
  const debounceMs = options.debounceMs ?? 400;
  const cacheKey = `${options.storageKey}.cache`;
  const queueKey = `${options.storageKey}.queue`;

  let state: GymState = initialGymState;
  let queue: Op[] = [];
  let attempt = 0;
  let cancelDebounce = () => {};
  let chain: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  function writeCache() {
    options.storage.setItem(
      cacheKey,
      JSON.stringify({ days: state.days, exercises: state.exercises }),
    );
  }

  function writeQueue() {
    options.storage.setItem(queueKey, JSON.stringify(queue));
  }

  function readStored(): { snapshot: Snapshot | null; queue: Op[] } {
    let snapshot: Snapshot | null = null;
    let storedQueue: Op[] = [];
    try {
      const raw = options.storage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Snapshot;
        if (Array.isArray(parsed.days) && Array.isArray(parsed.exercises)) {
          snapshot = parsed;
        }
      }
    } catch {
      snapshot = null;
    }
    try {
      const raw = options.storage.getItem(queueKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Op[];
        if (Array.isArray(parsed)) storedQueue = parsed;
      }
    } catch {
      storedQueue = [];
    }
    return { snapshot, queue: storedQueue };
  }

  function emit(persistCache: boolean) {
    state = { ...state, pending: queue.length };
    if (persistCache) writeCache();
    writeQueue();
    for (const listener of listeners) listener();
  }

  function publish(next: Snapshot, persistCache = true) {
    state = {
      ...state,
      days: next.days,
      exercises: next.exercises,
      status: "ready",
      error: null,
    };
    emit(persistCache);
  }

  async function doFlush() {
    if (queue.length === 0) {
      state = { ...state, sync: "idle", pending: 0, error: null };
      emit(false);
      return;
    }
    if (!online()) {
      state = { ...state, sync: "offline", pending: queue.length };
      emit(false);
      return;
    }
    state = { ...state, sync: "saving", pending: queue.length };
    emit(false);
    try {
      while (queue.length > 0) {
        if (!online()) throw new Error("offline");
        await options.repo.apply(queue[0]);
        queue = queue.slice(1);
        attempt = 0;
        writeQueue();
      }
      try {
        const fresh = arrangeSnapshot(await options.repo.load());
        if (queue.length === 0) {
          state = {
            ...state,
            days: fresh.days,
            exercises: fresh.exercises,
            status: "ready",
          };
          writeCache();
        }
      } catch {
        /* Local state already has the edit. A failed reload must not drop it. */
      }
      state = {
        ...state,
        sync: queue.length === 0 ? "idle" : "saving",
        pending: queue.length,
        error: null,
        status: "ready",
      };
      emit(false);
    } catch (error) {
      const offline = !online() || (error instanceof Error && error.message === "offline");
      const locked = error instanceof Error && error.message === "locked";
      state = {
        ...state,
        sync: offline ? "offline" : "error",
        pending: queue.length,
        error: offline
          ? null
          : locked
            ? "locked"
            : "Saved on this phone. It will sync when the connection is back.",
      };
      emit(false);
      if (!offline && !locked) {
        attempt += 1;
        const delay = Math.min(30_000, 800 * 2 ** (attempt - 1));
        schedule(delay, () => {
          void requestFlush();
        });
      }
    }
  }

  function requestFlush(): Promise<void> {
    const run = chain.then(() => doFlush());
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function commit(op: Op, when: "now" | "soon") {
    const next = applyOp(
      { days: state.days, exercises: state.exercises },
      op,
    );
    queue = mergeQueue(queue, op);
    publish(next, true);
    if (when === "now") {
      cancelDebounce();
      void requestFlush();
    } else {
      cancelDebounce();
      cancelDebounce = schedule(debounceMs, () => {
        void requestFlush();
      });
    }
  }

  function patchEntry(
    entryId: string,
    patch: { weight?: number | null; sxr?: string | null; done?: boolean; notes?: string | null },
    when: "now" | "soon",
  ) {
    const found = findEntry(state.days, entryId);
    if (!found) return;
    if (patch.done !== undefined && patch.done === found.entry.done && Object.keys(patch).length === 1) {
      return;
    }
    if (
      patch.weight !== undefined &&
      patch.weight === found.entry.weight &&
      Object.keys(patch).length === 1
    ) {
      return;
    }
    if (patch.sxr !== undefined && patch.sxr === found.entry.sxr && Object.keys(patch).length === 1) {
      return;
    }
    if (patch.notes !== undefined && patch.notes === found.entry.notes && Object.keys(patch).length === 1) {
      return;
    }
    commit({ kind: "update-entry", id: entryId, patch }, when);
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async load() {
      const stored = readStored();
      queue = stored.queue;
      if (stored.snapshot) {
        const arranged = arrangeSnapshot(stored.snapshot);
        state = {
          ...state,
          days: arranged.days,
          exercises: arranged.exercises,
          status: "ready",
          pending: queue.length,
          sync: queue.length > 0 ? "saving" : "idle",
        };
        if (arranged !== stored.snapshot) writeCache();
        emit(false);
      }
      if (queue.length > 0) {
        await requestFlush();
      }
      if (queue.length === 0) {
        try {
          const fresh = arrangeSnapshot(await options.repo.load());
          if (queue.length === 0) {
            state = {
              ...state,
              days: fresh.days,
              exercises: fresh.exercises,
              status: "ready",
              sync: "idle",
              error: null,
              pending: 0,
            };
            writeCache();
            emit(false);
          }
        } catch (error) {
          const locked = error instanceof Error && error.message === "locked";
          if (locked || !stored.snapshot) {
            state = {
              ...state,
              status: stored.snapshot ? "ready" : "error",
              error: locked
                ? "locked"
                : "Couldn’t load workouts. Check the connection and try again.",
            };
            emit(false);
          }
        }
      }
    },
    flush: () => requestFlush(),
    settled: () => chain,
    refreshConnectivity() {
      if (online()) void requestFlush();
      else if (queue.length > 0) {
        state = { ...state, sync: "offline", pending: queue.length };
        emit(false);
      }
    },
    clearLocal() {
      queue = [];
      cancelDebounce();
      options.storage.removeItem(cacheKey);
      options.storage.removeItem(queueKey);
      state = { ...initialGymState, status: "loading" };
      for (const listener of listeners) listener();
    },
    createDay(date, focus) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      const createdAt = now().toISOString();
      const day: Day = {
        id: crypto.randomUUID(),
        date,
        focus,
        notes: null,
        createdAt,
        updatedAt: createdAt,
        entries: [],
      };
      commit({ kind: "create-day", day }, "now");
      return day;
    },
    repeatDay(sourceId) {
      const found = state.days.find((day) => day.id === sourceId);
      if (!found) return null;
      const source = arrangeWorkout(found);
      const createdAt = now().toISOString();
      const id = crypto.randomUUID();
      const day: Day = {
        id,
        date: melbourneToday(now()),
        focus: source.focus,
        notes: null,
        createdAt,
        updatedAt: createdAt,
        entries: [...source.entries]
          .sort((a, b) => a.position - b.position)
          .map((entry, position) => ({
            ...entry,
            id: crypto.randomUUID(),
            dayId: id,
            done: false,
            notes: null,
            position,
            createdAt,
            updatedAt: createdAt,
          })),
      };
      commit({ kind: "create-day", day }, "now");
      return day;
    },
    setDone(entryId, done) {
      patchEntry(entryId, { done }, "now");
    },
    setWeight(entryId, weight) {
      patchEntry(entryId, { weight }, "soon");
    },
    setSxr(entryId, sxr) {
      patchEntry(entryId, { sxr }, "soon");
    },
    setNote(entryId, notes) {
      patchEntry(entryId, { notes: notes?.trim() ? notes.trim() : null }, "soon");
    },
    updateExercise(exerciseId, patch) {
      const exercise = state.exercises.find((item) => item.id === exerciseId);
      if (!exercise) return;
      const next: { name?: string; focus?: string | null } = {};
      if (patch.name !== undefined) {
        const name = patch.name.trim();
        if (!name || name === exercise.name) {
          if (patch.focus === undefined) return;
        } else {
          next.name = name;
        }
      }
      if (patch.focus !== undefined && patch.focus !== exercise.focus) next.focus = patch.focus;
      if (next.name === undefined && next.focus === undefined) return;
      commit({ kind: "update-exercise", id: exerciseId, patch: next }, "now");
    },
    reorder(dayId, ids) {
      const day = state.days.find((item) => item.id === dayId);
      if (!day) return;
      const current = [...day.entries]
        .sort((a, b) => a.position - b.position)
        .map((entry) => entry.id);
      if (sameIds(current, ids)) return;
      commit({ kind: "reorder", dayId, ids }, "now");
    },
    deleteEntry(entryId) {
      if (!findEntry(state.days, entryId)) return;
      commit({ kind: "delete-entry", id: entryId }, "now");
    },
    replaceEntry(entryId, exercise) {
      const found = findEntry(state.days, entryId);
      if (!found || found.entry.exerciseId === exercise.id) return;
      const weight =
        previousWeight(state.days, exercise.id, found.day, found.entry.position)?.weight ?? null;
      const sxr = defaultSxr(
        exercise,
        previousSxr(state.days, exercise.id, found.day, found.entry.position),
      );
      commit(
        {
          kind: "replace-entry",
          id: entryId,
          exerciseId: exercise.id,
          name: exercise.name,
          weight,
          sxr,
        },
        "now",
      );
    },
    addEntry(dayId, exercise) {
      const day = state.days.find((item) => item.id === dayId);
      if (!day) return null;
      const createdAt = now().toISOString();
      const position =
        day.entries.reduce((max, entry) => Math.max(max, entry.position), -1) + 1;
      const entry: Entry = {
        id: crypto.randomUUID(),
        dayId,
        exerciseId: exercise.id,
        name: exercise.name,
        weight: previousWeight(state.days, exercise.id, day, position)?.weight ?? null,
        sxr: defaultSxr(exercise, previousSxr(state.days, exercise.id, day, position)),
        done: false,
        position,
        notes: null,
        createdAt,
        updatedAt: createdAt,
      };
      commit({ kind: "create-entry", entry }, "now");
      return entry;
    },
    createExercise(name, focus) {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const existing = state.exercises.find(
        (exercise) => exercise.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (existing) return existing;
      const exercise: Exercise = {
        id: crypto.randomUUID(),
        name: trimmed,
        focus,
        targets: focus ? [focus] : [],
        createdAt: now().toISOString(),
      };
      commit({ kind: "create-exercise", exercise }, "now");
      return exercise;
    },
    createExerciseAndAdd(dayId, name, focus) {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const existing = state.exercises.find(
        (exercise) => exercise.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (existing) return this.addEntry(dayId, existing);
      const exercise: Exercise = {
        id: crypto.randomUUID(),
        name: trimmed,
        focus,
        targets: focus ? [focus] : [],
        createdAt: now().toISOString(),
      };
      commit({ kind: "create-exercise", exercise }, "now");
      return this.addEntry(dayId, exercise);
    },
    updateDay(dayId, patch) {
      const day = state.days.find((item) => item.id === dayId);
      if (!day) return;
      if (patch.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) return;
      commit({ kind: "update-day", id: dayId, patch }, "now");
    },
    deleteDay(dayId) {
      if (!state.days.some((day) => day.id === dayId)) return;
      commit({ kind: "delete-day", id: dayId }, "now");
    },
  };
}
