export const OWNER_EMAIL = "itsamefarhath@gmail.com";

export const FOCUSES = [
  "Shoulder",
  "Chest",
  "Legs",
  "Arms",
  "Back",
  "Cardio",
  "Abs",
] as const;

export type FocusName = (typeof FOCUSES)[number];

export const COMMON_SXR = [
  "3 x 4-6",
  "3 x 6-8",
  "3 x 8-10",
  "3 x 10-12",
  "3 x 12-14",
  "4 x 10-12",
  "4 x 14-16",
  "30min",
] as const;

export type Exercise = {
  id: string;
  name: string;
  focus: string | null;
  targets: string[];
  createdAt: string;
};

export type Entry = {
  id: string;
  dayId: string;
  exerciseId: string | null;
  name: string;
  weight: number | null;
  sxr: string | null;
  done: boolean;
  position: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Day = {
  id: string;
  date: string;
  focus: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  entries: Entry[];
};

export type Snapshot = {
  days: Day[];
  exercises: Exercise[];
};

export function isOwnerEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === OWNER_EMAIL;
}

export function melbourneToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Could not resolve the Melbourne date");
  }
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, delta: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDay(iso: string, today: string): string {
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    timeZone: "UTC",
  }).format(date);
  const monthName = new Intl.DateTimeFormat("en-AU", {
    month: "short",
    timeZone: "UTC",
  }).format(date);
  const yearLabel = year === Number(today.slice(0, 4)) ? "" : ` ${year}`;
  return `${weekday} ${day} ${monthName}${yearLabel}`;
}

export function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function sortDays(days: Day[]): Day[] {
  return [...days].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort(
    (a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt),
  );
}

export function progressOf(day: Day): { done: number; total: number } {
  return {
    done: day.entries.filter((entry) => entry.done).length,
    total: day.entries.length,
  };
}

export function roundWeight(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatWeight(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "";
  return String(roundWeight(value));
}

export function parseWeightInput(
  raw: string,
): { ok: true; value: number | null } | { ok: false } {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return { ok: true, value: null };
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === ".") return { ok: false };
  const numeric = trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed;
  if (numeric === "") return { ok: false };
  const value = Number(numeric);
  if (!Number.isFinite(value)) return { ok: false };
  return { ok: true, value: roundWeight(value) };
}

export function stepWeight(value: number | null, delta: number): number | null {
  if (value == null) {
    return delta > 0 ? roundWeight(delta) : null;
  }
  const next = roundWeight(value + delta);
  if (next <= 0) return delta < 0 ? null : 0;
  return next;
}

export function displaySxr(sxr: string | null): string {
  if (!sxr) return "Sets × reps";
  return sxr.replace(/ x /g, " × ");
}

export function displayNote(notes: string | null): string | null {
  if (!notes) return null;
  const trimmed = notes.trim();
  if (!trimmed || trimmed.length > 80) return null;
  if (/[<>]|notion\.so|\\#/.test(trimmed)) return null;
  if (/^\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function isEarlierSession(day: Day, current: Day): boolean {
  if (day.id === current.id) return false;
  if (day.date < current.date) return true;
  return day.date === current.date && day.createdAt < current.createdAt;
}

function earlierEntries(days: Day[], exerciseId: string, current: Day): Entry[] {
  const found: { entry: Entry; day: Day }[] = [];
  for (const day of days) {
    if (!isEarlierSession(day, current)) continue;
    for (const entry of day.entries) {
      if (entry.exerciseId === exerciseId) found.push({ entry, day });
    }
  }
  found.sort(
    (a, b) =>
      b.day.date.localeCompare(a.day.date) ||
      b.day.createdAt.localeCompare(a.day.createdAt) ||
      b.entry.position - a.entry.position,
  );
  return found.map((item) => item.entry);
}

export function previousWeight(
  days: Day[],
  exerciseId: string,
  current: Day,
  beforePosition = Number.POSITIVE_INFINITY,
): { weight: number; date: string } | null {
  const sameDay = sortEntries(current.entries).filter(
    (entry) =>
      entry.exerciseId === exerciseId &&
      entry.weight != null &&
      entry.position < beforePosition,
  );
  const latestToday = sameDay[sameDay.length - 1];
  if (latestToday?.weight != null) {
    return { weight: latestToday.weight, date: current.date };
  }
  for (const day of sortDays(days)) {
    if (!isEarlierSession(day, current)) continue;
    const weighted = sortEntries(day.entries).filter(
      (entry) => entry.exerciseId === exerciseId && entry.weight != null,
    );
    const last = weighted[weighted.length - 1];
    if (last?.weight != null) return { weight: last.weight, date: day.date };
  }
  return null;
}

export function previousSxr(
  days: Day[],
  exerciseId: string,
  current: Day,
  beforePosition = Number.POSITIVE_INFINITY,
): string | null {
  const sameDay = sortEntries(current.entries).filter(
    (entry) =>
      entry.exerciseId === exerciseId &&
      entry.sxr &&
      entry.position < beforePosition,
  );
  if (sameDay.length > 0) return sameDay[sameDay.length - 1].sxr;
  const earlier = earlierEntries(days, exerciseId, current);
  return earlier.find((entry) => entry.sxr)?.sxr ?? null;
}

export function weightSeries(
  days: Day[],
  exerciseId: string,
): { date: string; weight: number; sxr: string | null }[] {
  const points: { date: string; weight: number; sxr: string | null; createdAt: string; position: number }[] = [];
  for (const day of days) {
    for (const entry of day.entries) {
      if (entry.exerciseId === exerciseId && entry.weight != null) {
        points.push({
          date: day.date,
          weight: entry.weight,
          sxr: entry.sxr,
          createdAt: day.createdAt,
          position: entry.position,
        });
      }
    }
  }
  points.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.position - b.position,
  );
  const byDate = new Map<string, { date: string; weight: number; sxr: string | null }>();
  for (const point of points) {
    byDate.set(point.date, {
      date: point.date,
      weight: point.weight,
      sxr: point.sxr,
    });
  }
  return [...byDate.values()];
}

export type ChartPoint = {
  x: number;
  y: number;
  date: string;
  weight: number;
};

export function chartGeometry(
  points: { date: string; weight: number }[],
  width: number,
  height: number,
): { coords: ChartPoint[]; min: number; max: number } | null {
  if (points.length === 0 || width <= 0 || height <= 0) return null;
  const pad = { l: 44, r: 16, t: 18, b: 28 };
  const min = Math.min(...points.map((point) => point.weight));
  const max = Math.max(...points.map((point) => point.weight));
  const span = max - min || 1;
  const innerW = Math.max(1, width - pad.l - pad.r);
  const innerH = Math.max(1, height - pad.t - pad.b);
  const coords = points.map((point, index) => {
    const x =
      pad.l +
      (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
    const y = pad.t + (1 - (point.weight - min) / span) * innerH;
    return { x, y, date: point.date, weight: point.weight };
  });
  return { coords, min, max };
}

export function defaultSxr(exercise: Exercise, previous: string | null): string {
  if (previous) return previous;
  if (exercise.focus === "Cardio") return "30min";
  return "3 x 8-10";
}

export function findEntry(
  days: Day[],
  entryId: string,
): { day: Day; entry: Entry } | null {
  for (const day of days) {
    const entry = day.entries.find((item) => item.id === entryId);
    if (entry) return { day, entry };
  }
  return null;
}

export function todayDay(days: Day[], today: string): Day | null {
  const matches = days.filter((day) => day.date === today);
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}
