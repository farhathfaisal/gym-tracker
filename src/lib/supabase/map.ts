import {
  arrangeWorkout,
  roundWeight,
  sortDays,
  sortEntries,
  type Day,
  type Entry,
  type Exercise,
  type Snapshot,
} from "@/lib/domain";

type ExerciseJoin = { id: string; name: string } | null;

export type EntryRow = {
  id: string;
  day_id: string;
  exercise_id: string | null;
  weight: number | string | null;
  sxr: string | null;
  done: boolean;
  position: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  gym_exercises?: ExerciseJoin;
};

export type DayRow = {
  id: string;
  date: string;
  focus: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  gym_entries?: EntryRow[] | null;
};

export type ExerciseRow = {
  id: string;
  name: string;
  focus: string | null;
  targets: string[] | null;
  created_at: string;
};

export function numberOrNull(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return roundWeight(numeric);
}

export function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    focus: row.focus,
    targets: row.targets ?? [],
    createdAt: row.created_at,
  };
}

export function mapEntry(row: EntryRow, fallbackName = "Deleted exercise"): Entry {
  return {
    id: row.id,
    dayId: row.day_id,
    exerciseId: row.exercise_id,
    name: row.gym_exercises?.name ?? fallbackName,
    weight: numberOrNull(row.weight),
    sxr: row.sxr,
    done: row.done,
    position: row.position,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDay(row: DayRow): Day {
  return {
    id: row.id,
    date: row.date,
    focus: row.focus,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entries: sortEntries((row.gym_entries ?? []).map((entry) => mapEntry(entry))),
  };
}

export function mapSnapshot(days: DayRow[], exercises: ExerciseRow[]): Snapshot {
  const names = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  return {
    exercises: exercises.map(mapExercise).sort((a, b) => a.name.localeCompare(b.name)),
    days: sortDays(
      days.map((day) => {
        const mapped = mapDay(day);
        return arrangeWorkout({
          ...mapped,
          entries: mapped.entries.map((entry) => ({
            ...entry,
            name:
              entry.exerciseId && names.get(entry.exerciseId)
                ? names.get(entry.exerciseId)!
                : entry.name,
          })),
        });
      }),
    ),
  };
}

export function entryToRow(entry: Entry) {
  return {
    id: entry.id,
    day_id: entry.dayId,
    exercise_id: entry.exerciseId,
    weight: entry.weight,
    sxr: entry.sxr,
    done: entry.done,
    position: entry.position,
    notes: entry.notes,
  };
}
