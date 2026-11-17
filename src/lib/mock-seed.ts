import {
  addDays,
  type Day,
  type Entry,
  type Exercise,
  type Snapshot,
  sortDays,
} from "@/lib/domain";

function exercise(
  id: string,
  name: string,
  focus: string | null,
  createdAt: string,
): Exercise {
  return {
    id,
    name,
    focus,
    targets: focus ? [focus] : [],
    createdAt,
  };
}

const CREATED = "2024-01-01T00:00:00.000Z";

export const SEED_EXERCISES: Exercise[] = [
  exercise("00000000-0000-4000-8000-000000000001", "DB Shoulder Press", "Shoulder", CREATED),
  exercise("00000000-0000-4000-8000-000000000002", "Cross-body Cable Y-Raise", "Shoulder", CREATED),
  exercise("00000000-0000-4000-8000-000000000003", "DB Side Lateral Raise", "Shoulder", CREATED),
  exercise("00000000-0000-4000-8000-000000000004", "Machine Chest Press", "Chest", CREATED),
  exercise("00000000-0000-4000-8000-000000000005", "Pec Fly", "Chest", CREATED),
  exercise("00000000-0000-4000-8000-000000000006", "DB Incline Chest Press", "Chest", CREATED),
  exercise("00000000-0000-4000-8000-000000000007", "Tricep Extension", "Arms", CREATED),
  exercise("00000000-0000-4000-8000-000000000008", "DB Curl", "Arms", CREATED),
  exercise("00000000-0000-4000-8000-000000000009", "DB Hammer Curl", "Arms", CREATED),
  exercise("00000000-0000-4000-8000-00000000000a", "Overhead Tricep Extension", "Arms", CREATED),
  exercise("00000000-0000-4000-8000-00000000000b", "Barbell Deep Squat", "Legs", CREATED),
  exercise("00000000-0000-4000-8000-00000000000c", "Leg Press", "Legs", CREATED),
  exercise("00000000-0000-4000-8000-00000000000d", "Prone Leg Curl", "Legs", CREATED),
  exercise("00000000-0000-4000-8000-00000000000e", "Leg Extensions", "Legs", CREATED),
  exercise("00000000-0000-4000-8000-00000000000f", "Hip Thrust", "Legs", CREATED),
  exercise("00000000-0000-4000-8000-000000000010", "Calf Raise", "Legs", CREATED),
  exercise("00000000-0000-4000-8000-000000000011", "Lat Pulldown", "Back", CREATED),
  exercise("00000000-0000-4000-8000-000000000012", "Seated Row", "Back", CREATED),
  exercise("00000000-0000-4000-8000-000000000013", "Diverging Seated Row", "Back", CREATED),
  exercise("00000000-0000-4000-8000-000000000014", "Kneeling Cable Crunch", "Abs", CREATED),
  exercise("00000000-0000-4000-8000-000000000015", "Hanging Raises", "Abs", CREATED),
  exercise("00000000-0000-4000-8000-000000000016", "Jog", "Cardio", CREATED),
];

const byName = Object.fromEntries(SEED_EXERCISES.map((item) => [item.name, item]));

type Row = [string, number | null, string, boolean, string?];

function buildDay(
  id: string,
  date: string,
  focus: string,
  createdAt: string,
  rows: Row[],
): Day {
  const entries: Entry[] = rows.map((row, position) => {
    const exercise = byName[row[0]];
    return {
      id: `${id}-e${position}`,
      dayId: id,
      exerciseId: exercise.id,
      name: exercise.name,
      weight: row[1],
      sxr: row[2],
      done: row[3],
      position,
      notes: row[4] ?? null,
      createdAt,
      updatedAt: createdAt,
    };
  });
  return {
    id,
    date,
    focus,
    notes: null,
    createdAt,
    updatedAt: createdAt,
    entries,
  };
}

