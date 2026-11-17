import type { SupabaseClient } from "@supabase/supabase-js";
import type { Day, Exercise } from "@/lib/domain";
import type { Op } from "@/lib/ops";
import type { GymRepository } from "@/lib/repository";
import {
  entryToRow,
  mapSnapshot,
  type DayRow,
  type ExerciseRow,
} from "@/lib/supabase/map";

const DAY_SELECT = `
  id, date, focus, notes, created_at, updated_at,
  gym_entries (
    id, day_id, exercise_id, weight, sxr, done, position, notes, created_at, updated_at,
    gym_exercises ( id, name )
  )
`;

async function loadAll(client: SupabaseClient) {
  const exercisesResult = await client
    .from("gym_exercises")
    .select("id, name, focus, targets, created_at")
    .order("name", { ascending: true });
  if (exercisesResult.error) throw exercisesResult.error;

  const days: DayRow[] = [];
  const pageSize = 200;
  for (let from = 0; ; from += pageSize) {
    const result = await client
      .from("gym_days")
      .select(DAY_SELECT)
      .order("date", { ascending: false })
      .order("position", { referencedTable: "gym_entries", ascending: true })
      .range(from, from + pageSize - 1);
    if (result.error) throw result.error;
    const batch = (result.data ?? []) as unknown as DayRow[];
    days.push(...batch);
    if (batch.length < pageSize) break;
  }

  return mapSnapshot(days, (exercisesResult.data ?? []) as ExerciseRow[]);
}

function assertOk(error: { message: string } | null, data?: { id: string }[] | null) {
  if (error) throw new Error(error.message);
  if (data && data.length === 0) {
    throw new Error("Change was not saved");
  }
}

export function createSupabaseRepository(client: SupabaseClient): GymRepository {
  return {
    load: () => loadAll(client),
    async apply(op: Op) {
      switch (op.kind) {
        case "create-day": {
          const dayResult = await client.from("gym_days").upsert({
            id: op.day.id,
            date: op.day.date,
            focus: op.day.focus,
            notes: op.day.notes,
          });
          if (dayResult.error) throw new Error(dayResult.error.message);
          if (op.day.entries.length > 0) {
            const entriesResult = await client
              .from("gym_entries")
              .upsert(op.day.entries.map(entryToRow));
            if (entriesResult.error) throw new Error(entriesResult.error.message);
          }
          return;
        }
        case "update-day": {
          const result = await client
            .from("gym_days")
            .update(op.patch)
            .eq("id", op.id)
            .select("id");
          assertOk(result.error, result.data as { id: string }[] | null);
          return;
        }
        case "delete-day": {
          const result = await client.from("gym_days").delete().eq("id", op.id);
          if (result.error) throw new Error(result.error.message);
          return;
        }
        case "create-exercise": {
          const result = await client.from("gym_exercises").upsert({
            id: op.exercise.id,
            name: op.exercise.name,
            focus: op.exercise.focus,
            targets: op.exercise.targets,
          });
          if (result.error) throw new Error(result.error.message);
          return;
        }
        case "create-entry": {
          const result = await client.from("gym_entries").upsert(entryToRow(op.entry));
          if (result.error) throw new Error(result.error.message);
          return;
        }
        case "update-entry": {
          const result = await client
            .from("gym_entries")
            .update(op.patch)
            .eq("id", op.id)
            .select("id");
          assertOk(result.error, result.data as { id: string }[] | null);
          return;
        }
        case "delete-entry": {
          const result = await client.from("gym_entries").delete().eq("id", op.id);
          if (result.error) throw new Error(result.error.message);
          return;
        }
        case "reorder": {
          const results = await Promise.all(
            op.ids.map((id, position) =>
              client.from("gym_entries").update({ position }).eq("id", id).select("id"),
            ),
          );
          for (const result of results) {
            assertOk(result.error, result.data as { id: string }[] | null);
          }
          return;
        }
        default:
          return;
      }
    },
  };
}

export type { Day, Exercise };
