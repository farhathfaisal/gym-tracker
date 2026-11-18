import {
  type Day,
  type Entry,
  type Exercise,
  type Snapshot,
  sortDays,
  sortEntries,
} from "@/lib/domain";

export type Op =
  | { kind: "create-day"; day: Day }
  | { kind: "update-day"; id: string; patch: { date?: string; focus?: string | null } }
  | { kind: "delete-day"; id: string }
  | { kind: "create-exercise"; exercise: Exercise }
  | { kind: "update-exercise"; id: string; patch: { name?: string; focus?: string | null } }
  | { kind: "create-entry"; entry: Entry }
  | {
      kind: "update-entry";
      id: string;
      patch: { weight?: number | null; sxr?: string | null; done?: boolean; notes?: string | null };
    }
  | { kind: "delete-entry"; id: string }
  | { kind: "reorder"; dayId: string; ids: string[] };

function mapDay(days: Day[], id: string, update: (day: Day) => Day): Day[] {
  return days.map((day) => (day.id === id ? update(day) : day));
}

export function applyOp(snapshot: Snapshot, op: Op): Snapshot {
  switch (op.kind) {
    case "create-exercise":
      if (snapshot.exercises.some((exercise) => exercise.id === op.exercise.id)) {
        return snapshot;
      }
      return {
        ...snapshot,
        exercises: [...snapshot.exercises, op.exercise].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      };
    case "create-day": {
      const day: Day = {
        ...op.day,
        entries: sortEntries(op.day.entries),
      };
      const without = snapshot.days.filter((item) => item.id !== day.id);
      return { ...snapshot, days: sortDays([day, ...without]) };
    }
    case "update-day":
      return {
        ...snapshot,
        days: sortDays(
          mapDay(snapshot.days, op.id, (day) => ({
            ...day,
            ...op.patch,
            updatedAt: new Date().toISOString(),
          })),
        ),
      };
    case "delete-day":
      return {
        ...snapshot,
        days: snapshot.days.filter((day) => day.id !== op.id),
      };
    case "update-exercise": {
      const current = snapshot.exercises.find((exercise) => exercise.id === op.id);
      if (!current) return snapshot;
      const name = op.patch.name?.trim() || current.name;
      const focus = op.patch.focus === undefined ? current.focus : op.patch.focus;
      return {
        ...snapshot,
        exercises: snapshot.exercises
          .map((exercise) =>
            exercise.id === op.id
              ? { ...exercise, name, focus, targets: focus ? [focus] : [] }
              : exercise,
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
        days: snapshot.days.map((day) => ({
          ...day,
          entries: day.entries.map((entry) =>
            entry.exerciseId === op.id ? { ...entry, name } : entry,
          ),
        })),
      };
    }
    case "create-entry":
      return {
        ...snapshot,
        days: mapDay(snapshot.days, op.entry.dayId, (day) => ({
          ...day,
          entries: sortEntries([
            ...day.entries.filter((entry) => entry.id !== op.entry.id),
            op.entry,
          ]),
        })),
      };
    case "update-entry":
      return {
        ...snapshot,
        days: snapshot.days.map((day) => ({
          ...day,
          entries: day.entries.map((entry) =>
            entry.id === op.id
              ? { ...entry, ...op.patch, updatedAt: new Date().toISOString() }
              : entry,
          ),
        })),
      };
    case "delete-entry":
      return {
        ...snapshot,
        days: snapshot.days.map((day) => ({
          ...day,
          entries: day.entries.filter((entry) => entry.id !== op.id),
        })),
      };
    case "reorder":
      return {
        ...snapshot,
        days: mapDay(snapshot.days, op.dayId, (day) => {
          const byId = new Map(day.entries.map((entry) => [entry.id, entry]));
          const ordered: Entry[] = [];
          op.ids.forEach((id, position) => {
            const entry = byId.get(id);
            if (entry) ordered.push({ ...entry, position });
          });
          for (const entry of day.entries) {
            if (!op.ids.includes(entry.id)) ordered.push(entry);
          }
          return { ...day, entries: sortEntries(ordered) };
        }),
      };
    default:
      return snapshot;
  }
}

export function mergeQueue(queue: Op[], op: Op): Op[] {
  if (op.kind === "update-entry") {
    const index = queue.findIndex(
      (item) => item.kind === "update-entry" && item.id === op.id,
    );
    if (index >= 0) {
      const current = queue[index];
      if (current.kind !== "update-entry") return [...queue, op];
      const next = queue.slice();
      next[index] = {
        kind: "update-entry",
        id: op.id,
        patch: { ...current.patch, ...op.patch },
      };
      return next;
    }
  }
  if (op.kind === "update-exercise") {
    const index = queue.findIndex(
      (item) => item.kind === "update-exercise" && item.id === op.id,
    );
    if (index >= 0) {
      const current = queue[index];
      if (current.kind !== "update-exercise") return [...queue, op];
      const next = queue.slice();
      next[index] = {
        kind: "update-exercise",
        id: op.id,
        patch: { ...current.patch, ...op.patch },
      };
      return next;
    }
  }
  if (op.kind === "reorder") {
    const index = queue.findIndex(
      (item) => item.kind === "reorder" && item.dayId === op.dayId,
    );
    if (index >= 0) {
      const next = queue.slice();
      next[index] = op;
      return next;
    }
  }
  return [...queue, op];
}