export function buildSeed(today: string, now = Date.now()): Snapshot {
  const stamp = (daysAgo: number) =>
    new Date(now - (daysAgo * 86_400_000 + 3_600_000)).toISOString();

  const days: Day[] = [
    buildDay("day-today", today, "Shoulder", stamp(0), [
      ["DB Shoulder Press", 30, "3 x 8-10", true],
      ["Cross-body Cable Y-Raise", 12.5, "3 x 10-12", true],
      ["DB Side Lateral Raise", 10, "3 x 12-14", true],
      ["Diverging Seated Row", 70, "3 x 8-10", true, "Per arm"],
      ["Tricep Extension", 25, "3 x 10-12", false],
      ["Calf Raise", 35, "3 x 8-10", false],
    ]),
    buildDay("day-legs", addDays(today, -3), "Legs", stamp(3), [
      ["Barbell Deep Squat", 100, "3 x 6-8", true, "Belt on"],
      ["Leg Press", 180, "3 x 8-10", true],
      ["Hip Thrust", 120, "3 x 8-10", true],
      ["Prone Leg Curl", 45, "3 x 10-12", true],
      ["Leg Extensions", 55, "3 x 10-12", true],
      ["Calf Raise", 40, "3 x 12-14", true],
    ]),
    buildDay("day-chest", addDays(today, -6), "Chest", stamp(6), [
      ["Machine Chest Press", 70, "3 x 6-8", true],
      ["DB Incline Chest Press", 32.5, "3 x 8-10", true],
      ["Pec Fly", 50, "3 x 10-12", false],
      ["Tricep Extension", 27.5, "3 x 10-12", false],
      ["DB Curl", 14, "3 x 8-10", false],
      ["Kneeling Cable Crunch", 40, "3 x 12-14", false],
    ]),
    buildDay("day-shoulder-1", addDays(today, -10), "Shoulder", stamp(10), [
      ["DB Shoulder Press", 27.5, "3 x 8-10", true],
      ["Cross-body Cable Y-Raise", 10, "3 x 10-12", true],
      ["DB Side Lateral Raise", 9, "3 x 12-14", true],
      ["Diverging Seated Row", 65, "3 x 8-10", true],
      ["Tricep Extension", 25, "3 x 10-12", true],
      ["Calf Raise", 32.5, "3 x 8-10", true],
    ]),
    buildDay("day-back", addDays(today, -14), "Back", stamp(14), [
      ["Lat Pulldown", 60, "3 x 8-10", true],
      ["Seated Row", 55, "3 x 8-10", true],
      ["Diverging Seated Row", 60, "3 x 8-10", false],
      ["DB Curl", 12.5, "3 x 8-10", false],
      ["DB Hammer Curl", 12, "3 x 10-12", false],
      ["Hanging Raises", null, "3 x 8-10", false],
    ]),
    buildDay("day-arms", addDays(today, -18), "Arms", stamp(18), [
      ["DB Curl", 14, "3 x 8-10", true],
      ["DB Hammer Curl", 12.5, "3 x 8-10", true],
      ["Overhead Tricep Extension", 22.5, "3 x 10-12", true],
      ["Tricep Extension", 25, "3 x 10-12", true],
    ]),
    buildDay("day-abs", addDays(today, -22), "Abs", stamp(22), [
      ["Kneeling Cable Crunch", 35, "3 x 12-14", true],
      ["Hanging Raises", null, "3 x 10-12", true],
    ]),
    buildDay("day-cardio", addDays(today, -26), "Cardio", stamp(26), [
      ["Jog", null, "30min", true],
    ]),
    buildDay("day-shoulder-2", addDays(today, -40), "Shoulder", stamp(40), [
      ["DB Shoulder Press", 25, "3 x 8-10", true],
      ["Cross-body Cable Y-Raise", 7.5, "3 x 10-12", true],
      ["DB Side Lateral Raise", 8, "3 x 12-14", true],
    ]),
    buildDay("day-shoulder-3", addDays(today, -80), "Shoulder", stamp(80), [
      ["DB Shoulder Press", 22.5, "3 x 8-10", true],
      ["DB Side Lateral Raise", 7.5, "3 x 12-14", true],
    ]),
    buildDay("day-chest-old", addDays(today, -120), "Chest", stamp(120), [
      ["Machine Chest Press", 60, "3 x 8-10", true],
      ["DB Incline Chest Press", 27.5, "3 x 8-10", true],
      ["Pec Fly", 45, "3 x 10-12", true],
    ]),
  ];

  return {
    days: sortDays(days),
    exercises: [...SEED_EXERCISES].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
